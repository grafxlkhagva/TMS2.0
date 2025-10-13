
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, CheckCircle, XCircle, Clock, PlusCircle, Trash2, Loader2, UserPlus, Car, Map as MapIcon, MoveRight, ChevronsUpDown, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContractedTransport, Region, Warehouse, PackagingType, SystemUser, Driver, ContractedTransportExecution, RouteStop, Vehicle, ContractedTransportCargoItem, ContractedTransportExecutionStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';


const newExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
});
type NewExecutionFormValues = z.infer<typeof newExecutionFormSchema>;

const routeStopFormSchema = z.object({
  name: z.string().min(2, "Зогсоолын нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
  description: z.string().min(5, "Тайлбар дор хаяж 5 тэмдэгттэй байх ёстой."),
});
type RouteStopFormValues = z.infer<typeof routeStopFormSchema>;

const frequencyTranslations: Record<ContractedTransport['frequency'], string> = {
    Daily: 'Өдөр бүр',
    Weekly: '7 хоног тутам',
    Monthly: 'Сар тутам',
    Custom: 'Бусад'
};

const statusDetails = {
    Active: { text: 'Идэвхтэй', variant: 'success' as const, icon: CheckCircle },
    Expired: { text: 'Хугацаа дууссан', variant: 'secondary' as const, icon: Clock },
    Cancelled: { text: 'Цуцлагдсан', variant: 'destructive' as const, icon: XCircle }
};


function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="font-medium">{value}</div>
        </div>
    </div>
  );
}

export default function ContractedTransportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = React.useState<ContractedTransport | null>(null);
  const [executions, setExecutions] = React.useState<ContractedTransportExecution[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = React.useState(false);
  const [executionToDelete, setExecutionToDelete] = React.useState<ContractedTransportExecution | null>(null);

  const [addDriverPopoverOpen, setAddDriverPopoverOpen] = React.useState(false);
  const [addVehiclePopoverOpen, setAddVehiclePopoverOpen] = React.useState(false);
  const [isStopDialogOpen, setIsStopDialogOpen] = React.useState(false);
  
  const [relatedData, setRelatedData] = React.useState({
      startRegionName: '',
      endRegionName: '',
      startWarehouseName: '',
      endWarehouseName: '',
      packagingTypes: new Map<string, string>(),
      transportManagerName: '',
  });

  const executionStatuses = React.useMemo(() => {
    if (!contract) return ['Pending', 'Loading', 'Unloading', 'Delivered'];
    return [
        'Pending', 
        'Loading', 
        ...contract.routeStops.map(s => s.name),
        'Unloading', 
        'Delivered'
    ];
  }, [contract]);

  const statusTranslation = React.useMemo(() => {
    const baseTranslations: Record<string, string> = {
        Pending: 'Хүлээгдэж буй',
        Loading: 'Ачиж буй',
        Unloading: 'Буулгаж буй',
        Delivered: 'Хүргэгдсэн',
    };
    if (contract) {
        contract.routeStops.forEach(stop => {
            baseTranslations[stop.name] = stop.name;
        });
    }
    return baseTranslations;
  }, [contract]);


  const newExecutionForm = useForm<NewExecutionFormValues>({
    resolver: zodResolver(newExecutionFormSchema),
    defaultValues: { date: new Date() },
  });
  
  const routeStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
    defaultValues: { name: '', description: '' }
  });

  const assignedDriverIds = React.useMemo(() => contract?.assignedDrivers.map(d => d.driverId) || [], [contract]);
  const assignedVehicleIds = React.useMemo(() => contract?.assignedVehicles.map(v => v.vehicleId) || [], [contract]);

  const fetchContractData = React.useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);

    try {
        const contractDocRef = doc(db, 'contracted_transports', id);
        const contractDocSnap = await getDoc(contractDocRef);

        if (!contractDocSnap.exists()) {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээт тээвэр олдсонгүй.' });
          router.push('/contracted-transport');
          return;
        }
        
        const data = contractDocSnap.data();
        const fetchedContract = {
            id: contractDocSnap.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            assignedDrivers: data.assignedDrivers || [],
            assignedVehicles: data.assignedVehicles || [],
            routeStops: data.routeStops || [],
            cargoItems: data.cargoItems || [],
        } as ContractedTransport;
        setContract(fetchedContract);
        
        const [
            startRegionSnap, endRegionSnap, startWarehouseSnap, endWarehouseSnap, packagingTypeSnap,
            managerSnap, driversSnap, vehiclesSnap, executionsSnap
        ] = await Promise.all([
            getDoc(doc(db, 'regions', fetchedContract.route.startRegionId)),
            getDoc(doc(db, 'regions', fetchedContract.route.endRegionId)),
            getDoc(doc(db, 'warehouses', fetchedContract.route.startWarehouseId)),
            getDoc(doc(db, 'warehouses', fetchedContract.route.endWarehouseId)),
            getDocs(query(collection(db, 'packaging_types'))),
            getDoc(doc(db, 'users', fetchedContract.transportManagerId)),
            getDocs(query(collection(db, "Drivers"), where('status', '==', 'Active'))),
            getDocs(query(collection(db, 'vehicles'))),
            getDocs(query(collection(db, 'contracted_transport_executions'), where('contractId', '==', id))),
        ]);
        
        setDrivers(driversSnap.docs.map(d => ({id: d.id, ...d.data()} as Driver)));
        setVehicles(vehiclesSnap.docs.map(v => ({id: v.id, ...v.data()} as Vehicle)));

        setRelatedData({
            startRegionName: startRegionSnap.data()?.name || '',
            endRegionName: endRegionSnap.data()?.name || '',
            startWarehouseName: startWarehouseSnap.data()?.name || '',
            endWarehouseName: endWarehouseSnap.data()?.name || '',
            packagingTypes: new Map(packagingTypeSnap.docs.map(doc => [doc.id, doc.data().name])),
            transportManagerName: `${managerSnap.data()?.lastName || ''} ${managerSnap.data()?.firstName || ''}`,
        })
      
        const executionsData = executionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              date: doc.data().date.toDate(),
              createdAt: doc.data().createdAt.toDate(),
          } as ContractedTransportExecution));

        setExecutions(executionsData);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  React.useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

   React.useEffect(() => {
      newExecutionForm.reset({ date: new Date() });
  }, [isExecutionDialogOpen, newExecutionForm]);


   const onNewExecutionSubmit = async (values: NewExecutionFormValues) => {
        if (!id || !contract) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'contracted_transport_executions'), {
                ...values,
                contractId: id,
                status: 'Pending',
                statusHistory: [{ status: 'Pending', date: new Date() }],
                createdAt: serverTimestamp(),
            });
            
            toast({ title: 'Амжилттай', description: 'Шинэ гүйцэтгэл нэмэгдлээ.' });
            setIsExecutionDialogOpen(false);
            fetchContractData();
        } catch (error) {
            console.error("Error adding execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэл нэмэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteExecution = async () => {
        if (!executionToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, 'contracted_transport_executions', executionToDelete.id));
            setExecutions(prev => prev.filter(ex => ex.id !== executionToDelete.id));
            toast({ title: 'Амжилттай', description: 'Гүйцэтгэл устгагдлаа.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэл устгахад алдаа гарлаа.' });
        } finally {
            setExecutionToDelete(null);
            setIsSubmitting(false);
        }
    };
    
    const handleAddDriver = async (driverId: string) => {
        if (!id || !driverId) return;
        const driverToAdd = drivers.find(d => d.id === driverId);
        if (!driverToAdd) return;
        setIsSubmitting(true);
        try {
            const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                assignedDrivers: arrayUnion({
                    driverId: driverToAdd.id,
                    driverName: driverToAdd.display_name,
                    driverPhone: driverToAdd.phone_number,
                })
            });
            toast({ title: "Амжилттай", description: "Жолооч нэмэгдлээ."});
            setAddDriverPopoverOpen(false);
            fetchContractData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRemoveDriver = async (driverToRemove: {driverId: string}) => {
        if (!id || !contract) return;
        try {
            const batch = writeBatch(db);
            const contractRef = doc(db, 'contracted_transports', id);
            const driverDataToRemove = contract.assignedDrivers.find(d => d.driverId === driverToRemove.driverId);
            if (driverDataToRemove) {
                 batch.update(contractRef, { assignedDrivers: arrayRemove(driverDataToRemove) });
            }
            
            const pendingExecs = executions.filter(e => e.status === 'Pending' && e.driverId === driverToRemove.driverId);
            pendingExecs.forEach(exec => {
                const execRef = doc(db, 'contracted_transport_executions', exec.id);
                batch.update(execRef, { driverId: null, driverName: null });
            })

            await batch.commit();
            
            toast({ title: "Амжилттай", description: "Жолоочийг хаслаа."});
             fetchContractData();
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч хасахад алдаа гарлаа.'});
        }
    }
    
    const handleAddVehicle = async (vehicleId: string) => {
        if (!id || !vehicleId) return;
        const vehicleToAdd = vehicles.find(v => v.id === vehicleId);
        if (!vehicleToAdd) return;
        setIsSubmitting(true);
        try {
            const contractRef = doc(db, 'contracted_transports', id);
            const newVehicleData = {
                vehicleId: vehicleToAdd.id,
                licensePlate: vehicleToAdd.licensePlate,
                modelName: `${vehicleToAdd.makeName} ${vehicleToAdd.modelName}`
            };
            await updateDoc(contractRef, {
                assignedVehicles: arrayUnion(newVehicleData)
            });
            toast({ title: "Амжилттай", description: "Тээврийн хэрэгсэл нэмэгдлээ."});
            setAddVehiclePopoverOpen(false);
            fetchContractData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveVehicle = async (vehicleToRemove: {vehicleId: string}) => {
        if (!id || !contract) return;
        try {
             const batch = writeBatch(db);
            const contractRef = doc(db, 'contracted_transports', id);
            const vehicleDataToRemove = contract.assignedVehicles.find(v => v.vehicleId === vehicleToRemove.vehicleId);

            if (vehicleDataToRemove) {
                 batch.update(contractRef, { assignedVehicles: arrayRemove(vehicleDataToRemove) });
            }

            const pendingExecs = executions.filter(e => e.status === 'Pending' && e.vehicleId === vehicleToRemove.vehicleId);
            pendingExecs.forEach(exec => {
                const execRef = doc(db, 'contracted_transport_executions', exec.id);
                batch.update(execRef, { vehicleId: null, vehicleLicense: null });
            })
            await batch.commit();

            toast({ title: "Амжилттай", description: "Тээврийн хэрэгслийг хаслаа."});
            fetchContractData();
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл хасахад алдаа гарлаа.'});
        }
    }

    const onRouteStopSubmit = async (values: RouteStopFormValues) => {
        if (!id || !contract) return;
        setIsSubmitting(true);
        try {
            const newStop: RouteStop = {
                id: uuidv4(),
                ...values
            };
            const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                routeStops: arrayUnion(newStop),
            });
            toast({ title: "Амжилттай", description: "Маршрутын зогсоол нэмэгдлээ."});
            routeStopForm.reset();
            setIsStopDialogOpen(false);
            fetchContractData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleRemoveStop = async (stopToRemove: RouteStop) => {
        if (!id || !contract) return;
        try {
            const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                 routeStops: arrayRemove(stopToRemove)
            });
            toast({ title: "Амжилттай", description: "Зогсоол хасагдлаа."});
            fetchContractData();
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол хасахад алдаа гарлаа.'});
        }
    }
    
    const handleUpdateExecution = async (execution: ContractedTransportExecution, newStatus: ContractedTransportExecutionStatus) => {
        if (!execution) return;
    
        setIsSubmitting(true);
        try {
            const execRef = doc(db, 'contracted_transport_executions', execution.id);
            
            const updatedExecutionData = {
                ...execution,
                status: newStatus,
                statusHistory: arrayUnion({ status: newStatus, date: Timestamp.now() }),
            };
    
            await updateDoc(execRef, {
                status: newStatus,
                statusHistory: arrayUnion({ status: newStatus, date: Timestamp.now() }),
            });
            
            setExecutions(prev => prev.map(ex => ex.id === execution.id ? updatedExecutionData : ex));

            toast({ title: 'Амжилттай', description: `Гүйцэтгэл '${statusTranslation[newStatus] || newStatus}' төлөвт шилжлээ.` });
    
        } catch (error) {
            console.error("Error updating execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэлийн явц шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    }

  if (isLoading) {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6"><Skeleton className="h-8 w-24 mb-4" /><Skeleton className="h-8 w-1/3" /></div>
            <div className="space-y-6">
                <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-40 w-full"/></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-40 w-full"/></CardContent></Card>
            </div>
        </div>
    )
  }

  if (!contract) return null;
  
  const statusInfo = statusDetails[contract.status] || { text: contract.status, variant: 'secondary' as const, icon: Clock };


  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/contracted-transport">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-headline font-bold">{contract.title}</h1>
                <p className="text-muted-foreground font-mono">
                Гэрээний дугаар: {contract.contractNumber}
                </p>
            </div>
        </div>
      </div>
      
        <div className="space-y-6">
           <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>Гэрээний дэлгэрэнгүй</CardTitle>
                         <div className="flex items-center gap-2">
                            <Badge variant={statusInfo.variant} className="py-1 px-3">
                                <statusInfo.icon className="mr-1.5 h-3 w-3" />
                                {statusInfo.text}
                            </Badge>
                            <Button asChild size="sm">
                                <Link href={`/contracted-transport/${id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" /> Засварлах
                                </Link>
                            </Button>
                         </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator/>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                        <DetailItem icon={User} label="Харилцагч" value={contract.customerName} />
                        <DetailItem icon={User} label="Тээврийн менежер" value={relatedData.transportManagerName} />
                        <DetailItem icon={Calendar} label="Гэрээний хугацаа" value={`${format(contract.startDate, 'yyyy-MM-dd')} - ${format(contract.endDate, 'yyyy-MM-dd')}`} />
                        <DetailItem icon={Calendar} label="Давтамж" value={contract.frequency === 'Custom' ? `${frequencyTranslations[contract.frequency]} (${contract.customFrequencyDetails})` : frequencyTranslations[contract.frequency]} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                         <div className="flex justify-between items-center">
                            <CardTitle>Маршрут ба Ачаа</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setIsStopDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Зогсоол нэмэх
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                            <DetailItem icon={MapPin} label="Ачих цэг" value={`${relatedData.startRegionName}, ${relatedData.startWarehouseName}`} />
                            <DetailItem icon={MapPin} label="Буулгах цэг" value={`${relatedData.endRegionName}, ${relatedData.endWarehouseName}`} />
                            <DetailItem icon={MapIcon} label="Нийт зам" value={`${contract.route.totalDistance} км`} />
                        </div>
                        <Separator />
                         <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-sm">Маршрутын зогсоол</h3>
                        </div>
                        <div className="space-y-1">
                            {contract.routeStops.length > 0 ? (
                                contract.routeStops.map(stop => (
                                    <div key={stop.id} className="flex justify-between items-center text-sm p-1 rounded-md hover:bg-muted">
                                        <div><p className="font-medium">{stop.name}</p><p className="text-xs text-muted-foreground">{stop.description}</p></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveStop(stop)}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-1">Зогсоол бүртгэгдээгүй.</p>
                            )}
                        </div>
                        <Separator />
                        <Table>
                            <TableHeader><TableRow><TableHead>Ачаа</TableHead><TableHead>Баглаа</TableHead><TableHead className="text-right">Үнэ (₮)</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {contract.cargoItems.map((item, index) => (
                                <TableRow key={item.id || index}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{relatedData.packagingTypes.get(item.packagingTypeId) || item.packagingTypeId}</TableCell>
                                    <TableCell className="text-right font-mono">{item.price.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Оноосон Жолооч ба Т/Х</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-sm">Оноосон жолооч нар</h3>
                                <Popover open={addDriverPopoverOpen} onOpenChange={setAddDriverPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <PlusCircle className="mr-2 h-4 w-4"/> Жолооч нэмэх
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0">
                                        <Command><CommandInput placeholder="Жолооч хайх..."/><CommandList><CommandEmpty>Олдсонгүй.</CommandEmpty><CommandGroup>
                                            {drivers.filter(d => !assignedDriverIds.includes(d.id)).map(d => (
                                                <CommandItem key={d.id} value={`${d.display_name} ${d.phone_number}`} onSelect={() => handleAddDriver(d.id)} disabled={isSubmitting}>
                                                    <Check className={cn("mr-2 h-4 w-4", assignedDriverIds.includes(d.id) ? "opacity-100" : "opacity-0")}/>
                                                    <span>{d.display_name} ({d.phone_number})</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup></CommandList></Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                {contract.assignedDrivers.length > 0 ? ( contract.assignedDrivers.map(driver => (
                                    <div key={driver.driverId} className="flex justify-between items-center text-sm p-1.5 rounded-md hover:bg-muted">
                                        <div><p className="font-medium">{driver.driverName}</p><p className="text-xs text-muted-foreground">{driver.driverPhone}</p></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveDriver(driver)}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))) : (<p className="text-sm text-muted-foreground text-center py-1">Жолооч оноогоогүй.</p>)}
                            </div>
                        </div>
                        <Separator/>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-sm">Оноосон тээврийн хэрэгсэл</h3>
                                <Button variant="outline" size="sm" onClick={() => setAddVehiclePopoverOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Т/Х нэмэх
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {contract.assignedVehicles.length > 0 ? ( contract.assignedVehicles.map(vehicle => (
                                    <div key={vehicle.vehicleId} className="flex justify-between items-center text-sm p-1.5 rounded-md hover:bg-muted">
                                        <div><p className="font-medium">{vehicle.modelName}</p><p className="text-xs text-muted-foreground font-mono">{vehicle.licensePlate}</p></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveVehicle(vehicle)}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))) : (<p className="text-sm text-muted-foreground text-center py-1">Т/Х оноогоогүй.</p>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Тээвэрлэлтийн гүйцэтгэл</CardTitle>
                            <CardDescription>Гэрээний дагуу хийгдэх тээвэрлэлтийн явцыг хянах хэсэг.</CardDescription>
                        </div>
                        <Button onClick={() => setIsExecutionDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Гүйцэтгэл нэмэх
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                   <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${executionStatuses.length}, minmax(180px, 1fr))`}}>
                         {executionStatuses.map(status => (
                            <div key={status} className="p-2 rounded-lg bg-muted/50">
                                <h3 className="font-semibold text-center text-sm p-2">{statusTranslation[status] || status}</h3>
                                <div className="space-y-2 min-h-24">
                                    {executions.filter(ex => ex.status === status).map(ex => (
                                        <Card className="text-xs mb-2 touch-none" key={ex.id}>
                                            <CardContent className="p-2 relative">
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6">
                                                      <XCircle className="h-4 w-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                     <DropdownMenuItem 
                                                        onSelect={() => handleUpdateExecution(ex, executionStatuses[executionStatuses.indexOf(ex.status) + 1] as ContractedTransportExecutionStatus)}
                                                        disabled={executionStatuses.indexOf(ex.status) === executionStatuses.length - 1}
                                                     >
                                                      <MoveRight className="mr-2 h-4 w-4" />
                                                      <span>Урагшлуулах</span>
                                                    </DropdownMenuItem>
                                                     <DropdownMenuItem 
                                                        onSelect={() => handleUpdateExecution(ex, executionStatuses[executionStatuses.indexOf(ex.status) - 1] as ContractedTransportExecutionStatus)}
                                                        disabled={executionStatuses.indexOf(ex.status) === 0}
                                                     >
                                                      <ArrowLeft className="mr-2 h-4 w-4" />
                                                      <span>Ухраах</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => setExecutionToDelete(ex)} className="text-destructive focus:text-destructive">
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      <span>Устгах</span>
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                                <p className="font-semibold pr-6">Огноо: {format(ex.date, 'yyyy-MM-dd')}</p>
                                                <p>Жолооч: {ex.driverName || 'TBA'}</p>
                                                <p>Машин: {ex.vehicleLicense || 'TBA'}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>


        <Dialog open={isExecutionDialogOpen} onOpenChange={setIsExecutionDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Шинэ гүйцэтгэл нэмэх</DialogTitle>
                </DialogHeader>
                <Form {...newExecutionForm}>
                    <form onSubmit={newExecutionForm.handleSubmit(onNewExecutionSubmit)} className="space-y-4 py-4" id="new-execution-form">
                         <FormField control={newExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="new-execution-form" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Хадгалах
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!executionToDelete} onOpenChange={() => setExecutionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>Энэ гүйцэтгэлийн мэдээллийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteExecution} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                        {isSubmitting ? 'Устгаж байна...' : 'Устгах'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Popover open={addVehiclePopoverOpen} onOpenChange={setAddVehiclePopoverOpen}>
             <PopoverTrigger asChild>
                <span/>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <Command><CommandInput placeholder="Машин хайх..."/><CommandList><CommandEmpty>Олдсонгүй.</CommandEmpty><CommandGroup>
                    {vehicles.filter(v => v.status === 'Available' && !assignedVehicleIds.includes(v.id)).map(v => (
                        <CommandItem key={v.id} value={`${v.makeName} ${v.modelName} ${v.licensePlate}`} onSelect={() => handleAddVehicle(v.id)} disabled={isSubmitting}>
                             <Check className={cn("mr-2 h-4 w-4", assignedVehicleIds.includes(v.id) ? "opacity-100" : "opacity-0")}/>
                            <span>{v.makeName} {v.modelName} ({v.licensePlate})</span>
                        </CommandItem>
                    ))}
                </CommandGroup></CommandList></Command>
            </PopoverContent>
        </Popover>
        
        <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Маршрутын зогсоол нэмэх</DialogTitle>
                </DialogHeader>
                <Form {...routeStopForm}>
                     <form onSubmit={routeStopForm.handleSubmit(onRouteStopSubmit)} className="space-y-4 py-4" id="route-stop-form">
                        <FormField control={routeStopForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Зогсоолын нэр</FormLabel><FormControl><Input placeholder="Даваа-1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={routeStopForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Input placeholder="Амрах, хооллох" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </form>
                </Form>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="route-stop-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Нэмэх</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

