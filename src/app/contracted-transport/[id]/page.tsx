

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, User, Truck, MapPin, Package, CircleDollarSign, CheckCircle, XCircle, Clock, PlusCircle, Trash2, Loader2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ContractedTransport, Region, Warehouse, PackagingType, SystemUser, ContractedTransportFrequency, Driver } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useForm } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractExecution {
    id: string;
    date: Date;
    vehicleLicense?: string;
    driverId?: string;
    driverName: string;
    price: number;
    notes?: string;
    createdAt: Date;
}

const executionFormSchema = z.object({
  date: z.date({ required_error: "Огноо сонгоно уу." }),
  driverId: z.string().optional(),
  driverName: z.string().min(1, "Жолоочийн нэрийг оруулна уу."),
  vehicleLicense: z.string().optional(),
  price: z.coerce.number().min(0, "Үнийн дүн 0-ээс бага байж болохгүй."),
  notes: z.string().optional(),
});
type ExecutionFormValues = z.infer<typeof executionFormSchema>;


const frequencyTranslations: Record<ContractedTransportFrequency, string> = {
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
  if (!value) return null;
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
  const { toast } = useToast();
  const [contract, setContract] = React.useState<ContractedTransport | null>(null);
  const [executions, setExecutions] = React.useState<ContractExecution[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmittingExecution, setIsSubmittingExecution] = React.useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = React.useState(false);
  const [executionToDelete, setExecutionToDelete] = React.useState<ContractExecution | null>(null);
  const [isAddingDriver, setIsAddingDriver] = React.useState(false);
  const [addDriverPopoverOpen, setAddDriverPopoverOpen] = React.useState(false);


  
  const [relatedData, setRelatedData] = React.useState({
      startRegionName: '',
      endRegionName: '',
      startWarehouseName: '',
      endWarehouseName: '',
      packagingTypeName: '',
      transportManagerName: '',
  });

  const executionForm = useForm<ExecutionFormValues>({
    resolver: zodResolver(executionFormSchema),
    defaultValues: {
      date: new Date(),
      vehicleLicense: '',
      driverId: '',
      driverName: '',
      price: contract?.pricePerShipment || 0,
      notes: '',
    },
  });
  
  const assignedDriverIds = React.useMemo(() => {
    return contract?.assignedDrivers.map(d => d.driverId) || [];
  }, [contract]);

  React.useEffect(() => {
    if (contract) {
        executionForm.reset({
            date: new Date(),
            vehicleLicense: '',
            driverId: '',
            driverName: '',
            price: contract.pricePerShipment,
            notes: '',
        });
    }
  }, [contract, isExecutionDialogOpen, executionForm]);


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
      } as ContractedTransport;
      setContract(fetchedContract);
      
      const [
          startRegionSnap, 
          endRegionSnap, 
          startWarehouseSnap, 
          endWarehouseSnap, 
          packagingTypeSnap,
          managerSnap,
          executionsSnap,
          driversSnap,
      ] = await Promise.all([
          getDoc(doc(db, 'regions', fetchedContract.route.startRegionId)),
          getDoc(doc(db, 'regions', fetchedContract.route.endRegionId)),
          getDoc(doc(db, 'warehouses', fetchedContract.route.startWarehouseId)),
          getDoc(doc(db, 'warehouses', fetchedContract.route.endWarehouseId)),
          getDoc(doc(db, 'packaging_types', fetchedContract.cargoInfo.packagingTypeId)),
          getDoc(doc(db, 'users', fetchedContract.transportManagerId)),
          getDocs(query(collection(db, 'contracted_transport_executions'), where('contractId', '==', id))),
          getDocs(query(collection(db, "Drivers"), where('status', '==', 'Active'))),
      ]);
      
      setDrivers(driversSnap.docs.map(d => ({id: d.id, ...d.data()} as Driver)));

      setRelatedData({
          startRegionName: startRegionSnap.data()?.name || '',
          endRegionName: endRegionSnap.data()?.name || '',
          startWarehouseName: startWarehouseSnap.data()?.name || '',
          endWarehouseName: endWarehouseSnap.data()?.name || '',
          packagingTypeName: packagingTypeSnap.data()?.name || '',
          transportManagerName: `${managerSnap.data()?.lastName || ''} ${managerSnap.data()?.firstName || ''}`,
      })
      
       const executionsData = executionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date.toDate(),
            createdAt: doc.data().createdAt.toDate(),
        } as ContractExecution));

        executionsData.sort((a, b) => b.date.getTime() - a.date.getTime());
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

   const onExecutionSubmit = async (values: ExecutionFormValues) => {
        if (!id) return;
        setIsSubmittingExecution(true);
        try {
            
            const driverId = values.driverId;
            let driverName = values.driverName;
            
            if (driverId) {
                const selectedDriver = contract?.assignedDrivers.find(d => d.driverId === driverId);
                if (selectedDriver) {
                    driverName = selectedDriver.driverName;
                }
            }

            await addDoc(collection(db, 'contracted_transport_executions'), {
                ...values,
                driverName,
                contractId: id,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Гүйцэтгэл нэмэгдлээ.' });
            setIsExecutionDialogOpen(false);
            fetchContractData(); // Refetch all data
        } catch (error) {
            console.error("Error adding execution:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэл нэмэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmittingExecution(false);
        }
    };
    
    const handleDeleteExecution = async () => {
        if (!executionToDelete) return;
        try {
            await deleteDoc(doc(db, 'contracted_transport_executions', executionToDelete.id));
            toast({ title: 'Амжилттай', description: 'Гүйцэтгэл устгагдлаа.' });
            setExecutions(prev => prev.filter(ex => ex.id !== executionToDelete.id));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гүйцэтгэл устгахад алдаа гарлаа.' });
        } finally {
            setExecutionToDelete(null);
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
            fetchContractData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч нэмэхэд алдаа гарлаа.'});
        } finally {
            setIsAddingDriver(false);
        }
    };
    
    const handleRemoveDriver = async (driverToRemove: {driverId: string}) => {
        if (!id) return;
        try {
            const contractRef = doc(db, 'contracted_transports', id);
            await updateDoc(contractRef, {
                 assignedDrivers: arrayRemove(contract.assignedDrivers.find(d => d.driverId === driverToRemove.driverId))
            });
            toast({ title: "Амжилттай", description: "Жолоочийг хаслаа."});
            fetchContractData();
        } catch(error) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч хасахад алдаа гарлаа.'});
        }
    }


  if (isLoading) {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6"><Skeleton className="h-8 w-24 mb-4" /><Skeleton className="h-8 w-1/3" /></div>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-40 w-full"/></CardContent></Card>
                </div>
                <div className="space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-32 w-full"/></CardContent></Card>
                </div>
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
             <Button asChild>
                <Link href={`/contracted-transport/${id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Засварлах
                </Link>
            </Button>
        </div>
      </div>
       <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Чиглэл ба Ачааны мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                        <DetailItem icon={MapPin} label="Ачих цэг" value={`${relatedData.startRegionName}, ${relatedData.startWarehouseName}`}/>
                        <DetailItem icon={MapPin} label="Буулгах цэг" value={`${relatedData.endRegionName}, ${relatedData.endWarehouseName}`}/>
                        <DetailItem icon={Truck} label="Нийт зам" value={`${contract.route.totalDistance} км`}/>
                    </div>
                    <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                        <DetailItem icon={Package} label="Ачааны нэр" value={contract.cargoInfo.name}/>
                        <DetailItem icon={Package} label="Нэгж" value={contract.cargoInfo.unit}/>
                        <DetailItem icon={Package} label="Баглаа боодол" value={relatedData.packagingTypeName}/>
                        <DetailItem icon={Package} label="Ачааны тэмдэглэл" value={contract.cargoInfo.notes}/>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Тээвэрлэлтийн гүйцэтгэл</CardTitle>
                        <CardDescription>Энэ гэрээний дагуу хийгдсэн тээвэрлэлтүүд.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsExecutionDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Гүйцэтгэл нэмэх
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Огноо</TableHead>
                                <TableHead>Машины дугаар</TableHead>
                                <TableHead>Жолооч</TableHead>
                                <TableHead>Үнэ</TableHead>
                                <TableHead className="text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {executions.length > 0 ? (
                                executions.map((ex) => (
                                    <TableRow key={ex.id}>
                                        <TableCell>{format(ex.date, 'yyyy-MM-dd')}</TableCell>
                                        <TableCell className="font-mono">{ex.vehicleLicense}</TableCell>
                                        <TableCell>{ex.driverName}</TableCell>
                                        <TableCell>{ex.price.toLocaleString()}₮</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setExecutionToDelete(ex)}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Гүйцэтгэл бүртгэгдээгүй байна.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
        <div className="space-y-6 sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={User} label="Харилцагч" value={contract.customerName} />
                    <DetailItem icon={User} label="Тээврийн менежер" value={relatedData.transportManagerName} />
                    <Separator/>
                    <DetailItem icon={Calendar} label="Гэрээний хугацаа" value={`${format(contract.startDate, 'yyyy-MM-dd')} - ${format(contract.endDate, 'yyyy-MM-dd')}`} />
                    <DetailItem icon={Calendar} label="Давтамж" value={contract.frequency === 'Custom' ? `${frequencyTranslations[contract.frequency]} (${contract.customFrequencyDetails})` : frequencyTranslations[contract.frequency]} />
                     <Separator/>
                    <DetailItem icon={CircleDollarSign} label="Нэг удаагийн тээврийн хөлс" value={`${contract.pricePerShipment.toLocaleString()}₮`} />
                     <Separator/>
                    <DetailItem icon={statusInfo.icon} label="Статус" value={<Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>} />
                    <DetailItem icon={Calendar} label="Бүртгэсэн огноо" value={format(contract.createdAt, 'yyyy-MM-dd HH:mm')} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Оноосон жолооч нар</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {contract.assignedDrivers.length > 0 ? (
                        contract.assignedDrivers.map(driver => (
                            <div key={driver.driverId} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted">
                                <div>
                                    <p className="font-medium">{driver.driverName}</p>
                                    <p className="text-xs text-muted-foreground">{driver.driverPhone}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveDriver(driver)}>
                                    <XCircle className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">Жолооч оноогоогүй байна.</p>
                    )}
                </CardContent>
                <CardFooter>
                     <Popover open={addDriverPopoverOpen} onOpenChange={setAddDriverPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Жолооч нэмэх
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Жолооч хайх..."/>
                                <CommandList>
                                    <CommandEmpty>Олдсонгүй.</CommandEmpty>
                                    <CommandGroup>
                                        {drivers.filter(d => !assignedDriverIds.includes(d.id)).map(d => (
                                            <CommandItem
                                                key={d.id}
                                                value={`${d.display_name} ${d.phone_number}`}
                                                onSelect={() => handleAddDriver(d.id)}
                                                disabled={isAddingDriver}
                                            >
                                                <CheckIcon className={cn("mr-2 h-4 w-4", "opacity-0")}/>
                                                <span>{d.display_name} ({d.phone_number})</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                     </Popover>
                </CardFooter>
            </Card>
        </div>
       </div>

        <Dialog open={isExecutionDialogOpen} onOpenChange={setIsExecutionDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Шинэ гүйцэтгэл нэмэх</DialogTitle>
                </DialogHeader>
                <Form {...executionForm}>
                    <form onSubmit={executionForm.handleSubmit(onExecutionSubmit)} className="space-y-4 py-4" id="execution-form">
                         <FormField control={executionForm.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'yyyy-MM-dd') : <span>Огноо сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )}/>
                         {contract.assignedDrivers.length > 0 ? (
                            <FormField control={executionForm.control} name="driverId" render={({ field }) => ( <FormItem><FormLabel>Жолооч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger></FormControl><SelectContent>{contract.assignedDrivers.map(d => <SelectItem key={d.driverId} value={d.driverId}>{d.driverName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                         ) : (
                            <FormField control={executionForm.control} name="driverName" render={({ field }) => ( <FormItem><FormLabel>Жолоочийн нэр</FormLabel><FormControl><Input placeholder="Б.Болд" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         )}
                         <FormField control={executionForm.control} name="vehicleLicense" render={({ field }) => ( <FormItem><FormLabel>Машины дугаар</FormLabel><FormControl><Input placeholder="0000 УБA" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={executionForm.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Тээврийн хөлс (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                         <FormField control={executionForm.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </form>
                </Form>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Цуцлах</Button></DialogClose>
                    <Button type="submit" form="execution-form" disabled={isSubmittingExecution}>
                        {isSubmittingExecution && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
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
                    <AlertDialogAction onClick={handleDeleteExecution} className="bg-destructive hover:bg-destructive/90">Устгах</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
