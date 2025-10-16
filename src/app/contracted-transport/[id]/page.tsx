
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, XCircle, Clock, PlusCircle, Trash2, Loader2, UserPlus, Car, Map as MapIcon, ChevronsUpDown, X, Route, MoreHorizontal, Check, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContractedTransport, Region, Warehouse, PackagingType, SystemUser, Driver, ContractedTransportExecution, RouteStop, Vehicle, ContractedTransportExecutionStatus, ContractedTransportStatus } from '@/types';
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
} from '@/components/ui/dropdown-menu';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const newExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
});
type NewExecutionFormValues = z.infer<typeof newExecutionFormSchema>;

const editExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
});
type EditExecutionFormValues = z.infer<typeof editExecutionFormSchema>;

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

const statusDetails: Record<ContractedTransportStatus, { text: string; variant: 'success' | 'secondary' | 'destructive'; icon: React.ElementType }> = {
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

const statusColorMap: Record<string, string> = {
    'Хүлээгдэж буй': 'bg-gray-500',
    'Ачиж буй': 'bg-blue-500',
    'Буулгаж буй': 'bg-yellow-500',
    'Хүргэгдсэн': 'bg-green-500',
};


const toDateSafe = (date: any): Date => {
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date) return date;
   if (typeof date === 'object' && date !== null && !Array.isArray(date) && 'seconds' in date && 'nanoseconds' in data) {
    if (typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
      return new Timestamp(date.seconds, date.nanoseconds).toDate();
    }
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date(); 
};

function SortableExecutionCard({ execution, onEdit, onDelete }: { execution: ContractedTransportExecution, onEdit: () => void, onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: execution.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      key={execution.id} 
      className="text-xs mb-2 touch-none cursor-grab group/exec"
    >
      <CardContent className="p-2 relative">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/exec:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Устгах</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        <p className="font-semibold pr-6">Огноо: {format(execution.date, 'yyyy-MM-dd')}</p>
        <div className="text-muted-foreground">
          <p>Жолооч: {execution.driverName || 'TBA'}</p>
          <p>Машин: {execution.vehicleLicense || 'TBA'}</p>
        </div>
      </CardContent>
    </Card>
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
  
  // Dialog/Alert states
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = React.useState(false);
  const [isStopDialogOpen, setIsStopDialogOpen] = React.useState(false);
  const [executionToDelete, setExecutionToDelete] = React.useState<ContractedTransportExecution | null>(null);
  const [stopToDelete, setStopToDelete] = React.useState<RouteStop | null>(null);
  const [executionToEdit, setExecutionToEdit] = React.useState<ContractedTransportExecution | null>(null);
  const [stopToEdit, setStopToEdit] = React.useState<RouteStop | null>(null);

  const [addDriverPopoverOpen, setAddDriverPopoverOpen] = React.useState(false);
  const [addVehiclePopoverOpen, setAddVehiclePopoverOpen] = React.useState(false);
  
  const [relatedData, setRelatedData] = React.useState({
      startRegionName: '',
      endRegionName: '',
      startWarehouseName: '',
      endWarehouseName: '',
      packagingTypes: new Map<string, string>(),
      transportManagerName: '',
  });


  const executionStatuses = React.useMemo(() => {
    if (!contract) return [];
    
    const baseStatuses = ['Хүлээгдэж буй', 'Ачиж буй'];
    const inTransitStatuses = contract.routeStops.map(s => s.name);
    const endStatuses = ['Буулгаж буй', 'Хүргэгдсэн'];
    
    return [...baseStatuses, ...inTransitStatuses, ...endStatuses];

  }, [contract]);

  const newExecutionForm = useForm<NewExecutionFormValues>({
    resolver: zodResolver(newExecutionFormSchema),
    defaultValues: { date: new Date() },
  });
  
  const routeStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
    defaultValues: { name: '', description: '' }
  });
  
  const editStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
  });

  const editExecutionForm = useForm<EditExecutionFormValues>({
    resolver: zodResolver(editExecutionFormSchema),
  });

  const assignedDriverIds = React.useMemo(() => contract?.assignedDrivers.map(d => d.driverId) || [], [contract]);
  const assignedVehicleIds = React.useMemo(() => contract?.assignedVehicles.map(v => v.vehicleId) || [], [contract]);

  const fetchContractData = React.useCallback(async () => {
    if (!id) return;
    
    try {
        const contractDocRef = doc(db, 'contracted_transports', id);
        const contractDocSnap = await getDoc(contractDocRef);

        if (!contractDocSnap.exists()) {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээт тээвэр олдсонгүй.' });
          router.push('/contracted-transport');
          return;
        }
        
        const data = contractDocSnap.data();
        const fetchedContract: ContractedTransport = {
            id: contractDocSnap.id,
            ...data,
            createdAt: toDateSafe(data.createdAt),
            startDate: toDateSafe(data.startDate),
            endDate: toDateSafe(data.endDate),
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
              date: toDateSafe(doc.data().date),
              createdAt: toDateSafe(doc.data().createdAt),
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
    setIsLoading(true);
    fetchContractData();
  }, [fetchContractData]);

   React.useEffect(() => {
      newExecutionForm.reset({ date: new Date(), driverId: '', vehicleId: '' });
  }, [isExecutionDialogOpen, newExecutionForm]);

  React.useEffect(() => {
    if (stopToEdit) {
      editStopForm.reset(stopToEdit);
    }
  }, [stopToEdit, editStopForm]);

  React.useEffect(() => {
    if (executionToEdit) {
      editExecutionForm.reset({
        date: toDateSafe(executionToEdit.date),
        driverId: executionToEdit.driverId,
        vehicleId: executionToEdit.vehicleId,
      });
    }
  }, [executionToEdit, editExecutionForm]);


   const onNewExecutionSubmit = async (values: NewExecutionFormValues) => {
        if (!id || !contract) return;
        setIsSubmitting(true);
        try {
            const selectedDriver = contract.assignedDrivers.find(d => d.driverId === values.driverId);
            const selectedVehicle = contract.assignedVehicles.find(v => v.vehicleId === values.vehicleId);

            const docRef = await addDoc(collection(db, 'contracted_transport_executions'), {
                date: values.date,
                driverId: values.driverId || null,
                driverName: selectedDriver?.driverName || null,
                vehicleId: values.vehicleId || null,
                vehicleLicense: selectedVehicle?.licensePlate || null,
                contractId: id,
                status: 'Хүлээгдэж буй',
                statusHistory: [{ status: 'Хүлээгдэж буй', date: serverTimestamp() }],
                createdAt: serverTimestamp(),
            });

            const newExecution: ContractedTransportExecution = {
                id: docRef.id,
                date: values.date,
                driverId: values.driverId || undefined,
                driverName: selectedDriver?.driverName || undefined,
                vehicleId: values.vehicleId || undefined,
                vehicleLicense: selectedVehicle?.licensePlate || undefined,
                contractId: id,
                status: 'Хүлээгдэж буй',
                statusHistory: [{ status: 'Хүлээгдэж буй', date: new Date() }],
                createdAt: new Date(),
            };
            setExecutions(prev => [...prev, newExecution]);
            
            toast({ title: 'Амжилттай', description: 'Шинэ гүйцэтгэл нэмэгдлээ.' });
            setIsExecutionDialogOpen(false);
        } catch (error) {
            console.error("Error adding execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэл нэмэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteExecution = React.useCallback(async () => {
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
    }, [executionToDelete, toast]);

    const handleUpdateExecution = React.useCallback(async (values: EditExecutionFormValues) => {
        if (!executionToEdit || !contract) return;
        setIsSubmitting(true);
        try {
            const execRef = doc(db, 'contracted_transport_executions', executionToEdit.id);
            const selectedDriver = contract.assignedDrivers.find(d => d.driverId === values.driverId);
            const selectedVehicle = contract.assignedVehicles.find(v => v.vehicleId === values.vehicleId);

            const updateData = {
              date: values.date,
              driverId: values.driverId || null,
              driverName: selectedDriver?.driverName || null,
              vehicleId: values.vehicleId || null,
              vehicleLicense: selectedVehicle?.licensePlate || null,
            };

            await updateDoc(execRef, updateData);
            
            setExecutions(prev => prev.map(ex => ex.id === executionToEdit.id ? { ...ex, ...updateData, date: values.date } : ex));
            toast({ title: 'Амжилттай', description: 'Гүйцэтгэл шинэчлэгдлээ.' });
            setExecutionToEdit(null);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэл шинэчлэхэд алдаа гарлаа.' });
        } finally {
             setIsSubmitting(false);
        }
    }, [executionToEdit, contract, toast]);
    
    const handleAddDriver = async (driverId: string) => {
        if (!id || !driverId) return;
        const driverToAdd = drivers.find(d => d.id === driverId);
        if (!driverToAdd) return;
        
        const newDriverData = {
            driverId: driverToAdd.id,
            driverName: driverToAdd.display_name,
            driverPhone: driverToAdd.phone_number,
        };
        const contractRef = doc(db, 'contracted_transports', id);

        try {
            await updateDoc(contractRef, {
                assignedDrivers: arrayUnion(newDriverData)
            });
            setContract(prev => prev ? { ...prev, assignedDrivers: [...prev.assignedDrivers, newDriverData] } : null);
            toast({ title: "Амжилттай", description: "Жолооч нэмэгдлээ."});
            setAddDriverPopoverOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч нэмэхэд алдаа гарлаа.'});
        }
    };
    
    const handleRemoveDriver = async (driverToRemove: {driverId: string}) => {
        if (!id || !contract) return;
        
        const driverDataToRemove = contract.assignedDrivers.find(d => d.driverId === driverToRemove.driverId);
        if (!driverDataToRemove) return;

        const batch = writeBatch(db);
        const contractRef = doc(db, 'contracted_transports', id);
        batch.update(contractRef, { assignedDrivers: arrayRemove(driverDataToRemove) });
        
        const pendingExecs = executions.filter(e => e.status === 'Хүлээгдэж буй' && e.driverId === driverToRemove.driverId);
        pendingExecs.forEach(exec => {
            const execRef = doc(db, 'contracted_transport_executions', exec.id);
            batch.update(execRef, { driverId: null, driverName: null });
        })

        try {
            await batch.commit();

            setContract(prev => prev ? { ...prev, assignedDrivers: prev.assignedDrivers.filter(d => d.driverId !== driverToRemove.driverId) } : null);
            setExecutions(prev => prev.map(e => pendingExecs.some(pe => pe.id === e.id) ? {...e, driverId: undefined, driverName: undefined} : e));
            
            toast({ title: "Амжилттай", description: "Жолоочийг хаслаа."});
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч хасахад алдаа гарлаа.'});
        }
    }
    
    const handleAddVehicle = async (vehicleId: string) => {
        if (!id || !vehicleId) return;
        const vehicleToAdd = vehicles.find(v => v.id === vehicleId);
        if (!vehicleToAdd) return;

        const newVehicleData = {
            vehicleId: vehicleToAdd.id,
            licensePlate: vehicleToAdd.licensePlate,
            trailerLicensePlate: vehicleToAdd.trailerLicensePlate || '',
            modelName: `${vehicleToAdd.makeName} ${vehicleToAdd.modelName}`
        };
        const contractRef = doc(db, 'contracted_transports', id);
        try {
            await updateDoc(contractRef, {
                assignedVehicles: arrayUnion(newVehicleData)
            });
            setContract(prev => prev ? { ...prev, assignedVehicles: [...prev.assignedVehicles, newVehicleData] } : null);
            toast({ title: "Амжилттай", description: "Тээврийн хэрэгсэл нэмэгдлээ."});
            setAddVehiclePopoverOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл нэмэхэд алдаа гарлаа.'});
        }
    };

    const handleRemoveVehicle = async (vehicleToRemove: {vehicleId: string}) => {
        if (!id || !contract) return;
        
        const vehicleDataToRemove = contract.assignedVehicles.find(v => v.vehicleId === vehicleToRemove.vehicleId);
        if (!vehicleDataToRemove) return;

        const batch = writeBatch(db);
        const contractRef = doc(db, 'contracted_transports', id);
        batch.update(contractRef, { assignedVehicles: arrayRemove(vehicleDataToRemove) });

        const pendingExecs = executions.filter(e => e.status === 'Хүлээгдэж буй' && e.vehicleId === vehicleToRemove.vehicleId);
        pendingExecs.forEach(exec => {
            const execRef = doc(db, 'contracted_transport_executions', exec.id);
            batch.update(execRef, { vehicleId: null, vehicleLicense: null });
        })
        try {
            await batch.commit();

            setContract(prev => prev ? { ...prev, assignedVehicles: prev.assignedVehicles.filter(v => v.vehicleId !== vehicleToRemove.vehicleId) } : null);
            setExecutions(prev => prev.map(e => pendingExecs.some(pe => pe.id === e.id) ? {...e, vehicleId: undefined, vehicleLicense: undefined} : e));

            toast({ title: "Амжилттай", description: "Тээврийн хэрэгслийг хаслаа."});
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
            setContract(prev => prev ? { ...prev, routeStops: [...prev.routeStops, newStop] } : null);
            toast({ title: "Амжилттай", description: "Маршрутын зогсоол нэмэгдлээ."});
            routeStopForm.reset();
            setIsStopDialogOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleRemoveStop = async () => {
        if (!id || !contract || !stopToDelete) return;
        try {
            const stopDataToRemove = contract.routeStops.find(s => s.id === stopToDelete.id);
            if (!stopDataToRemove) return;
            const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                 routeStops: arrayRemove(stopDataToRemove)
            });
            setContract(prev => prev ? { ...prev, routeStops: prev.routeStops.filter(s => s.id !== stopToDelete.id) } : null);
            toast({ title: "Амжилттай", description: "Зогсоол хасагдлаа."});
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол хасахад алдаа гарлаа.'});
        } finally {
            setStopToDelete(null);
        }
    }

    const handleUpdateStop = async (values: RouteStopFormValues) => {
        if (!id || !contract || !stopToEdit) return;
        setIsSubmitting(true);
        try {
            const updatedStops = contract.routeStops.map(stop => stop.id === stopToEdit.id ? { ...stop, ...values } : stop);
             const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                 routeStops: updatedStops
            });
            setContract(prev => prev ? { ...prev, routeStops: updatedStops } : null);
            toast({ title: "Амжилттай", description: "Зогсоол шинэчлэгдлээ."});
        } catch(error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол шинэчлэхэд алдаа гарлаа.'});
        } finally {
            setStopToEdit(null);
            setIsSubmitting(false);
        }
    }
    
    const handleExecutionStatusChange = React.useCallback(async (executionId: string, newStatus: string) => {
        const execution = executions.find(ex => ex.id === executionId);
        if (!execution) return;

        setIsSubmitting(true);
        try {
            const execRef = doc(db, 'contracted_transport_executions', execution.id);
            
            const updatedStatusHistory = [
                ...execution.statusHistory,
                 { status: newStatus as ContractedTransportExecutionStatus, date: serverTimestamp() }
            ];
    
            await updateDoc(execRef, {
                status: newStatus,
                statusHistory: updatedStatusHistory,
            });
            
            setExecutions(prev => prev.map(ex => ex.id === execution.id ? {
                ...ex,
                status: newStatus as ContractedTransportExecutionStatus,
                statusHistory: [...ex.statusHistory, { status: newStatus as ContractedTransportExecutionStatus, date: new Date() }]
            } : ex));

            toast({ title: 'Амжилттай', description: `Гүйцэтгэл '${newStatus}' төлөвт шилжлээ.` });
    
        } catch (error) {
            console.error("Error updating execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэлийн явц шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    }, [executions, toast]);
    
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const overContainerId = over.data.current?.sortable?.containerId;
            const activeExecution = executions.find(ex => ex.id === active.id);
            
            if (overContainerId && activeExecution && activeExecution.status !== overContainerId) {
                await handleExecutionStatusChange(active.id as string, overContainerId);
            }
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
             <Button asChild size="sm">
                <Link href={`/contracted-transport/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Засварлах
                </Link>
            </Button>
        </div>
      </div>
      
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Гэрээний дэлгэрэнгүй</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                            <DetailItem icon={User} label="Харилцагч" value={contract.customerName} />
                            <DetailItem icon={User} label="Тээврийн менежер" value={relatedData.transportManagerName} />
                            <DetailItem icon={Calendar} label="Гэрээний хугацаа" value={`${format(contract.startDate, 'yyyy-MM-dd')} - ${format(contract.endDate, 'yyyy-MM-dd')}`} />
                            <DetailItem icon={Calendar} label="Давтамж" value={contract.frequency === 'Custom' ? `${frequencyTranslations[contract.frequency]} (${contract.customFrequencyDetails})` : frequencyTranslations[contract.frequency]} />
                             <DetailItem icon={Info} label="Статус" value={<Badge variant={statusInfo.variant} className="py-1 px-3"><statusInfo.icon className="mr-1.5 h-3 w-3" />{statusInfo.text}</Badge>} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Маршрут ба Ачаа</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                            <DetailItem icon={MapPin} label="Ачих цэг" value={`${relatedData.startRegionName}, ${relatedData.startWarehouseName}`} />
                            <DetailItem icon={MapPin} label="Буулгах цэг" value={`${relatedData.endRegionName}, ${relatedData.endWarehouseName}`} />
                            <DetailItem icon={MapIcon} label="Нийт зам" value={`${contract.route.totalDistance} км`} />
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
            </div>
            <div className="md:col-span-1">
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
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveDriver(driver)} disabled={isSubmitting}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))) : (<p className="text-sm text-muted-foreground text-center py-1">Жолооч оноогоогүй.</p>)}
                            </div>
                        </div>
                        <Separator/>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-sm">Оноосон тээврийн хэрэгсэл</h3>
                                <Popover open={addVehiclePopoverOpen} onOpenChange={setAddVehiclePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <PlusCircle className="mr-2 h-4 w-4"/> Т/Х нэмэх
                                        </Button>
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
                            </div>
                             <div className="space-y-2">
                                {contract.assignedVehicles.length > 0 ? ( contract.assignedVehicles.map(vehicle => (
                                    <div key={vehicle.vehicleId} className="flex justify-between items-center text-sm p-1.5 rounded-md hover:bg-muted">
                                        <div>
                                            <p className="font-medium font-mono">{vehicle.licensePlate}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{vehicle.modelName} {vehicle.trailerLicensePlate && `/ ${vehicle.trailerLicensePlate}`}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveVehicle(vehicle)} disabled={isSubmitting}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))) : (<p className="text-sm text-muted-foreground text-center py-1">Т/Х оноогоогүй.</p>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
            
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Тээвэрлэлтийн Явц ба Зогсоолууд</CardTitle>
                            <CardDescription>Гүйцэтгэлийн явцыг чирж зөөх үйлдлээр удирдах хэсэг.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsStopDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Зогсоол нэмэх
                            </Button>
                            <Button onClick={() => setIsExecutionDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Гүйцэтгэл нэмэх
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto pb-4">
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${executionStatuses.length}, minmax(200px, 1fr))`}}>
                            {executionStatuses.map(status => {
                                const stop = contract.routeStops.find(s => s.name === status);
                                const itemsForStatus = executions.filter(ex => ex.status === status);
                                return (
                                    <SortableContext key={status} id={status} items={itemsForStatus.map(i => i.id)}>
                                        <div className="p-2 rounded-lg bg-muted/50 min-h-40">
                                            <div className="font-semibold text-center text-sm p-2 rounded-md relative group/stop-header">
                                                <h3 className={`${statusColorMap[status] || 'bg-purple-500'} text-white p-2 rounded-md`}>
                                                    {status}
                                                </h3>
                                                {stop && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/stop-header:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4 text-white" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => setStopToEdit(stop)}><Edit className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setStopToDelete(stop)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Устгах</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>

                                            {stop && (
                                                <div className="text-xs text-center text-muted-foreground mt-1 px-1 flex items-start gap-1.5">
                                                   <Info className="h-3 w-3 mt-0.5 shrink-0"/> <span>{stop.description}</span>
                                                </div>
                                            )}
                                            <div className="space-y-1 min-h-20 mt-2">
                                                {itemsForStatus.map(ex => (
                                                    <SortableExecutionCard 
                                                        key={ex.id} 
                                                        execution={ex}
                                                        onEdit={() => setExecutionToEdit(ex)}
                                                        onDelete={() => setExecutionToDelete(ex)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </SortableContext>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DndContext>


        {/* Add New Execution Dialog */}
        <Dialog open={isExecutionDialogOpen} onOpenChange={setIsExecutionDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Шинэ гүйцэтгэл нэмэх</DialogTitle>
                </DialogHeader>
                <Form {...newExecutionForm}>
                    <form onSubmit={newExecutionForm.handleSubmit(onNewExecutionSubmit)} className="space-y-4 py-4" id="new-execution-form">
                         <FormField control={newExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                         <FormField control={newExecutionForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Оноосон жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                         <FormField control={newExecutionForm.control} name="vehicleId" render={({ field }) => ( <FormItem><FormLabel>Оноосон тээврийн хэрэгсэл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Т/Х сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedVehicles.map(v => <SelectItem key={v.vehicleId} value={v.vehicleId}>{v.licensePlate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
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
        
        {/* Delete Execution Alert */}
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

        {/* Edit Execution Dialog */}
        {executionToEdit && (
            <Dialog open={!!executionToEdit} onOpenChange={() => setExecutionToEdit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Гүйцэтгэл засах</DialogTitle>
                    </DialogHeader>
                    <Form {...editExecutionForm}>
                        <form onSubmit={editExecutionForm.handleSubmit(handleUpdateExecution)} className="space-y-4 py-4" id="edit-execution-form">
                            <FormField control={editExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                            <FormField control={editExecutionForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Оноосон жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <FormField control={editExecutionForm.control} name="vehicleId" render={({ field }) => ( <FormItem><FormLabel>Оноосон тээврийн хэрэгсэл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Т/Х сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedVehicles.map(v => <SelectItem key={v.vehicleId} value={v.vehicleId}>{v.licensePlate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </form>
                    </Form>
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                        <Button type="submit" form="edit-execution-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Хадгалах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        
        {/* Add New Stop Dialog */}
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
        
        {/* Edit Stop Dialog */}
        {stopToEdit && (
            <Dialog open={!!stopToEdit} onOpenChange={() => setStopToEdit(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Зогсоол засах</DialogTitle></DialogHeader>
                    <Form {...editStopForm}>
                        <form onSubmit={editStopForm.handleSubmit(handleUpdateStop)} id="edit-stop-form" className="space-y-4 py-4">
                             <FormField control={editStopForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Зогсоолын нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <FormField control={editStopForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </form>
                    </Form>
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                        <Button type="submit" form="edit-stop-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Хадгалах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {/* Delete Stop Alert */}
         <AlertDialog open={!!stopToDelete} onOpenChange={() => setStopToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        "{stopToDelete?.name}" зогсоолыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemoveStop} className="bg-destructive hover:bg-destructive/90">Устгах</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
