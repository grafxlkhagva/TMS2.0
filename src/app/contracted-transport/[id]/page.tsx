
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, XCircle, Clock, PlusCircle, Trash2, Loader2, UserPlus, Car, Map as MapIcon, ChevronsUpDown, X, Route, MoreHorizontal, Check, Info, CheckCircle, Megaphone, MegaphoneOff, Eye, Briefcase, TrendingUp, Cuboid, Send, FileSpreadsheet, Sparkles, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, writeBatch, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContractedTransport, Region, Warehouse, PackagingType, SystemUser, Driver, ContractedTransportExecution, RouteStop, Vehicle, ContractedTransportExecutionStatus, ContractedTransportStatus, ContractedTransportCargoItem, AssignedDriver } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { DndContext, closestCenter, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { generateChecklistAction, generateUnloadingChecklistAction } from './actions';

const newExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  assignmentId: z.string().min(1, 'Жолооч/машины хослолыг сонгоно уу.'),
  selectedCargo: z.array(z.string()),
});
type NewExecutionFormValues = z.infer<typeof newExecutionFormSchema>;

const editExecutionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
});
type EditExecutionFormValues = z.infer<typeof editExecutionFormSchema>;


const routeStopFormSchema = z.object({
  id: z.string().min(1, "Нэр оруулна уу."),
  description: z.string().min(2, "Тайлбар дор хаяж 2 тэмдэгттэй байх ёстой."),
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

const statusTranslations: Record<string, string> = {
    Pending: 'Хүлээгдэж буй',
    Loaded: 'Ачсан',
    Unloaded: 'Буулгасан',
    Delivered: 'Хүргэгдсэн',
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
    'Pending': 'bg-gray-500',
    'Loaded': 'bg-blue-500',
    'Unloaded': 'bg-yellow-500',
    'Delivered': 'bg-green-500',
};



function SortableExecutionCard({ execution, onEdit, onDelete, onMove, canMoveBack, canMoveForward }: { 
    execution: ContractedTransportExecution, 
    onEdit: () => void, 
    onDelete: () => void,
    onMove: (direction: 'forward' | 'backward') => void,
    canMoveBack: boolean,
    canMoveForward: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: execution.id });
    const date = toDateSafe(execution.date);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };
  
    return (
        <Card ref={setNodeRef} style={style} className="text-xs mb-2 touch-none group/exec relative">
            <div className="p-3">
                <div className="absolute top-1 right-1 z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/exec:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Устгах</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <div {...attributes} {...listeners} className="cursor-grab pr-6 space-y-1.5">
                    <p className="font-semibold">Огноо: {date ? format(date, 'yyyy-MM-dd') : 'N/A'}</p>
                    <div className="text-muted-foreground">
                    <p>Жолооч: {execution.driverName || 'TBA'}</p>
                    <p>Машин: {execution.vehicleLicense || 'TBA'}</p>
                    {execution.totalLoadedWeight ? <p className="text-blue-600 font-semibold">Ачсан: {execution.totalLoadedWeight}тн</p> : null}
                    </div>
                     <div className="flex flex-wrap gap-1 pt-1">
                        {(execution.selectedCargo && execution.selectedCargo.length > 0) ? (
                            execution.selectedCargo.map((cargoName, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">{cargoName}</Badge>
                            ))
                        ) : (
                            <Badge variant="outline" className="text-xs">Ачаагүй</Badge>
                        )}
                    </div>
                </div>
            </div>
            <CardFooter className="p-1 border-t flex justify-between">
                <Button onClick={() => onMove('backward')} disabled={!canMoveBack} variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button onClick={() => onMove('forward')} disabled={!canMoveForward} variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}

function StatusColumn({ id, title, items, stop, onEditStop, onDeleteStop, onEditExecution, onDeleteExecution, onMoveExecution, executionStatuses }: { 
    id: string; 
    title: string; 
    items: ContractedTransportExecution[];
    stop?: RouteStop;
    onEditStop: (stop: RouteStop) => void;
    onDeleteStop: (stop: RouteStop) => void;
    onEditExecution: (execution: ContractedTransportExecution) => void;
    onDeleteExecution: (execution: ContractedTransportExecution) => void;
    onMoveExecution: (executionId: string, direction: 'forward' | 'backward') => void;
    executionStatuses: string[];
}) {
  const { setNodeRef } = useDroppable({ id });
  const statusIndex = executionStatuses.indexOf(id);

  return (
    <div ref={setNodeRef} className="p-2 rounded-lg bg-muted/50 min-h-40 flex flex-col">
      <div className="font-semibold text-center text-sm p-2 rounded-md relative group/stop-header">
          <h3 className={`${statusColorMap[id] || 'bg-purple-500'} text-white p-2 rounded-md`}>
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
                    onMove={(direction) => onMoveExecution(ex.id, direction)}
                    canMoveBack={statusIndex > 0}
                    canMoveForward={statusIndex < executionStatuses.length - 1}
                />
            ))}
        </SortableContext>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, actionLabel, onActionClick, valueColorClass, colorClass }: { title: string; value: string | number; icon: React.ElementType; description: string; actionLabel?: string; onActionClick?: () => void; valueColorClass?: string; colorClass?: string; }) {
  return (
    <Card className={cn("text-white", colorClass)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-gray-300" />
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueColorClass)}>{value}</div>
            <p className="text-xs text-gray-400">{description}</p>
        </CardContent>
        {actionLabel && onActionClick && (
            <CardFooter>
                 <Button variant="outline" size="sm" className="w-full bg-gray-700 text-white hover:bg-gray-600" onClick={onActionClick}>
                    {actionLabel}
                </Button>
            </CardFooter>
        )}
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
  
  const [isStopDialogOpen, setIsStopDialogOpen] = React.useState(false);
  const [isNewExecutionDialogOpen, setIsNewExecutionDialogOpen] = React.useState(false);
  const [isResourcesDialogOpen, setIsResourcesDialogOpen] = React.useState(false);
  const [isAssignmentsDialogOpen, setIsAssignmentsDialogOpen] = React.useState(false);

  
  const [isLoadCargoDialogOpen, setIsLoadCargoDialogOpen] = React.useState(false);
  const [executionToLoad, setExecutionToLoad] = React.useState<ContractedTransportExecution | null>(null);
  const [totalLoadedWeight, setTotalLoadedWeight] = React.useState<number>(0);
  
  const [isUnloadCargoDialogOpen, setIsUnloadCargoDialogOpen] = React.useState(false);
  const [executionToUnload, setExecutionToUnload] = React.useState<ContractedTransportExecution | null>(null);
  const [totalUnloadedWeight, setTotalUnloadedWeight] = React.useState<number>(0);

  const [executionToDelete, setExecutionToDelete] = React.useState<ContractedTransportExecution | null>(null);
  const [stopToDelete, setStopToDelete] = React.useState<RouteStop | null>(null);
  const [executionToEdit, setExecutionToEdit] = React.useState<ContractedTransportExecution | null>(null);
  const [stopToEdit, setStopToEdit] = React.useState<RouteStop | null>(null);

  const [addDriverPopoverOpen, setAddDriverPopoverOpen] = React.useState(false);
  const [addVehiclePopoverOpen, setAddVehiclePopoverOpen] = React.useState(false);
  
  const [sendingToSheet, setSendingToSheet] = React.useState<string | null>(null);


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
    
    const baseStatuses: string[] = ['Pending', 'Loaded'];
    const inTransitStatuses = (contract.routeStops || []).map(s => s.id);
    const endStatuses: string[] = ['Unloaded', 'Delivered'];
    
    return [...baseStatuses, ...inTransitStatuses, ...endStatuses];

  }, [contract]);
  
  const routeStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
    defaultValues: { id: '', description: '' }
  });
  
  const editStopForm = useForm<RouteStopFormValues>({
    resolver: zodResolver(routeStopFormSchema),
  });

  const newExecutionForm = useForm<NewExecutionFormValues>({
    resolver: zodResolver(newExecutionFormSchema),
    defaultValues: {
        selectedCargo: [],
    }
  });

  const editExecutionForm = useForm<EditExecutionFormValues>({
    resolver: zodResolver(editExecutionFormSchema),
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
            cargoItems: (data.cargoItems || []).map((item: any, index: number) => ({ ...item, id: item.id || `cargo-${index}`})),
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
      editStopForm.reset({ id: '', description: '' });
    }
  }, [stopToEdit, editStopForm]);

  React.useEffect(() => {
    if (isNewExecutionDialogOpen) {
      newExecutionForm.reset({ date: new Date(), assignmentId: '', selectedCargo: []});
    }
  }, [isNewExecutionDialogOpen, newExecutionForm]);

  React.useEffect(() => {
    if (executionToLoad) {
        setTotalLoadedWeight(executionToLoad.totalLoadedWeight || 0);
    }
  }, [executionToLoad]);

  React.useEffect(() => {
    if (executionToUnload) {
        setTotalUnloadedWeight(executionToUnload.totalUnloadedWeight || 0);
    }
  }, [executionToUnload]);
  
  React.useEffect(() => {
    if (executionToEdit && contract) {
      editExecutionForm.reset({
        date: toDateSafe(executionToEdit.date)!,
        driverId: executionToEdit.driverId || 'no-selection',
        vehicleId: executionToEdit.vehicleId || 'no-selection',
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
        
        try {
            setIsSubmitting(true);
            const execRef = doc(db, 'contracted_transport_executions', executionToEdit.id);
            const driverId = values.driverId === 'no-selection' ? undefined : values.driverId;
            const vehicleId = values.vehicleId === 'no-selection' ? undefined : values.vehicleId;

            const selectedDriver = driverId ? contract.assignedDrivers.find(d => d.driverId === driverId) : undefined;
            const selectedVehicle = vehicleId ? contract.assignedVehicles.find(v => v.vehicleId === vehicleId) : undefined;

            const updateData: DocumentData = {
              date: values.date,
              driverId: selectedDriver?.driverId,
              driverName: selectedDriver?.driverName,
              vehicleId: selectedVehicle?.vehicleId,
              vehicleLicense: selectedVehicle?.licensePlate,
            };

            await updateDoc(execRef, updateData);
            
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
    
    const handleRemoveDriver = async (driverToRemove: AssignedDriver) => {
        if (!id || !contract) return;
        
        const driverDataToRemove = contract.assignedDrivers.find(d => d.driverId === driverToRemove.driverId);
        if (!driverDataToRemove) return;

        const batch = writeBatch(db);
        const contractRef = doc(db, 'contracted_transports', id);
        batch.update(contractRef, { assignedDrivers: arrayRemove(driverDataToRemove) });
        
        const pendingExecs = executions.filter(e => e.status === 'Pending' && e.driverId === driverToRemove.driverId);
        pendingExecs.forEach(exec => {
            const execRef = doc(db, 'contracted_transport_executions', exec.id);
            batch.update(execRef, { driverId: undefined, driverName: undefined });
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

        const pendingExecs = executions.filter(e => e.status === 'Pending' && e.vehicleId === vehicleToRemove.vehicleId);
        pendingExecs.forEach(exec => {
            const execRef = doc(db, 'contracted_transport_executions', exec.id);
            batch.update(execRef, { vehicleId: undefined, vehicleLicense: undefined });
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
            const assignment = contract.assignedDrivers.find(d => d.driverId === values.assignmentId);
            if (!assignment) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Оноолт олдсонгүй.' });
                setIsSubmitting(false);
                return;
            }
            const vehicle = contract.assignedVehicles.find(v => v.vehicleId === assignment.assignedVehicleId);
    
            const newSelectedCargoNames: string[] = values.selectedCargo
                .map(itemId => {
                    const cargo = contract.cargoItems.find(c => c.id === itemId);
                    return cargo?.name;
                })
                .filter((name): name is string => !!name);
    
            const dataToSave: { [key: string]: any } = {
                contractId: contract.id,
                date: values.date,
                status: 'Pending',
                statusHistory: [{ status: 'Pending', date: new Date() }],
                createdAt: serverTimestamp(),
                selectedCargo: newSelectedCargoNames,
                totalLoadedWeight: 0,
                totalUnloadedWeight: 0,
                driverId: assignment.driverId,
                driverName: assignment.driverName,
                vehicleId: vehicle?.vehicleId,
                vehicleLicense: vehicle?.licensePlate,
            };
    
            if (dataToSave.driverId === undefined) delete dataToSave.driverId;
            if (dataToSave.driverName === undefined) delete dataToSave.driverName;
            if (dataToSave.vehicleId === undefined) delete dataToSave.vehicleId;
            if (dataToSave.vehicleLicense === undefined) delete dataToSave.vehicleLicense;
    
            const docRef = await addDoc(collection(db, 'contracted_transport_executions'), dataToSave);
            
            const newExecution: ContractedTransportExecution = {
                id: docRef.id,
                ...dataToSave,
                date: toDateSafe(dataToSave.date)!,
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

    const handleMoveExecution = async (executionId: string, newStatus: string) => {
        const execution = executions.find(ex => ex.id === executionId);
        if (!execution || execution.status === newStatus) return;
        
        // Skip 'Loaded' stage if there is no cargo
        if (newStatus === 'Loaded' && (!execution.selectedCargo || execution.selectedCargo.length === 0)) {
            const loadedIndex = executionStatuses.indexOf('Loaded');
            const nextStatus = executionStatuses[loadedIndex + 1];
            if (nextStatus) {
                handleMoveExecution(executionId, nextStatus); // Recursively call to move to the next status
            }
            return;
        }

        if (newStatus === 'Loaded') {
            setExecutionToLoad(execution);
            setIsLoadCargoDialogOpen(true);
            return; 
        }
         if (newStatus === 'Unloaded') {
            setExecutionToUnload(execution);
            setIsUnloadCargoDialogOpen(true);
            return;
        }
        
        setIsSubmitting(true);
        const execRef = doc(db, 'contracted_transport_executions', executionId);
        try {
            await updateDoc(execRef, {
                status: newStatus,
                statusHistory: arrayUnion({ status: newStatus, date: new Date() }),
            });
            setExecutions((prev) =>
                prev.map((ex) =>
                    ex.id === executionId ? { ...ex, status: newStatus as ContractedTransportExecutionStatus } : ex
                )
            );
        } catch (error) {
            console.error("Error updating execution status:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Явцын төлөв шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const executionId = active.id as string;
            const oldStatus = active.data.current?.sortable.containerId as string;
            const newStatus = over.id as string;

            const oldIndex = executionStatuses.indexOf(oldStatus);
            const newIndex = executionStatuses.indexOf(newStatus);
            
            if (Math.abs(oldIndex - newIndex) !== 1) {
                toast({ variant: 'destructive', title: 'Боломжгүй үйлдэл', description: 'Зөвхөн залгаа байрлах багана руу зөөх боломжтой.' });
                return;
            }
            
            handleMoveExecution(executionId, newStatus);
        }
    }, [executions, executionStatuses, toast]);

    const handleMoveWithButton = (executionId: string, direction: 'forward' | 'backward') => {
        const execution = executions.find(ex => ex.id === executionId);
        if (!execution) return;

        const currentIndex = executionStatuses.indexOf(execution.status);
        const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < executionStatuses.length) {
            const newStatus = executionStatuses[newIndex];
            handleMoveExecution(executionId, newStatus);
        }
    };
    
    const handleLoadCargoSubmit = async () => {
        if (!executionToLoad) return;
        setIsSubmitting(true);
    
        try {
            const execRef = doc(db, 'contracted_transport_executions', executionToLoad.id);
            
            const dataToUpdate: DocumentData = {
                status: 'Loaded' as ContractedTransportExecutionStatus,
                statusHistory: arrayUnion({ status: 'Loaded', date: new Date() }),
                totalLoadedWeight: totalLoadedWeight,
            };

            await updateDoc(execRef, dataToUpdate);
    
            setExecutions((prev) =>
                prev.map((ex) =>
                    ex.id === executionToLoad.id
                        ? { ...ex, status: 'Loaded' as ContractedTransportExecutionStatus, totalLoadedWeight: totalLoadedWeight }
                        : ex
                )
            );
    
            toast({ title: 'Амжилттай', description: 'Ачааны мэдээлэл хадгалагдлаа.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Ачааны мэдээлэл хадгалахад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
            setIsLoadCargoDialogOpen(false);
            setExecutionToLoad(null);
        }
    };

    const handleUnloadCargoSubmit = async () => {
        if (!executionToUnload) return;
        setIsSubmitting(true);
    
        try {
            const execRef = doc(db, 'contracted_transport_executions', executionToUnload.id);
            
            const dataToUpdate: DocumentData = {
                status: 'Unloaded' as ContractedTransportExecutionStatus,
                statusHistory: arrayUnion({ status: 'Unloaded', date: new Date() }),
                totalUnloadedWeight: totalUnloadedWeight,
            };

            await updateDoc(execRef, dataToUpdate);
    
            setExecutions((prev) =>
                prev.map((ex) =>
                    ex.id === executionToUnload.id
                        ? { ...ex, status: 'Unloaded' as ContractedTransportExecutionStatus, totalUnloadedWeight: totalUnloadedWeight }
                        : ex
                )
            );
    
            toast({ title: 'Амжилттай', description: 'Буулгасан ачааны мэдээлэл хадгалагдлаа.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Буулгасан ачааны мэдээлэл хадгалахад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
            setIsUnloadCargoDialogOpen(false);
            setExecutionToUnload(null);
        }
    };
    
    const dashboardStats = React.useMemo(() => {
        if (!contract) {
            return { total: 0, completed: 0, inProgress: 0, daysLeft: 0, totalDrivers: 0, totalVehicles: 0 };
        }
        const total = executions.length;
        const completed = executions.filter(e => e.status === 'Delivered').length;
        const inProgress = executions.filter(e => e.status !== 'Pending' && e.status !== 'Delivered').length;
        const daysLeft = differenceInDays(toDateSafe(contract.endDate)!, new Date());
        const totalDrivers = contract.assignedDrivers.length;
        const totalVehicles = contract.assignedVehicles.length;

        return { total, completed, inProgress, daysLeft, totalDrivers, totalVehicles };
    }, [executions, contract]);
    
    const handleSendToSheet = async (execution: ContractedTransportExecution) => {
        if (!contract) return;
        setSendingToSheet(execution.id);
        try {
            const payload = {
                contract,
                execution,
                relatedData
            };
    
            const response = await fetch('/api/contracted-transport/send-to-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Sheet-рүү илгээхэд алдаа гарлаа.');
            }
    
            toast({ title: 'Амжилттай', description: 'Гүйцэтгэлийн мэдээллийг Google Sheet-рүү илгээлээ.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: (error as Error).message });
        } finally {
            setSendingToSheet(null);
        }
      };

    const handleSaveAssignments = async (newAssignments: AssignedDriver[]) => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                assignedDrivers: newAssignments
            });
            setContract(prev => prev ? { ...prev, assignedDrivers: newAssignments } : null);
            toast({ title: "Амжилттай", description: "Оноолт хадгалагдлаа."});
            setIsAssignmentsDialogOpen(false);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Оноолт хадгалахад алдаа гарлаа.'});
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
  const contractStartDate = toDateSafe(contract.startDate);
  const contractEndDate = toDateSafe(contract.endDate);


  const getStatusDate = (exec: ContractedTransportExecution, status: ContractedTransportExecutionStatus): string => {
    const historyItem = exec.statusHistory.find(h => h.status === status);
    const date = historyItem ? toDateSafe(historyItem.date) : null;
    return date ? format(date, 'yyyy-MM-dd HH:mm') : '-';
  };

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
            <div className='flex items-center gap-4'>
                <h1 className="text-3xl font-headline font-bold">{contract.title}</h1>
                <Dialog>
                    <DialogTrigger asChild>
                         <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4"/> Дэлгэрэнгүй харах</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className='flex justify-between items-center'>
                                Гэрээний дэлгэрэнгүй
                                 <Button asChild size="sm" variant="outline">
                                    <Link href={`/contracted-transport/${id}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" /> Засварлах
                                    </Link>
                                </Button>
                            </DialogTitle>
                            <DialogDescription>
                                Гэрээний дугаар: {contract.contractNumber}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6 -mr-6">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                                <DetailItem icon={User} label="Харилцагч" value={contract.customerName} />
                                <DetailItem icon={User} label="Тээврийн менежер" value={relatedData.transportManagerName} />
                                <DetailItem icon={Calendar} label="Гэрээний хугацаа" value={contractStartDate && contractEndDate ? `${format(contractStartDate, 'yyyy-MM-dd')} - ${format(contractEndDate, 'yyyy-MM-dd')}` : ''} />
                                <DetailItem icon={Calendar} label="Давтамж" value={contract.frequency === 'Custom' ? `${frequencyTranslations[contract.frequency]} (${contract.customFrequencyDetails})` : frequencyTranslations[contract.frequency]} />
                                <DetailItem icon={Info} label="Статус" value={<Badge variant={statusInfo.variant} className="py-1 px-3"><statusInfo.icon className="mr-1.5 h-3 w-3" />{statusInfo.text}</Badge>} />
                            </div>
                            <Separator />
                            <h3 className="font-semibold text-base">Маршрут</h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                                <DetailItem icon={MapPin} label="Ачих цэг" value={`${relatedData.startRegionName}, ${relatedData.startWarehouseName}`} />
                                <DetailItem icon={MapPin} label="Буулгах цэг" value={`${relatedData.endRegionName}, ${relatedData.endWarehouseName}`} />
                                <DetailItem icon={MapIcon} label="Нийт зам" value={`${contract.route.totalDistance} км`} />
                            </div>
                            <Separator />
                            <h3 className="font-semibold text-base">Ачааны мэдээлэл</h3>
                            <Table>
                                <TableHeader><TableRow><TableHead>Ачаа</TableHead><TableHead>Баглаа</TableHead><TableHead className="text-right">Үнүүд (Ж/ЕР/Б)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {(contract.cargoItems || []).map((item, index) => (
                                    <TableRow key={`${item.id}-${index}`}>
                                        <TableCell className="font-medium">{item.name} ({item.unit})</TableCell>
                                        <TableCell>{relatedData.packagingTypes.get(item.packagingTypeId) || item.packagingTypeId}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                          Ж: {(item.driverPrice ?? 0).toLocaleString()}
                                          <br/>
                                          ЕР: {(item.mainContractorPrice ?? 0).toLocaleString()}
                                          <br/>
                                          Б: {(item.ourPrice ?? 0).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard title="Нийт гүйцэтгэл" value={dashboardStats.total} icon={Briefcase} description="Бүртгэгдсэн нийт гүйцэтгэлийн тоо." valueColorClass="text-dashboard-stat-1" colorClass="bg-gray-900" />
        <StatCard title="Амжилттай" value={dashboardStats.completed} icon={CheckCircle} description="Амжилттай хүргэгдсэн гүйцэтгэл." valueColorClass="text-dashboard-stat-2" colorClass="bg-gray-900" />
        <StatCard title="Замд яваа" value={dashboardStats.inProgress} icon={TrendingUp} description="Идэвхтэй (ачиж/зөөж/буулгаж буй) гүйцэтгэл." valueColorClass="text-dashboard-stat-3" colorClass="bg-gray-900" />
        <StatCard title="Нийт жолооч" value={dashboardStats.totalDrivers} icon={User} description="Энэ гэрээнд оноогдсон жолооч." actionLabel="Дэлгэрэнгүй" onActionClick={() => setIsResourcesDialogOpen(true)} valueColorClass="text-dashboard-stat-4" colorClass="bg-gray-900" />
        <StatCard title="Нийт тээврийн хэрэгсэл" value={dashboardStats.totalVehicles} icon={Car} description="Энэ гэрээнд оноогдсон т/х." actionLabel="Дэлгэрэнгүй" onActionClick={() => setIsResourcesDialogOpen(true)} valueColorClass="text-dashboard-stat-5" colorClass="bg-gray-900" />
        <StatCard title="Хугацаа дуусахад" value={`${dashboardStats.daysLeft > 0 ? dashboardStats.daysLeft : 0} хоног`} icon={Clock} description="Гэрээ дуусахад үлдсэн хугацаа." valueColorClass="text-dashboard-stat-6" colorClass="bg-gray-900" />
      </div>
      
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Тээвэрлэлтийн Явц ба Зогсоолууд</CardTitle>
                            <CardDescription>Гүйцэтгэлийн явцыг чирж зөөх эсвэл сум ашиглан удирдах хэсэг.</CardDescription>
                        </div>
                            <div className="flex items-center gap-2">
                             <Button variant="outline" size="sm" onClick={() => setIsAssignmentsDialogOpen(true)}>
                                <LinkIcon className="mr-2 h-4 w-4"/> Оноолт хийх
                            </Button>
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
                        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${executionStatuses.length}, minmax(220px, 1fr))`}}>
                            {executionStatuses.map(status => {
                                const stop = contract.routeStops.find(s => s.id === status);
                                const itemsForStatus = executions.filter(ex => ex.status === status);
                                const title = statusTranslations[status] || stop?.id || status;
                                return (
                                    <StatusColumn 
                                        key={status} 
                                        id={status}
                                        title={title}
                                        items={itemsForStatus}
                                        stop={stop}
                                        onEditStop={(stopToEdit) => setStopToEdit(stopToEdit)}
                                        onDeleteStop={(stopToDelete) => setStopToDelete(stopToDelete)}
                                        onEditExecution={(exec) => setExecutionToEdit(exec)}
                                        onDeleteExecution={(exec) => setExecutionToDelete(exec)}
                                        onMoveExecution={handleMoveWithButton}
                                        executionStatuses={executionStatuses}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DndContext>
        
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Тээврийн тайлан</CardTitle>
                <CardDescription>Бүх гүйцэтгэлүүдийн нэгдсэн тайлан.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Жолооч / Машин</TableHead>
                            <TableHead>Ачсан</TableHead>
                            <TableHead>Буулгасан</TableHead>
                            <TableHead>Ачих цэг</TableHead>
                            <TableHead>Буулгах цэг</TableHead>
                            <TableHead>Ачсан жин (тн)</TableHead>
                            <TableHead>Буулгасан жин (тн)</TableHead>
                            <TableHead>Зөрүү (тн)</TableHead>
                            <TableHead>Зам (км)</TableHead>
                            <TableHead>Явц</TableHead>
                            <TableHead className="text-right">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {executions.length > 0 ? executions.map(exec => {
                            const difference = (exec.totalLoadedWeight || 0) - (exec.totalUnloadedWeight || 0);
                            return (
                            <TableRow key={exec.id}>
                                <TableCell>
                                    <p className="font-medium">{exec.driverName || 'TBA'}</p>
                                    <p className="text-xs text-muted-foreground">{exec.vehicleLicense || 'TBA'}</p>
                                </TableCell>
                                <TableCell>{getStatusDate(exec, 'Loaded')}</TableCell>
                                <TableCell>{getStatusDate(exec, 'Delivered')}</TableCell>
                                <TableCell>{relatedData.startWarehouseName}</TableCell>
                                <TableCell>{relatedData.endWarehouseName}</TableCell>
                                <TableCell>{exec.totalLoadedWeight || '-'}</TableCell>
                                <TableCell>{exec.totalUnloadedWeight || '-'}</TableCell>
                                <TableCell className={cn(difference !== 0 && 'text-destructive font-bold')}>{difference.toFixed(2)}</TableCell>
                                <TableCell>{contract.route.totalDistance}</TableCell>
                                <TableCell><Badge variant="secondary">{statusTranslations[exec.status] || exec.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setExecutionToEdit(exec)}><Edit className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSendToSheet(exec)} disabled={sendingToSheet === exec.id}>
                                                {sendingToSheet === exec.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                                Sheet-рүү илгээх
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setExecutionToDelete(exec)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Устгах</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )}) : (
                            <TableRow>
                                <TableCell colSpan={11} className="h-24 text-center">Гүйцэтгэл бүртгэгдээгүй байна.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
            
        {/* Add New Execution Dialog */}
        <Dialog open={isNewExecutionDialogOpen} onOpenChange={setIsNewExecutionDialogOpen}>
            <DialogContent className="sm:max-w-xl">
                 <Form {...newExecutionForm}>
                    <form onSubmit={newExecutionForm.handleSubmit(handleNewExecutionSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Шинэ гүйцэтгэл нэмэх</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6 -mr-6">
                            <FormField control={newExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                             <FormField control={newExecutionForm.control} name="assignmentId" render={({ field }) => ( <FormItem><FormLabel>Жолооч + Машин</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Оноолт сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedDrivers.filter(d => d.assignedVehicleId).map(d => { const v = contract.assignedVehicles.find(v => v.vehicleId === d.assignedVehicleId); return ( <SelectItem key={d.driverId} value={d.driverId}>{d.driverName} / {v?.licensePlate}</SelectItem> )})}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            <Separator />

                            <FormField
                                control={newExecutionForm.control}
                                name="selectedCargo"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex justify-between items-center">
                                            <FormLabel>Ачаа сонгох</FormLabel>
                                            <span className="text-xs text-muted-foreground">Эсвэл ачаагүй хоосон явалт үүсгэх.</span>
                                        </div>
                                        <div className="space-y-2">
                                            {contract.cargoItems.map((item) => (
                                                <div key={item.id} className="flex flex-row items-center space-x-3 space-y-0 p-2 border rounded-md">
                                                    <Checkbox
                                                        id={`select-cargo-${item.id}`}
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), item.id])
                                                                : field.onChange(field.value?.filter((value) => value !== item.id))
                                                        }}
                                                    />
                                                    <Label htmlFor={`select-cargo-${item.id}`} className="font-normal w-full cursor-pointer">
                                                         {item.name} ({item.unit})
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                         <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsNewExecutionDialogOpen(false)}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Хадгалах</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>


        {/* Delete Execution Alert */}
        <AlertDialog open={!!executionToDelete} onOpenChange={(open) => !open && setExecutionToDelete(null)}>
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
                     <Form {...editExecutionForm}>
                        <form onSubmit={editExecutionForm.handleSubmit(handleUpdateExecution)}>
                            <DialogHeader>
                                <DialogTitle>Гүйцэтгэл засах</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <FormField control={editExecutionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                                <FormField control={editExecutionForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Оноосон жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="no-selection">Сонгоогүй</SelectItem>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                <FormField control={editExecutionForm.control} name="vehicleId" render={({ field }) => ( <FormItem><FormLabel>Оноосон тээврийн хэрэгсэл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Т/Х сонгох..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="no-selection">Сонгоогүй</SelectItem>{contract.assignedVehicles.map(v => <SelectItem key={v.vehicleId} value={v.vehicleId}>{v.licensePlate}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Хадгалах</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        )}

        
        {/* Add New Stop Dialog */}
        <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
             <DialogContent>
                <Form {...routeStopForm}>
                     <form onSubmit={routeStopForm.handleSubmit(onRouteStopSubmit)} id="route-stop-form">
                        <DialogHeader>
                            <DialogTitle>Маршрутын зогсоол нэмэх</DialogTitle>
                            <DialogDescription>Зогсоолын Нэр/ID талбар нь тухайн гэрээний хувьд давхцахгүй байх ёстойг анхаарна уу.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                                <FormField control={routeStopForm.control} name="id" render={({ field }) => ( <FormItem><FormLabel>Зогсоолын Нэр/ID</FormLabel><FormControl><Input placeholder="Даваа-1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={routeStopForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Input placeholder="Амрах, хооллох" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
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
                    <Form {...editStopForm}>
                        <form onSubmit={editStopForm.handleSubmit(handleUpdateStop)} id="edit-stop-form">
                            <DialogHeader><DialogTitle>Зогсоол засах</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                     <FormField control={editStopForm.control} name="id" render={({ field }) => ( <FormItem><FormLabel>Зогсоолын Нэр/ID</FormLabel><FormControl><Input {...field} readOnly disabled /></FormControl><FormMessage /></FormItem> )}/>
                                     <FormField control={editStopForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
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
                        "{stopToDelete?.id}" зогсоолыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
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
        
        {/* Load Cargo Dialog */}
        <AlertDialog open={isLoadCargoDialogOpen} onOpenChange={(open) => !open && setExecutionToLoad(null)}>
            <AlertDialogContent>
                    <div>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Ачааны мэдээлэл оруулах</AlertDialogTitle>
                            <AlertDialogDescription>
                               Ачсан нийт жинг тонн-оор оруулна уу.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                           <Input
                                type="number"
                                placeholder="Нийт жин (тн)"
                                value={totalLoadedWeight || ''}
                                onChange={(e) => setTotalLoadedWeight(Number(e.target.value))}
                           />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {setIsLoadCargoDialogOpen(false); setTotalLoadedWeight(0);}}>Цуцлах</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLoadCargoSubmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Хадгалах
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </div>
            </AlertDialogContent>
        </AlertDialog>

        {/* Unload Cargo Dialog */}
        <AlertDialog open={isUnloadCargoDialogOpen} onOpenChange={(open) => !open && setExecutionToUnload(null)}>
            <AlertDialogContent>
                    <div>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Буулгасан ачааны мэдээлэл</AlertDialogTitle>
                            <AlertDialogDescription>
                               Буулгасан нийт жинг тонн-оор оруулна уу.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                           <Input
                                type="number"
                                placeholder="Нийт жин (тн)"
                                value={totalUnloadedWeight || ''}
                                onChange={(e) => setTotalUnloadedWeight(Number(e.target.value))}
                           />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {setIsUnloadCargoDialogOpen(false); setTotalUnloadedWeight(0);}}>Цуцлах</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUnloadCargoSubmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Хадгалах
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </div>
            </AlertDialogContent>
        </AlertDialog>


        {/* Assigned Resources Dialog */}
        <Dialog open={isResourcesDialogOpen} onOpenChange={setIsResourcesDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Оноосон Жолооч ба Т/Х</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
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
                                            <CommandItem key={d.id} value={`${d.display_name} ${d.phone_number}`} onSelect={()={() => handleAddDriver(d.id)}} disabled={isSubmitting}>
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
                                            <CommandItem key={v.id} value={`${v.makeName} ${v.modelName} ${v.licensePlate}`} onSelect={()={() => handleAddVehicle(v.id)}} disabled={isSubmitting}>
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
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Хаах</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Assignments Dialog */}
        <AssignmentsDialog 
            open={isAssignmentsDialogOpen} 
            onOpenChange={setIsAssignmentsDialogOpen}
            contract={contract}
            onSave={handleSaveAssignments}
            isSubmitting={isSubmitting}
        />
    </div>
  );
}


function AssignmentsDialog({ open, onOpenChange, contract, onSave, isSubmitting }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: ContractedTransport | null;
    onSave: (assignments: AssignedDriver[]) => void;
    isSubmitting: boolean;
}) {
    const [assignments, setAssignments] = React.useState<AssignedDriver[]>([]);
    
    React.useEffect(() => {
        if (contract) {
            setAssignments(contract.assignedDrivers);
        }
    }, [contract]);

    if (!contract) return null;
    
    const handleVehicleChange = (driverId: string, vehicleId: string) => {
        setAssignments(prev => prev.map(driver => 
            driver.driverId === driverId 
            ? { ...driver, assignedVehicleId: vehicleId === 'none' ? undefined : vehicleId } 
            : driver
        ));
    };
    
    const availableVehicles = (driverId?: string) => {
        const assignedVehicleIds = assignments
            .filter(d => d.driverId !== driverId && d.assignedVehicleId)
            .map(d => d.assignedVehicleId);
            
        return contract.assignedVehicles.filter(v => !assignedVehicleIds.includes(v.vehicleId));
    };
    
    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Жолооч, Т/Х-ийн оноолт</DialogTitle>
                    <DialogDescription>
                        Энэ гэрээнд хамаарах жолоочдод тээврийн хэрэгслийг онооно уу.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                    {assignments.map(driver => (
                        <div key={driver.driverId} className="grid grid-cols-2 gap-4 items-center p-2 border rounded-md">
                           <div>
                                <p className="font-medium">{driver.driverName}</p>
                                <p className="text-xs text-muted-foreground">{driver.driverPhone}</p>
                           </div>
                           <Select 
                             value={driver.assignedVehicleId || 'none'}
                             onValueChange={(vehicleId) => handleVehicleChange(driver.driverId, vehicleId)}
                           >
                               <SelectTrigger>
                                   <SelectValue placeholder="Т/Х сонгох..."/>
                               </SelectTrigger>
                               <SelectContent>
                                   <SelectItem value="none">Оноогоогүй</SelectItem>
                                   {availableVehicles(driver.driverId).map(v => (
                                       <SelectItem key={v.vehicleId} value={v.vehicleId}>
                                            {v.licensePlate} ({v.modelName})
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button onClick={() => onSave(assignments)} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Хадгалах
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    


    