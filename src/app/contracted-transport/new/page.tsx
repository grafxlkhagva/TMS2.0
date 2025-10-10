
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, CalendarIcon, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import type { Customer, CustomerEmployee, SystemUser, ServiceType, Region, Warehouse, PackagingType, ContractedTransportFrequency } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import QuickAddDialog, { QuickAddDialogProps } from '@/components/quick-add-dialog';


const formSchema = z.object({
  title: z.string().min(2, { message: "Гэрээний гарчиг дор хаяж 2 үсэгтэй байх ёстой." }),
  customerId: z.string().min(1, { message: 'Харилцагч байгууллага сонгоно уу.' }),
  transportManagerId: z.string().min(1, { message: 'Тээврийн менежер сонгоно уу.'}),
  serviceTypeId: z.string().min(1, "Үйлчилгээний төрөл сонгоно уу."),
  startRegionId: z.string().min(1, "Ачих бүс сонгоно уу."),
  startWarehouseId: z.string().min(1, "Ачих агуулах сонгоно уу."),
  endRegionId: z.string().min(1, "Буулгах бүс сонгоно уу."),
  endWarehouseId: z.string().min(1, "Буулгах агуулах сонгоно уу."),
  totalDistance: z.coerce.number().min(1, "Нийт замыг оруулна уу."),
  cargoName: z.string().min(2, "Ачааны нэрийг оруулна уу."),
  cargoUnit: z.string().min(1, "Ачааны нэгжийг оруулна уу."),
  packagingTypeId: z.string().min(1, "Баглаа боодол сонгоно уу."),
  cargoNotes: z.string().optional(),
  pricePerShipment: z.coerce.number().min(1, "Тээврийн хөлс оруулна уу."),
  dateRange: z.object({
    from: z.date({ required_error: "Гэрээний эхлэх огноо сонгоно уу." }),
    to: z.date({ required_error: "Гэрээний дуусах огноо сонгоно уу." }),
  }),
  frequency: z.custom<ContractedTransportFrequency>(),
  customFrequencyDetails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

async function generateContractNumber() {
    const counterRef = doc(db, 'counters', 'contractedTransportCounter');
    const newCount = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
            transaction.set(counterRef, { current: 1 });
            return 1;
        }
        const newCurrent = counterDoc.data().current + 1;
        transaction.update(counterRef, { current: newCurrent });
        return newCurrent;
    });
    const year = new Date().getFullYear();
    return `CT-${year}-${String(newCount).padStart(4, '0')}`;
}

const standardUnits = ["кг", "тн", "м3", "литр", "ш", "боодол", "хайрцаг"];
const frequencies: ContractedTransportFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Custom'];
const frequencyTranslations: Record<ContractedTransportFrequency, string> = {
    Daily: 'Өдөр бүр',
    Weekly: '7 хоног тутам',
    Monthly: 'Сар тутам',
    Custom: 'Бусад'
};


export default function NewContractedTransportPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data states
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transportManagers, setTransportManagers] = React.useState<SystemUser[]>([]);
  const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>([]);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
  const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    async function fetchInitialData() {
      try {
        const [customerSnap, managerSnap, serviceSnap, regionSnap, warehouseSnap, packagingSnap] = await Promise.all([
          getDocs(query(collection(db, "customers"), orderBy("name"))),
          getDocs(query(collection(db, "users"), where("role", "==", "transport_manager"))),
          getDocs(query(collection(db, "service_types"), orderBy("name"))),
          getDocs(query(collection(db, "regions"), orderBy("name"))),
          getDocs(query(collection(db, "warehouses"), orderBy("name"))),
          getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
        ]);

        setCustomers(customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        setTransportManagers(managerSnap.docs.map(doc => doc.data() as SystemUser));
        setServiceTypes(serviceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)));
        setRegions(regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)));
        setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
        setPackagingTypes(packagingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingType)));

      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.'});
      }
    }
    fetchInitialData();
  }, [toast]);


  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэвтэрч орсоны дараа үргэлжлүүлнэ үү.'});
      return;
    }
    setIsSubmitting(true);
    try {
        const contractNumber = await generateContractNumber();
        const selectedCustomer = customers.find(c => c.id === values.customerId);

        const dataToSave = {
            contractNumber,
            title: values.title,
            customerId: values.customerId,
            customerName: selectedCustomer?.name,
            customerRef: doc(db, 'customers', values.customerId),
            transportManagerId: values.transportManagerId,
            transportManagerRef: doc(db, 'users', values.transportManagerId),
            startDate: values.dateRange.from,
            endDate: values.dateRange.to,
            frequency: values.frequency,
            customFrequencyDetails: values.customFrequencyDetails,
            route: {
                startRegionId: values.startRegionId,
                startWarehouseId: values.startWarehouseId,
                endRegionId: values.endRegionId,
                endWarehouseId: values.endWarehouseId,
                totalDistance: values.totalDistance,
            },
            cargoInfo: {
                name: values.cargoName,
                unit: values.cargoUnit,
                packagingTypeId: values.packagingTypeId,
                notes: values.cargoNotes,
            },
            vehicleInfo: {
                vehicleTypeId: '', // These can be added later or in edit mode
                trailerTypeId: '',
            },
            pricePerShipment: values.pricePerShipment,
            status: 'Active',
            createdAt: serverTimestamp(),
            createdBy: {
                uid: user.uid,
                name: `${user.lastName} ${user.firstName}`,
            },
        };

        const docRef = await addDoc(collection(db, 'contracted_transports'), dataToSave);
      
        toast({
            title: 'Амжилттай бүртгэлээ',
            description: `${contractNumber} дугаартай гэрээт тээврийг системд бүртгэлээ.`,
        });
        
        router.push(`/contracted-transport`);

    } catch (error) {
        console.error('Error creating contracted transport:', error);
        toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Гэрээт тээвэр бүртгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleQuickAdd = (type: 'regions' | 'service_types' | 'packaging_types' | 'warehouses', formField: any) => {
        setDialogProps({
            open: true,
            collectionName: type,
            title: `Шинэ ${type} нэмэх`,
            isWarehouse: type === 'warehouses',
            onSuccess: (newItem) => {
                switch(type) {
                    case 'regions': setRegions(prev => [...prev, newItem as Region]); break;
                    case 'service_types': setServiceTypes(prev => [...prev, newItem as ServiceType]); break;
                    case 'packaging_types': setPackagingTypes(prev => [...prev, newItem as PackagingType]); break;
                    case 'warehouses': setWarehouses(prev => [...prev, newItem as Warehouse]); break;
                }
                form.setValue(formField, newItem.id);
                setDialogProps(null);
            }
        });
    };

  return (
    <div className="container mx-auto py-6">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                         <Button variant="outline" size="sm" asChild className="mb-4">
                            <Link href="/contracted-transport">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Буцах
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-headline font-bold">Шинэ гэрээт тээвэр</h1>
                        <p className="text-muted-foreground">
                        Урт хугацааны гэрээний мэдээллийг оруулна уу.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button type="button" variant="outline" asChild>
                            <Link href="/contracted-transport">Цуцлах</Link>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Хадгалах
                        </Button>
                    </div>
                </div>
            
                <Card>
                    <CardHeader>
                        <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Гэрээний гарчиг / Ажлын нэр</FormLabel><FormControl><Input placeholder="Цемент тээвэрлэлтийн урт хугацааны гэрээ" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField control={form.control} name="customerId" render={({ field }) => ( <FormItem><FormLabel>Харилцагч байгууллага</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Байгууллага сонгох..." /></SelectTrigger></FormControl><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                           <FormField control={form.control} name="transportManagerId" render={({ field }) => ( <FormItem><FormLabel>Тээврийн менежер</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Менежер сонгох..." /></SelectTrigger></FormControl><SelectContent>{transportManagers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.lastName} {m.firstName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Хугацаа ба Давтамж</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <FormField control={form.control} name="dateRange" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Гэрээний хугацаа</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value?.from && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? (<>{format(field.value.from, 'LLL dd, y')} - {format(field.value.to, 'LLL dd, y')}</>) : (format(field.value.from, 'LLL dd, y'))) : (<span>Огноо сонгох</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value} onSelect={field.onChange} numberOfMonths={2} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="frequency" render={({ field }) => ( <FormItem><FormLabel>Давтамж</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Давтамж сонгох..." /></SelectTrigger></FormControl><SelectContent>{frequencies.map(f => <SelectItem key={f} value={f}>{frequencyTranslations[f]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            {form.watch('frequency') === 'Custom' && (
                                <FormField control={form.control} name="customFrequencyDetails" render={({ field }) => ( <FormItem><FormLabel>Давтамжийн тайлбар</FormLabel><FormControl><Input placeholder="Мягмар, Пүрэв гарагт" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            )}
                         </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Чиглэл ба Үйлчилгээ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="serviceTypeId" render={({ field }) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('service_types', 'serviceTypeId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                        <Separator/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="startRegionId" render={({ field }) => ( <FormItem><FormLabel>Ачих бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('regions', 'startRegionId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="startWarehouseId" render={({ field }) => ( <FormItem><FormLabel>Ачих агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('warehouses', 'startWarehouseId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="endRegionId" render={({ field }) => ( <FormItem><FormLabel>Буулгах бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('regions', 'endRegionId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="endWarehouseId" render={({ field }) => ( <FormItem><FormLabel>Буулгах агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('warehouses', 'endWarehouseId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="totalDistance" render={({ field }) => ( <FormItem><FormLabel>Нийт зам (км)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Ачаа ба Үнэ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField control={form.control} name="cargoName" render={({ field }) => ( <FormItem><FormLabel>Ачааны нэр</FormLabel><FormControl><Input placeholder="Цемент" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="cargoUnit" render={({ field }) => ( <FormItem><FormLabel>Хэмжих нэгж</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Нэгж..." /></SelectTrigger></FormControl><SelectContent>{standardUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="packagingTypeId" render={({ field }) => ( <FormItem><FormLabel>Баглаа боодол</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{packagingTypes.map((p) => ( <SelectItem key={p.id} value={p.id}> {p.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('packaging_types', `packagingTypeId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="cargoNotes" render={({ field }) => ( <FormItem><FormLabel>Ачааны тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <Separator/>
                        <FormField control={form.control} name="pricePerShipment" render={({ field }) => ( <FormItem><FormLabel>Нэг удаагийн тээврийн хөлс (₮)</FormLabel><FormControl><Input type="number" placeholder="1500000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </CardContent>
                 </Card>

            </form>
             {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
        </Form>
    </div>
  );
}

    