
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, CalendarIcon, Plus, Trash2, PlusCircle } from 'lucide-react';
import { collection, doc, getDoc, updateDoc, serverTimestamp, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import type { ContractedTransport, Customer, SystemUser, ServiceType, Region, Warehouse, PackagingType, ContractedTransportFrequency, ContractedTransportCargoItem } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import QuickAddDialog, { QuickAddDialogProps } from '@/components/quick-add-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';

const cargoItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Ачааны нэрийг оруулна уу."),
  unit: z.string().min(1, "Хэмжих нэгжийг оруулна уу."),
  packagingTypeId: z.string().min(1, "Баглаа боодол сонгоно уу."),
  notes: z.string().optional(),
  price: z.coerce.number().min(0, "Тээврийн хөлс 0-ээс бага байж болохгүй."),
});

const formSchema = z.object({
  title: z.string().min(2, { message: "Гэрээний гарчиг дор хаяж 2 үсэгтэй байх ёстой." }),
  customerId: z.string().min(1, { message: 'Харилцагч байгууллага сонгоно уу.' }),
  transportManagerId: z.string().min(1, { message: 'Тээврийн менежер сонгоно уу.'}),
  serviceTypeId: z.string().optional(),
  startRegionId: z.string().min(1, "Ачих бүс сонгоно уу."),
  startWarehouseId: z.string().min(1, "Ачих агуулах сонгоно уу."),
  endRegionId: z.string().min(1, "Буулгах бүс сонгоно уу."),
  endWarehouseId: z.string().min(1, "Буулгах агуулах сонгоно уу."),
  totalDistance: z.coerce.number().min(1, "Нийт замыг оруулна уу."),
  dateRange: z.object({
    from: z.date({ required_error: "Гэрээний эхлэх огноо сонгоно уу." }),
    to: z.date({ required_error: "Гэрээний дуусах огноо сонгоно уу." }),
  }),
  frequency: z.custom<ContractedTransportFrequency>(),
  customFrequencyDetails: z.string().optional(),
  cargoItems: z.array(cargoItemSchema).min(1, "Дор хаяж нэг ачаа нэмнэ үү."),
});

type FormValues = z.infer<typeof formSchema>;

const standardUnits = ["кг", "тн", "м3", "литр", "ш", "боодол", "хайрцаг"];
const frequencies: ContractedTransportFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Custom'];
const frequencyTranslations: Record<ContractedTransportFrequency, string> = {
    Daily: 'Өдөр бүр',
    Weekly: '7 хоног тутам',
    Monthly: 'Сар тутам',
    Custom: 'Бусад'
};

const toDateSafe = (date: any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    // Handle Firestore-like object structure from serialization
    if (typeof date === 'object' && date !== null && !Array.isArray(date) && 'seconds' in date && 'nanoseconds' in date) {
        return new Timestamp(date.seconds, date.nanoseconds).toDate();
    }
    // Basic check for string that could be a date
    if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return new Date(); 
};

export default function EditContractedTransportPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cargoItems"
  });

  React.useEffect(() => {
    async function fetchInitialData() {
        if (!id) return;
        setIsLoading(true);
        try {
            const [
                contractSnap, 
                customerSnap, 
                managerSnap, 
                serviceSnap, 
                regionSnap, 
                warehouseSnap, 
                packagingSnap
            ] = await Promise.all([
                getDoc(doc(db, "contracted_transports", id)),
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
            
            if (contractSnap.exists()) {
                const contractData = contractSnap.data() as ContractedTransport;
                form.reset({
                    title: contractData.title,
                    customerId: contractData.customerId,
                    transportManagerId: contractData.transportManagerId,
                    serviceTypeId: contractData.cargoItems[0]?.serviceTypeId || '', // Legacy support
                    startRegionId: contractData.route.startRegionId,
                    startWarehouseId: contractData.route.startWarehouseId,
                    endRegionId: contractData.route.endRegionId,
                    endWarehouseId: contractData.route.endWarehouseId,
                    totalDistance: contractData.route.totalDistance,
                    dateRange: {
                        from: toDateSafe(contractData.startDate),
                        to: toDateSafe(contractData.endDate),
                    },
                    frequency: contractData.frequency,
                    customFrequencyDetails: contractData.customFrequencyDetails || '',
                    cargoItems: contractData.cargoItems.map(item => ({...item, id: item.id || uuidv4()})),
                });
            } else {
                 toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээт тээвэр олдсонгүй.' });
                 router.push('/contracted-transport');
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.'});
        } finally {
            setIsLoading(false);
        }
    }
    fetchInitialData();
  }, [id, toast, router, form]);


  async function onSubmit(values: FormValues) {
    if (!id) return;
    setIsSubmitting(true);
    try {
        const contractRef = doc(db, 'contracted_transports', id);
        const selectedCustomer = customers.find(c => c.id === values.customerId);

        const dataToSave = {
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
            cargoItems: values.cargoItems.map(({id, ...item}) => item), // Remove client-side id before saving
            updatedAt: serverTimestamp(),
        };

        await updateDoc(contractRef, dataToSave);
      
        toast({
            title: 'Амжилттай шинэчиллээ',
            description: `${values.title} нэртэй гэрээт тээврийн мэдээллийг шинэчиллээ.`,
        });
        
        router.push(`/contracted-transport/${id}`);

    } catch (error) {
        console.error('Error updating contracted transport:', error);
        toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Гэрээт тээвэр шинэчлэхэд алдаа гарлаа. Та дахин оролдоно уу.',
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

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <Skeleton className="h-8 w-24 mb-4" />
                <Skeleton className="h-10 w-1/3 mb-6" />
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                    <CardContent className="space-y-8">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-40 w-full" />
                         <div className="flex justify-end gap-2">
                            <Skeleton className="h-10 w-20" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

  return (
    <div className="container mx-auto py-6">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                         <Button variant="outline" size="sm" asChild className="mb-4">
                            <Link href={`/contracted-transport/${id}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Буцах
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-headline font-bold">Гэрээт тээвэр засах</h1>
                        <p className="text-muted-foreground">
                        Гэрээний мэдээллийг өөрчилнө үү.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button type="button" variant="outline" asChild>
                            <Link href={`/contracted-transport/${id}`}>Цуцлах</Link>
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
                         {/* This field is for backwards compatibility. Might remove later. */}
                         {form.getValues('serviceTypeId') && <FormField control={form.control} name="serviceTypeId" render={({ field }) => (<FormItem><FormLabel>Үйлчилгээний төрөл (Legacy)</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('service_types', 'serviceTypeId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/> }
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
                        <CardTitle>Ачааны мэдээлэл ба Үнэ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-3 border rounded-md">
                                <FormField control={form.control} name={`cargoItems.${index}.name`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Нэр</FormLabel><FormControl><Input placeholder="Цемент" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`cargoItems.${index}.unit`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Нэгж</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Нэгж..." /></SelectTrigger></FormControl><SelectContent>{standardUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`cargoItems.${index}.packagingTypeId`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Баглаа</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{packagingTypes.map((p) => ( <SelectItem key={p.id} value={p.id}> {p.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('packaging_types', `cargoItems.${index}.packagingTypeId`)}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`cargoItems.${index}.price`} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel className="text-xs">Тээврийн хөлс (₮)</FormLabel><FormControl><Input type="number" placeholder="1500000" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name={`cargoItems.${index}.notes`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Тэмдэглэл</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="md:col-span-1 flex justify-end items-center h-full pt-6">
                                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                          </div>
                        ))}
                        </div>
                         <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ id: uuidv4(), name: '', unit: 'тн', packagingTypeId: '', notes: '', price: 0 })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Ачаа нэмэх
                        </Button>
                    </CardContent>
                 </Card>

            </form>
             {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
        </Form>
    </div>
  );
}
