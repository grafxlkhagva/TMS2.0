
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, CheckCircle, XCircle, Clock, PlusCircle, Trash2, Loader2, UserPlus, Car, Map as MapIcon, MoveRight } from 'lucide-react';
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
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const newExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
});
type NewExecutionFormValues = z.infer<typeof newExecutionFormSchema>;

const loadingFormSchema = z.object({
  driverId: z.string().min(1, "Жолооч сонгоно уу."),
  vehicleId: z.string().min(1, "Машин сонгоно уу."),
  loadingWeight: z.coerce.number().min(0.1, "Ачсан жинг оруулна уу."),
});
type LoadingFormValues = z.infer<typeof loadingFormSchema>;

const unloadingFormSchema = z.object({
  unloadingWeight: z.coerce.number().min(0.1, "Буулгасан жинг оруулна уу."),
});
type UnloadingFormValues = z.infer<typeof unloadingFormSchema>;

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

const executionStatuses: ContractedTransportExecutionStatus[] = ['Pending', 'Loading', 'In-Transit', 'Unloading', 'Delivered'];

const statusTranslation: Record<ContractedTransportExecutionStatus, string> = {
    Pending: 'Хүлээгдэж буй',
    Loading: 'Ачиж буй',
    'In-Transit': 'Замд яваа',
    Unloading: 'Буулгаж буй',
    Delivered: 'Хүргэгдсэн',
}

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

function ExecutionCard({ execution, onUpdate, onDelete }: { execution: ContractedTransportExecution, onUpdate: () => void, onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: execution.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 10 : 'auto',
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '',
        transformOrigin: '50% 50%',
        scale: isDragging ? '1.05' : '1',
        rotate: isDragging ? '2deg' : '0deg',
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
              "text-xs mb-2 touch-none",
            )}
        >
            <CardContent className="p-2">
                <p className="font-semibold">Огноо: {format(execution.date, 'yyyy-MM-dd')}</p>
                <p>Жолооч: {execution.driverName || 'TBA'}</p>
                <p>Машин: {execution.vehicleLicense || 'TBA'}</p>
                <div className="mt-2 flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive"/></Button>
                    {execution.status !== 'Delivered' && (
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={onUpdate}>
                            <MoveRight className="h-3 w-3"/>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function KanbanColumn({ status, children }: { status: string, children: React.ReactNode }) {
    const { setNodeRef } = useSortable({ id: status });
    return (
        <div ref={setNodeRef} className="p-2 rounded-lg bg-muted/50">
            <h3 className="font-semibold text-center text-sm p-2">{statusTranslation[status as ContractedTransportExecutionStatus]}</h3>
            <div className="space-y-2 min-h-24">
                {children}
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
  const [executionToUpdate, setExecutionToUpdate] = React.useState<ContractedTransportExecution | null>(null);
  const [updateAction, setUpdateAction] = React.useState<'load' | 'unload' | null>(null);
  const [executionToDelete, setExecutionToDelete] = React.useState<ContractedTransportExecution | null>(null);

  const [isAddingDriver, setIsAddingDriver] = React.useState(false);
  const [addDriverPopoverOpen, setAddDriverPopoverOpen] = React.useState(false);
  
  const [isAddingVehicle, setIsAddingVehicle] = React.useState(false);
  const [addVehiclePopoverOpen, setAddVehiclePopoverOpen] = React.useState(false);

  const [isSubmittingStop, setIsSubmittingStop] = React.useState(false);
  
  const [relatedData, setRelatedData] = React.useState({
      startRegionName: '',
      endRegionName: '',
      startWarehouseName: '',
      endWarehouseName: '',
      packagingTypes: new Map<string, string>(),
      transportManagerName: '',
  });

  const newExecutionForm = useForm<NewExecutionFormValues>({
    resolver: zodResolver(newExecutionFormSchema),
    defaultValues: { date: new Date() },
  });
  
  const loadingForm = useForm<LoadingFormValues>({
    resolver: zodResolver(loadingFormSchema),
    defaultValues: { driverId: '', vehicleId: '', loadingWeight: 0 },
  });
  
  const unloadingForm = useForm<UnloadingFormValues>({
    resolver: zodResolver(unloadingFormSchema),
    defaultValues: { unloadingWeight: 0 },
  });

  const routeStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
    defaultValues: { name: '', description: '' }
  });

  const assignedDriverIds = React.useMemo(() => contract?.assignedDrivers.map(d => d.driverId) || [], [contract]);
  const assignedVehicleIds = React.useMemo(() => contract?.assignedVehicles.map(v => v.vehicleId) || [], [contract]);

  const fetchContractData = React.useCallback(async (refetchExecutions = true) => {
    if (!id) return;
    
    if (refetchExecutions) setIsLoading(true);

    try {
      if (!contract) {
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
            managerSnap, driversSnap, vehiclesSnap
        ] = await Promise.all([
            getDoc(doc(db, 'regions', fetchedContract.route.startRegionId)),
            getDoc(doc(db, 'regions', fetchedContract.route.endRegionId)),
            getDoc(doc(db, 'warehouses', fetchedContract.route.startWarehouseId)),
            getDoc(doc(db, 'warehouses', fetchedContract.route.endWarehouseId)),
            getDocs(query(collection(db, 'packaging_types'))),
            getDoc(doc(db, 'users', fetchedContract.transportManagerId)),
            getDocs(query(collection(db, "Drivers"), where('status', '==', 'Active'))),
            getDocs(query(collection(db, 'vehicles'))),
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
      }
      
       if (refetchExecutions) {
        const executionsSnap = await getDocs(query(collection(db, 'contracted_transport_executions'), where('contractId', '==', id)))
        const executionsData = executionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              date: doc.data().date.toDate(),
              createdAt: doc.data().createdAt.toDate(),
          } as ContractedTransportExecution));

          setExecutions(executionsData);
       }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      if (refetchExecutions) setIsLoading(false);
    }
  }, [id, router, toast, contract]);

  React.useEffect(() => {
    fetchContractData(true);
  }, [fetchContractData]);

   React.useEffect(() => {
      newExecutionForm.reset({ date: new Date() });
  }, [isExecutionDialogOpen, newExecutionForm]);

  React.useEffect(() => {
    if (executionToUpdate) {
        if(updateAction === 'load') loadingForm.reset({ driverId: '', vehicleId: '', loadingWeight: 0 });
        if(updateAction === 'unload') unloadingForm.reset({ unloadingWeight: 0});
    }
  }, [executionToUpdate, updateAction, loadingForm, unloadingForm]);

   const onNewExecutionSubmit = async (values: NewExecutionFormValues) => {
        if (!id || !contract) return;
        setIsSubmitting(true);
        try {
            const newDocRef = await addDoc(collection(db, 'contracted_transport_executions'), {
                ...values,
                contractId: id,
                status: 'Pending',
                statusHistory: [{ status: 'Pending', date: new Date() }],
                createdAt: serverTimestamp(),
            });
            const newDocSnap = await getDoc(newDocRef);
            const newExecution = {
              id: newDocSnap.id,
              ...newDocSnap.data(),
              date: newDocSnap.data()?.date.toDate(),
              createdAt: newDocSnap.data()?.createdAt.toDate(),
            } as ContractedTransportExecution;
            setExecutions(prev => [...prev, newExecution])

            toast({ title: 'Амжилттай', description: 'Шинэ гүйцэтгэл нэмэгдлээ.' });
            setIsExecutionDialogOpen(false);
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
        setIsAddingDriver(true);
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
            setContract(prev => prev ? ({...prev, assignedDrivers: [...prev.assignedDrivers, { driverId: driverToAdd.id, driverName: driverToAdd.display_name, driverPhone: driverToAdd.phone_number }]}) : null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsAddingDriver(false);
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
             setContract(prev => prev ? ({ ...prev, assignedDrivers: prev.assignedDrivers.filter(d => d.driverId !== driverToRemove.driverId)}) : null);
             setExecutions(prev => prev.map(e => e.driverId === driverToRemove.driverId && e.status === 'Pending' ? {...e, driverId: undefined, driverName: undefined} : e));
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч хасахад алдаа гарлаа.'});
        }
    }
    
    const handleAddVehicle = async (vehicleId: string) => {
        if (!id || !vehicleId) return;
        const vehicleToAdd = vehicles.find(v => v.id === vehicleId);
        if (!vehicleToAdd) return;
        setIsAddingVehicle(true);
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
            setContract(prev => prev ? ({...prev, assignedVehicles: [...prev.assignedVehicles, newVehicleData]}) : null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsAddingVehicle(false);
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
             setContract(prev => prev ? ({ ...prev, assignedVehicles: prev.assignedVehicles.filter(v => v.vehicleId !== vehicleToRemove.vehicleId)}) : null);
            setExecutions(prev => prev.map(e => e.vehicleId === vehicleToRemove.vehicleId && e.status === 'Pending' ? {...e, vehicleId: undefined, vehicleLicense: undefined} : e));
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл хасахад алдаа гарлаа.'});
        }
    }

    const onRouteStopSubmit = async (values: RouteStopFormValues) => {
        if (!id || !contract) return;
        setIsSubmittingStop(true);
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
            setContract(prev => prev ? ({...prev, routeStops: [...prev.routeStops, newStop]}) : null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsSubmittingStop(false);
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
            setContract(prev => prev ? ({...prev, routeStops: prev.routeStops.filter(s => s.id !== stopToRemove.id)}) : null);
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Зогсоол хасахад алдаа гарлаа.'});
        }
    }
    
    const handleUpdateExecution = async (newStatus: ContractedTransportExecutionStatus, values?: LoadingFormValues | UnloadingFormValues) => {
        if (!executionToUpdate) return;

        setIsSubmitting(true);
        let updatedExecutionData: any = {};
        try {
            const execRef = doc(db, 'contracted_transport_executions', executionToUpdate.id);
            let dataToUpdate: any = {};
            
            if (newStatus === 'Loading' && values && 'loadingWeight' in values) {
                const driver = contract?.assignedDrivers.find(d => d.driverId === values.driverId);
                const vehicle = contract?.assignedVehicles.find(v => v.vehicleId === values.vehicleId);
                dataToUpdate = {
                    ...values,
                    driverName: driver?.driverName,
                    vehicleLicense: vehicle?.licensePlate,
                };
            } else if (newStatus === 'Delivered' && values && 'unloadingWeight' in values) {
                dataToUpdate = values;
            } else if (newStatus === 'Pending') {
                 dataToUpdate = {
                    driverId: null,
                    driverName: null,
                    vehicleId: null,
                    vehicleLicense: null,
                    loadingWeight: null,
                    unloadingWeight: null,
                };
            }
            
            updatedExecutionData = { ...executionToUpdate, ...dataToUpdate, status: newStatus };

            await updateDoc(execRef, {
                ...dataToUpdate,
                status: newStatus,
                statusHistory: arrayUnion({ status: newStatus, date: Timestamp.now() }),
            });
            
            setExecutions(prev => prev.map(ex => ex.id === executionToUpdate.id ? updatedExecutionData : ex));

            toast({ title: 'Амжилттай', description: `Гүйцэтгэл '${statusTranslation[newStatus]}' төлөвт шилжлээ.` });
        } catch (error) {
            console.error("Error updating execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэлийн явц шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
            setExecutionToUpdate(null);
            setUpdateAction(null);
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const activeExecution = executions.find(ex => ex.id === active.id);
            const newStatus = over.id as ContractedTransportExecutionStatus;
            
            if (activeExecution && activeExecution.status !== newStatus) {
                setExecutionToUpdate(activeExecution);
                 if (newStatus === 'Loading' && activeExecution.status === 'Pending') {
                    setUpdateAction('load');
                } else if (newStatus === 'Delivered' && activeExecution.status === 'Unloading') {
                    setUpdateAction('unload');
                } else {
                    handleUpdateExecution(newStatus);
                }
            }
        }
    };


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
                    <Separator/>
                     <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                            <DetailItem icon={MapPin} label="Ачих цэг" value={`${relatedData.startRegionName}, ${relatedData.startWarehouseName}`} />
                            <DetailItem icon={MapPin} label="Буулгах цэг" value={`${relatedData.endRegionName}, ${relatedData.endWarehouseName}`} />
                            <DetailItem icon={MapIcon} label="Нийт зам" value={`${contract.route.totalDistance} км`} />
                        </div>
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
                    </div>
                    <Separator/>
                     <div className="grid md:grid-cols-3 gap-6 pt-2">
                        <div>
                            <h3 className="font-semibold mb-2">Оноосон жолооч нар</h3>
                            <div className="space-y-2">
                                {contract.assignedDrivers.length > 0 ? ( contract.assignedDrivers.map(driver => (
                                    <div key={driver.driverId} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted">
                                        <div><p className="font-medium">{driver.driverName}</p><p className="text-xs text-muted-foreground">{driver.driverPhone}</p></div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveDriver(driver)}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))) : (<p className="text-sm text-muted-foreground text-center py-2">Жолооч оноогоогүй байна.</p>)}
                            </div>
                            <Popover open={addDriverPopoverOpen} onOpenChange={setAddDriverPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full mt-2"><UserPlus className="mr-2 h-4 w-4" /> Жолооч нэмэх</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command><CommandInput placeholder="Жолооч хайх..."/><CommandList><CommandEmpty>Олдсонгүй.</CommandEmpty><CommandGroup>
                                        {drivers.filter(d => !assignedDriverIds.includes(d.id)).map(d => (
                                            <CommandItem key={d.id} value={`${d.display_name} ${d.phone_number}`} onSelect={() => handleAddDriver(d.id)} disabled={isAddingDriver}>
                                                <span>{d.display_name} ({d.phone_number})</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup></CommandList></Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Оноосон тээврийн хэрэгсэл</h3>
                            <div className="space-y-2">
                                {contract.assignedVehicles.length > 0 ? ( contract.assignedVehicles.map(vehicle => (
                                    <div key={vehicle.vehicleId} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted">
                                        <div><p className="font-medium">{vehicle.modelName}</p><p className="text-xs text-muted-foreground font-mono">{vehicle.licensePlate}</p></div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveVehicle(vehicle)}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))) : (<p className="text-sm text-muted-foreground text-center py-2">Тээврийн хэрэгсэл оноогоогүй байна.</p>)}
                            </div>
                            <Popover open={addVehiclePopoverOpen} onOpenChange={setAddVehiclePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full mt-2"><Car className="mr-2 h-4 w-4" /> Т/Х нэмэх</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command><CommandInput placeholder="Машин хайх..."/><CommandList><CommandEmpty>Олдсонгүй.</CommandEmpty><CommandGroup>
                                        {vehicles.filter(v => v.status === 'Available' && !assignedVehicleIds.includes(v.id)).map(v => (
                                            <CommandItem key={v.id} value={`${v.makeName} ${v.modelName} ${v.licensePlate}`} onSelect={() => handleAddVehicle(v.id)} disabled={isAddingVehicle}>
                                                <span>{v.makeName} {v.modelName} ({v.licensePlate})</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup></CommandList></Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Маршрутын зогсоол батлах</h3>
                            <Form {...routeStopForm}>
                                <form onSubmit={routeStopForm.handleSubmit(onRouteStopSubmit)} className="space-y-2">
                                    <FormField control={routeStopForm.control} name="name" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Зогсоолын нэр..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={routeStopForm.control} name="description" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Тайлбар..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" size="sm" className="w-full" disabled={isSubmittingStop}>{isSubmittingStop && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Зогсоол нэмэх</Button>
                                </form>
                            </Form>
                            <Separator className="my-2"/>
                            <div className="space-y-1">
                                {contract.routeStops.map(stop => (
                                    <div key={stop.id} className="flex justify-between items-center text-sm p-1 rounded-md hover:bg-muted">
                                        <div><p className="font-medium">{stop.name}</p><p className="text-xs text-muted-foreground">{stop.description}</p></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveStop(stop)}><XCircle className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                <CardContent>
                    <DndContext
                        onDragEnd={handleDragEnd}
                        collisionDetection={closestCenter}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {executionStatuses.map(status => (
                                <KanbanColumn key={status} status={status}>
                                    <SortableContext items={executions.filter(ex => ex.status === status).map(e => e.id)} strategy={verticalListSortingStrategy}>
                                        {executions.filter(ex => ex.status === status).map(ex => (
                                            <ExecutionCard
                                                key={ex.id}
                                                execution={ex}
                                                onDelete={() => setExecutionToDelete(ex)}
                                                onUpdate={() => {
                                                    setExecutionToUpdate(ex);
                                                    const currentIndex = executionStatuses.indexOf(ex.status);
                                                    if (currentIndex < executionStatuses.length - 1) {
                                                        const nextStatus = executionStatuses[currentIndex + 1];
                                                        if (nextStatus === 'Loading') {
                                                            setUpdateAction('load');
                                                        } else if (nextStatus === 'Delivered') {
                                                            setUpdateAction('unload');
                                                        } else {
                                                            handleUpdateExecution(nextStatus);
                                                        }
                                                    }
                                                }}
                                            />
                                        ))}
                                    </SortableContext>
                                </KanbanColumn>
                            ))}
                        </div>
                    </DndContext>
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

        <Dialog open={!!executionToUpdate && updateAction === 'load'} onOpenChange={() => { setExecutionToUpdate(null); setUpdateAction(null); }}>
             <DialogContent>
                <DialogHeader><DialogTitle>Ачилт эхлүүлэх</DialogTitle></DialogHeader>
                <Form {...loadingForm}>
                    <form onSubmit={loadingForm.handleSubmit((values) => handleUpdateExecution('Loading', values))} className="space-y-4 py-4" id="loading-form">
                        <FormField control={loadingForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        <FormField control={loadingForm.control} name="vehicleId" render={({ field }) => ( <FormItem><FormLabel>Тээврийн хэрэгсэл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Машин сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedVehicles.map(v => <SelectItem key={v.vehicleId} value={v.vehicleId}>{v.modelName} ({v.licensePlate})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        <FormField control={loadingForm.control} name="loadingWeight" render={({ field }) => ( <FormItem><FormLabel>Ачсан жин (тонн)</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="loading-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Эхлүүлэх</Button>
                </DialogFooter>
             </DialogContent>
        </Dialog>

        <Dialog open={!!executionToUpdate && updateAction === 'unload'} onOpenChange={() => { setExecutionToUpdate(null); setUpdateAction(null); }}>
             <DialogContent>
                <DialogHeader><DialogTitle>Буулгалт хийх</DialogTitle></DialogHeader>
                 <Form {...unloadingForm}>
                    <form onSubmit={unloadingForm.handleSubmit((values) => handleUpdateExecution('Delivered', values))} className="space-y-4 py-4" id="unloading-form">
                        <FormField control={unloadingForm.control} name="unloadingWeight" render={({ field }) => ( <FormItem><FormLabel>Буулгасан жин (тонн)</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="unloading-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Хүргэгдсэн болгох</Button>
                </DialogFooter>
             </DialogContent>
        </Dialog>
    </div>
  );
}

