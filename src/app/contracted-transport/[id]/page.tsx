

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, XCircle, Clock, PlusCircle, Trash2, Loader2, UserPlus, Car, Map as MapIcon, ChevronsUpDown, X, Route, MoreHorizontal, Check, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContractedTransport, Region, Warehouse, PackagingType, SystemUser, Driver, ContractedTransportExecution, RouteStop, Vehicle, ContractedTransportExecutionStatus, ContractedTransportStatus, ContractedTransportExecutionCargo } from '@/types';
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
import { useForm, useFieldArray } from 'react-hook-form';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { DndContext, closestCenter, type DragEndEvent, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CSS } from '@dnd-kit/utilities';

const newExecutionCargoSchema = z.object({
  cargoItemId: z.string(),
  cargoName: z.string(),
  cargoUnit: z.string(),
  loadedQuantity: z.coerce.number().min(0, "Ачсан хэмжээ 0-ээс бага байж болохгүй."),
});

const newExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  driverId: z.string().min(1, { message: 'Жолооч сонгоно уу.' }),
  vehicleId: z.string().min(1, { message: 'Тээврийн хэрэгсэл сонгоно уу.' }),
  loadedCargo: z.array(newExecutionCargoSchema).optional(),
});
type NewExecutionFormValues = z.infer<typeof newExecutionFormSchema>;

const editExecutionCargoSchema = z.object({
  cargoItemId: z.string(),
  cargoName: z.string(),
  cargoUnit: z.string(),
  loadedQuantity: z.coerce.number().min(0, "Ачсан хэмжээ 0-ээс бага байж болохгүй."),
});

const editExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  loadedCargo: z.array(editExecutionCargoSchema).optional(),
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

const toDateSafe = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date.toDate();
    if (typeof date === 'object' && date !== null && 'seconds' in date && typeof date.seconds === 'number' && 'nanoseconds' in date && typeof date.nanoseconds === 'number') {
        return new Timestamp(date.seconds, date.nanoseconds).toDate();
    }
    if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
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


function SortableExecutionCard({ execution, onEdit, onDelete }: { execution: ContractedTransportExecution, onEdit: () => void, onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: execution.id });
  const date = toDateSafe(execution.date);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className="text-xs mb-2 touch-none group/exec"
    >
        <div {...attributes} {...listeners} className="p-2 relative">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/exec:opacity-100 transition-opacity z-10">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Устгах</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <p className="font-semibold pr-6">Огноо: {date ? format(date, 'yyyy-MM-dd') : 'N/A'}</p>
            <div className="text-muted-foreground">
            <p>Жолооч: {execution.driverName || 'TBA'}</p>
            <p>Машин: {execution.vehicleLicense || 'TBA'}</p>
            </div>
            {execution.loadedCargo && execution.loadedCargo.length > 0 && (
                <div className="mt-1 pt-1 border-t text-muted-foreground">
                    <p className="font-medium text-xs">Ачсан ачаа:</p>
                    <ul className="list-disc list-inside">
                        {execution.loadedCargo.map((cargo, index) => (
                            <li key={cargo.cargoItemId || index} className="text-xs">{cargo.cargoName}: {cargo.loadedQuantity} {cargo.cargoUnit}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </Card>
  );
}

function StatusColumn({ id, title, items, stop, onEditStop, onDeleteStop, onEditExecution, onDeleteExecution }: { 
    id: string; 
    title: string; 
    items: ContractedTransportExecution[];
    stop?: RouteStop;
    onEditStop: (stop: RouteStop) => void;
    onDeleteStop: (stop: RouteStop) => void;
    onEditExecution: (execution: ContractedTransportExecution) => void;
    onDeleteExecution: (execution: ContractedTransportExecution) => void;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="p-2 rounded-lg bg-muted/50 min-h-40 flex flex-col">
      <div className="font-semibold text-center text-sm p-2 rounded-md relative group/stop-header">
          <h3 className={`${statusColorMap[title] || 'bg-purple-500'} text-white p-2 rounded-md`}>
              {title}
          </h3>
          {stop && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/stop-header:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4 text-white" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditStop(stop)}><Edit className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDeleteStop(stop)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Устгах</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          )}
      </div>

      {stop && (
          <div className="text-xs text-center text-muted-foreground mt-1 px-1 flex items-start gap-1.5">
             <Info className="h-3 w-3 mt-0.5 shrink-0"/> <span>{stop.description}</span>
          </div>
      )}
      <div className="space-y-1 min-h-20 mt-2 flex-1">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(ex => (
                <SortableExecutionCard 
                    key={ex.id} 
                    execution={ex}
                    onEdit={() => onEditExecution(ex)}
                    onDelete={() => onDeleteExecution(ex)}
                />
            ))}
        </SortableContext>
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
  
  const [isStopDialogOpen, setIsStopDialogOpen] = React.useState(false);
  const [isNewExecutionDialogOpen, setIsNewExecutionDialogOpen] = React.useState(false);
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
    const inTransitStatuses = (contract.routeStops || []).map(s => s.name);
    const endStatuses = ['Буулгаж буй', 'Хүргэгдсэн'];
    
    return [...baseStatuses, ...inTransitStatuses, ...endStatuses] as (ContractedTransportExecutionStatus | string)[];

  }, [contract]);
  
  const routeStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
    defaultValues: { name: '', description: '' }
  });
  
  const editStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
  });

  const newExecutionForm = useForm<NewExecutionFormValues>({
    resolver: zodResolver(newExecutionFormSchema),
  });

  useFieldArray({
    control: newExecutionForm.control,
    name: "loadedCargo"
  });

  const editExecutionForm = useForm<EditExecutionFormValues>({
    resolver: zodResolver(editExecutionFormSchema),
  });

  useFieldArray({
    control: editExecutionForm.control,
    name: "loadedCargo"
  });

  const assignedDriverIds = React.useMemo(() => contract?.assignedDrivers?.map(d => d.driverId) || [], [contract]);
  const assignedVehicleIds = React.useMemo(() => contract?.assignedVehicles?.map(v => v.vehicleId) || [], [contract]);

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
        const startDate = toDateSafe(data.startDate);
        const endDate = toDateSafe(data.endDate);

        const fetchedContract: ContractedTransport = {
            id: contractDocSnap.id,
            ...data,
            createdAt: toDateSafe(data.createdAt)!,
            startDate: startDate!,
            endDate: endDate!,
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
      
        const executionsData = executionsSnap.docs.map(doc => {
              const execData = doc.data();
              return {
                  id: doc.id,
                  ...execData,
                  date: toDateSafe(execData.date)!,
                  createdAt: toDateSafe(execData.createdAt)!,
                  statusHistory: (execData.statusHistory || []).map((h: any) => ({...h, date: toDateSafe(h.date)!})),
              } as ContractedTransportExecution
          });

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
    if (stopToEdit) {
      editStopForm.reset(stopToEdit);
    } else {
      editStopForm.reset({ name: '', description: '' });
    }
  }, [stopToEdit, editStopForm]);

  React.useEffect(() => {
    if (contract && isNewExecutionDialogOpen) {
      const formCargo = contract.cargoItems.map(contractCargo => ({
        cargoItemId: contractCargo.id,
        cargoName: contractCargo.name,
        cargoUnit: contractCargo.unit,
        loadedQuantity: 0,
      }));
      newExecutionForm.reset({
        date: new Date(),
        driverId: '',
        vehicleId: '',
        loadedCargo: formCargo
      });
    }
  }, [contract, isNewExecutionDialogOpen, newExecutionForm]);

  React.useEffect(() => {
    if (executionToEdit && contract) {
      const existingCargoMap = new Map(executionToEdit.loadedCargo?.map(c => [c.cargoItemId, c.loadedQuantity]));
      
      const formCargo = contract.cargoItems.map(contractCargo => {
        return {
          cargoItemId: contractCargo.id,
          cargoName: contractCargo.name,
          cargoUnit: contractCargo.unit,
          loadedQuantity: existingCargoMap.get(contractCargo.id) || 0,
        };
      });

      editExecutionForm.reset({
        date: toDateSafe(executionToEdit.date)!,
        driverId: executionToEdit.driverId || 'no-selection',
        vehicleId: executionToEdit.vehicleId || 'no-selection',
        loadedCargo: formCargo
      });
    }
  }, [executionToEdit, contract, editExecutionForm]);
    
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
            const driverId = values.driverId === 'no-selection' ? undefined : values.driverId;
            const vehicleId = values.vehicleId === 'no-selection' ? undefined : values.vehicleId;

            const selectedDriver = driverId ? contract.assignedDrivers.find(d => d.driverId === driverId) : undefined;
            const selectedVehicle = vehicleId ? contract.assignedVehicles.find(v => v.vehicleId === vehicleId) : undefined;
            
            const cargoToLoad = (values.loadedCargo || []).filter(c => c.loadedQuantity > 0);

            const updateData = {
              date: values.date,
              driverId: selectedDriver?.driverId,
              driverName: selectedDriver?.driverName,
              vehicleId: selectedVehicle?.vehicleId,
              vehicleLicense: selectedVehicle?.licensePlate,
              loadedCargo: cargoToLoad,
            };

            await updateDoc(execRef, updateData as DocumentData);
            
            setExecutions(prev => prev.map(ex => ex.id === executionToEdit.id ? { ...ex, ...updateData, date: values.date } : ex));
            toast({ title: 'Амжилттай', description: 'Гүйцэтгэл шинэчлэгдлээ.' });
            setExecutionToEdit(null);
        } catch (error) {
             console.error("Error updating execution:", error);
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
        setIsSubmitting(true);
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
            setIsSubmitting(false);
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

    const handleNewExecutionSubmit = async (values: NewExecutionFormValues) => {
        if (!contract) return;
        setIsSubmitting(true);
        try {
            const selectedDriver = contract.assignedDrivers.find(d => d.driverId === values.driverId);
            const selectedVehicle = contract.assignedVehicles.find(v => v.vehicleId === values.vehicleId);
            
            const cargoToLoad = (values.loadedCargo || []).filter(c => c.loadedQuantity > 0);

            const dataToSave = {
                contractId: contract.id,
                date: values.date,
                driverId: selectedDriver?.driverId,
                driverName: selectedDriver?.driverName,
                vehicleId: selectedVehicle?.vehicleId,
                vehicleLicense: selectedVehicle?.licensePlate,
                loadedCargo: cargoToLoad,
                status: 'Хүлээгдэж буй',
                statusHistory: [{ status: 'Хүлээгдэж буй', date: new Date() }],
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'contracted_transport_executions'), dataToSave);
            
            const newExecution = {
                id: docRef.id,
                ...dataToSave,
                createdAt: new Date(),
            } as ContractedTransportExecution;

            setExecutions(prev => [...prev, newExecution]);
            toast({ title: 'Амжилттай', description: 'Шинэ гүйцэтгэл нэмэгдлээ.' });
            setIsNewExecutionDialogOpen(false);

        } catch (error) {
            console.error("Error creating new execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Шинэ гүйцэтгэл нэмэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleExecutionStatusChange = React.useCallback((executionId: string, newStatus: string) => {
        const execRef = doc(db, 'contracted_transport_executions', executionId);
        updateDoc(execRef, {
            status: newStatus,
            statusHistory: arrayUnion({ status: newStatus, date: new Date() }),
        }).catch((error) => {
            console.error("Error updating execution status:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Явцын төлөв шинэчлэхэд алдаа гарлаа.' });
            fetchContractData(); // Re-fetch to be safe
        });
    }, [fetchContractData, toast]);
    
    const handleDragEnd = React.useCallback((event: DragEndEvent) => {
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const overContainerId = over.id as string;
             
            setExecutions((prev) => {
                const activeIndex = prev.findIndex((item) => item.id === active.id);
                if (activeIndex === -1) return prev;

                const updatedExecutions = [...prev];
                updatedExecutions[activeIndex] = {
                    ...updatedExecutions[activeIndex],
                    status: overContainerId,
                };
                
                handleExecutionStatusChange(active.id as string, overContainerId);
                
                return updatedExecutions;
            });
        }
    }, [handleExecutionStatusChange]);
    

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
  const contractStartDate = toDateSafe(contract.startDate);
  const contractEndDate = toDateSafe(contract.endDate);


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
                            <DetailItem icon={Calendar} label="Гэрээний хугацаа" value={contractStartDate && contractEndDate ? `${format(contractStartDate, 'yyyy-MM-dd')} - ${format(contractEndDate, 'yyyy-MM-dd')}` : ''} />
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
                            {(contract.cargoItems || []).map((item, index) => (
                                <TableRow key={item.id || index}>
                                    <TableCell className="font-medium">{item.name} ({item.unit})</TableCell>
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
                            <Button variant="outline" size="sm" onClick={() => setIsNewExecutionDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Гүйцэтгэл нэмэх
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsStopDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Зогсоол нэмэх
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
                                    <StatusColumn 
                                        key={status} 
                                        id={status}
                                        title={status}
                                        items={itemsForStatus}
                                        stop={stop}
                                        onEditStop={(stopToEdit) => setStopToEdit(stopToEdit)}
                                        onDeleteStop={(stopToDelete) => setStopToDelete(stopToDelete)}
                                        onEditExecution={(exec) => setExecutionToEdit(exec)}
                                        onDeleteExecution={(exec) => setExecutionToDelete(exec)}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DndContext>

        {/* Add New Execution Dialog */}
        <Dialog open={isNewExecutionDialogOpen} onOpenChange={setIsNewExecutionDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Шинэ гүйцэтгэл нэмэх</DialogTitle>
                </DialogHeader>
                <Form {...newExecutionForm}>
                    <form onSubmit={newExecutionForm.handleSubmit(handleNewExecutionSubmit)} id="new-execution-form" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField control={newExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                        <FormField control={newExecutionForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Оноосон жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        <FormField control={newExecutionForm.control} name="vehicleId" render={({ field }) => ( <FormItem><FormLabel>Оноосон тээврийн хэрэгсэл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Т/Х сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedVehicles.map(v => <SelectItem key={v.vehicleId} value={v.vehicleId}>{v.licensePlate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        <div>
                            <FormLabel>Ачих ачаа ба хэмжээ (тонн)</FormLabel>
                            <div className="space-y-2 mt-2">
                                {newExecutionForm.getValues('loadedCargo')?.map((field, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm">{field.cargoName}</span>
                                    <FormField
                                    control={newExecutionForm.control}
                                    name={`loadedCargo.${index}.loadedQuantity`}
                                    render={({ field }) => (
                                        <FormItem className="w-32">
                                        <FormControl>
                                            <Input type="number" placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <span className="text-sm text-muted-foreground">{field.cargoUnit}</span>
                                </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="new-execution-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Хадгалах</Button>
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
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Гүйцэтгэл засах</DialogTitle>
                    </DialogHeader>
                    <Form {...editExecutionForm}>
                        <form onSubmit={editExecutionForm.handleSubmit(handleUpdateExecution)} id="edit-execution-form" className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                <FormField control={editExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                <FormField control={editExecutionForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Оноосон жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="no-selection">Сонгоогүй</SelectItem>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                <FormField control={editExecutionForm.control} name="vehicleId" render={({ field }) => ( <FormItem><FormLabel>Оноосон тээврийн хэрэгсэл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Т/Х сонгох..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="no-selection">Сонгоогүй</SelectItem>{contract.assignedVehicles.map(v => <SelectItem key={v.vehicleId} value={v.vehicleId}>{v.licensePlate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                <div>
                                    <FormLabel>Ачсан ачаа ба хэмжээ</FormLabel>
                                    <div className="space-y-2 mt-2">
                                        {editExecutionForm.getValues('loadedCargo')?.map((field, index) => (
                                        <div key={field.cargoItemId} className="flex items-center gap-2">
                                            <span className="flex-1 text-sm">{field.cargoName}</span>
                                            <FormField
                                            control={editExecutionForm.control}
                                            name={`loadedCargo.${index}.loadedQuantity`}
                                            render={({ field }) => (
                                                <FormItem className="w-32">
                                                <FormControl>
                                                    <Input type="number" placeholder="0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                             <span className="text-sm text-muted-foreground">{field.cargoUnit}</span>
                                        </div>
                                        ))}
                                    </div>
                                </div>
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
                     <form onSubmit={routeStopForm.handleSubmit(onRouteStopSubmit)} id="stop-form" className="space-y-4 py-4">
                            <FormField control={routeStopForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Зогсоолын нэр</FormLabel><FormControl><Input placeholder="Даваа-1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={routeStopForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Input placeholder="Амрах, хооллох" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </form>
                </Form>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="stop-form" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Нэмэх</Button>
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
                    <AlertDialogAction onClick={handleRemoveStop} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                       {isSubmitting ? "Устгаж байна..." : "Устгах"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
