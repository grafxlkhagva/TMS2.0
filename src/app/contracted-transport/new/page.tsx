
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, CalendarIcon, Plus, Trash2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import type { Customer, SystemUser, ServiceType, Region, Warehouse, PackagingType, ContractedTransportFrequency, ContractedTransportCargoItem } from '@/types';
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
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import QuickAddDialog, { QuickAddDialogProps } from '@/components/quick-add-dialog';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const cargoItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Ачааны нэрийг оруулна уу."),
  unit: z.string().min(1, "Хэмжих нэгжийг оруулна уу."),
  packagingTypeId: z.string().min(1, "Баглаа боодол сонгоно уу."),
  notes: z.string().optional(),
  driverPrice: z.coerce.number().min(0, "Үнэ 0-ээс бага байж болохгүй."),
  mainContractorPrice: z.coerce.number().min(0, "Үнэ 0-ээс бага байж болохгүй.").optional(),
  ourPrice: z.coerce.number().min(0, "Үнэ 0-ээс бага байж болохгүй.").optional(),
  color: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(2, { message: "Гэрээний гарчиг дор хаяж 2 үсэгтэй байх ёстой." }),
  customerId: z.string().min(1, { message: 'Харилцагч байгууллага сонгоно уу.' }),
  transportManagerId: z.string().min(1, { message: 'Тээврийн менежер сонгоно уу.' }),
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
  const [currentStep, setCurrentStep] = React.useState(0);

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transportManagers, setTransportManagers] = React.useState<SystemUser[]>([]);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
  const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      customerId: '',
      transportManagerId: '',
      startRegionId: '',
      startWarehouseId: '',
      endRegionId: '',
      endWarehouseId: '',
      totalDistance: 0,
      dateRange: { from: undefined, to: undefined } as any,
      frequency: undefined,
      customFrequencyDetails: '',
      cargoItems: [{ id: uuidv4(), name: '', unit: 'тн', packagingTypeId: '', notes: '', driverPrice: 0, mainContractorPrice: 0, ourPrice: 0, color: '#3b82f6' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cargoItems"
  });

  React.useEffect(() => {
    async function fetchInitialData() {
      try {
        const [customerSnap, managerSnap, regionSnap, warehouseSnap, packagingSnap] = await Promise.all([
          getDocs(query(collection(db, "customers"), orderBy("name"))),
          getDocs(query(collection(db, "users"), where("role", "in", ["transport_manager", "admin"]))),
          getDocs(query(collection(db, "regions"), orderBy("name"))),
          getDocs(query(collection(db, "warehouses"), orderBy("name"))),
          getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
        ]);

        setCustomers(customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        setTransportManagers(managerSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as SystemUser)));
        setRegions(regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)));
        setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
        setPackagingTypes(packagingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingType)));

      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      }
    }
    fetchInitialData();
  }, [toast]);

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 0) fieldsToValidate = ['title', 'customerId', 'transportManagerId'];
    if (currentStep === 1) fieldsToValidate = ['startRegionId', 'startWarehouseId', 'endRegionId', 'endWarehouseId', 'totalDistance', 'dateRange', 'frequency'];
    if (currentStep === 2) fieldsToValidate = ['cargoItems'];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  async function onSubmit(values: FormValues) {
    if (!user) return;
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
        cargoItems: values.cargoItems,
        status: 'Active',
        createdAt: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
        assignedDrivers: [],
        assignedVehicles: [],
        routeStops: [],
      };

      await addDoc(collection(db, 'contracted_transports'), dataToSave);
      toast({ title: 'Амжилттай бүртгэлээ', description: `${contractNumber} дугаартай гэрээг бүртгэлээ.` });
      router.push(`/contracted-transport`);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Бүртгэлд алдаа гарлаа.' });
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
        switch (type) {
          case 'regions': setRegions(prev => [...prev, newItem as Region]); break;
          case 'packaging_types': setPackagingTypes(prev => [...prev, newItem as PackagingType]); break;
          case 'warehouses': setWarehouses(prev => [...prev, newItem as Warehouse]); break;
        }
        form.setValue(formField, newItem.id);
        setDialogProps(null);
      }
    });
  };

  const steps = [
    { label: 'Ерөнхий', description: 'Гэрээний үндсэн мэдээлэл' },
    { label: 'Чиглэл', description: 'Зам ба Давтамж' },
    { label: 'Ачаа', description: 'Үнэ ба Төрөл' },
    { label: 'Хянах', description: 'Баталгаажуулах' }
  ];

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/contracted-transport">
              <ArrowLeft className="mr-2 h-4 w-4" /> Буцах
            </Link>
          </Button>
          <h1 className="text-3xl font-headline font-bold">Шинэ гэрээт тээвэр</h1>
          <p className="text-muted-foreground">Бүртгэлийг алхам алхмаар гүйцэтгэнэ үү.</p>
        </div>
      </div>

      {/* Stepper Grid Container */}
      <div className="mb-10 grid grid-cols-4 gap-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            <div className={cn(
              "h-1.5 rounded-full transition-colors",
              currentStep === idx ? "bg-primary" : currentStep > idx ? "bg-green-500" : "bg-muted"
            )} />
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-bold",
                currentStep >= idx ? "text-foreground" : "text-muted-foreground"
              )}>0{idx + 1}</span>
              <span className={cn(
                "text-xs font-semibold truncate",
                currentStep === idx ? "text-primary" : "text-muted-foreground"
              )}>{step.label}</span>
              {currentStep > idx && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 0: General */}
          {currentStep === 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                <CardDescription>Гэрээний нэр болон хариуцах эзнийг сонгоно уу.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гэрээний гарчиг / Ажлын нэр</FormLabel>
                    <FormControl><Input placeholder="Жишээ: Цемент тээвэрлэлтийн гэрээ" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Харилцагч байгууллага</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl>
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="transportManagerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тээврийн менежер</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl>
                        <SelectContent>{transportManagers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.lastName} {m.firstName}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 1: Route & Frequency */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Чиглэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    <div className="space-y-4">
                      <div className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> АЧИХ ЦЭГ</div>
                      <FormField control={form.control} name="startRegionId" render={({ field }) => (
                        <FormItem><FormLabel>Бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('regions', 'startRegionId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="startWarehouseId" render={({ field }) => (
                        <FormItem><FormLabel>Агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{warehouses.filter(w => !form.watch('startRegionId') || w.regionId === form.watch('startRegionId')).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('warehouses', 'startWarehouseId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>
                      )} />
                    </div>

                    <div className="space-y-4">
                      <div className="text-xs font-bold text-green-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-600" /> БУУЛГАХ ЦЭГ</div>
                      <FormField control={form.control} name="endRegionId" render={({ field }) => (
                        <FormItem><FormLabel>Бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('regions', 'endRegionId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="endWarehouseId" render={({ field }) => (
                        <FormItem><FormLabel>Агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{warehouses.filter(w => !form.watch('endRegionId') || w.regionId === form.watch('endRegionId')).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('warehouses', 'endWarehouseId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                  <Separator />
                  <FormField control={form.control} name="totalDistance" render={({ field }) => (
                    <FormItem className="max-w-[200px]"><FormLabel>Нийт зам (км)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader><CardTitle>Хугацаа ба Давтамж</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="dateRange" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Гэрээний хугацаа</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? <>{format(field.value.from, 'yyyy-MM-dd')} - {format(field.value.to, 'yyyy-MM-dd')}</> : format(field.value.from, 'yyyy-MM-dd')) : <span>Хугацаа сонгох</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" selected={field.value} onSelect={field.onChange} numberOfMonths={2} /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <div className="space-y-4">
                    <FormField control={form.control} name="frequency" render={({ field }) => (
                      <FormItem><FormLabel>Давтамж</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{frequencies.map(f => <SelectItem key={f} value={f}>{frequencyTranslations[f]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    {form.watch('frequency') === 'Custom' && (
                      <FormField control={form.control} name="customFrequencyDetails" render={({ field }) => (<FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Input placeholder="Жишээ: 14 хоногт нэг удаа" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: Cargo */}
          {currentStep === 2 && (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Ачааны мэдээлэл</CardTitle>
                  <CardDescription>Тээвэрлэх ачаа ба нэгжийн үнийг тохируулна.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), name: '', unit: 'тн', packagingTypeId: '', notes: '', driverPrice: 0, mainContractorPrice: 0, ourPrice: 0, color: '#3b82f6' })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Нэмэх
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-slate-50/50 relative group">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField control={form.control} name={`cargoItems.${index}.name`} render={({ field }) => (
                        <FormItem><FormLabel>Ачаа</FormLabel><FormControl><Input placeholder="Жишээ: Баяжмал" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`cargoItems.${index}.unit`} render={({ field }) => (
                        <FormItem><FormLabel>Нэгж</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{standardUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`cargoItems.${index}.packagingTypeId`} render={({ field }) => (
                        <FormItem><FormLabel>Баглаа</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger></FormControl><SelectContent>{packagingTypes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('packaging_types', `cargoItems.${index}.packagingTypeId`)}><Plus className="h-3 w-3" /></Button></div><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                      <FormField control={form.control} name={`cargoItems.${index}.driverPrice`} render={({ field }) => (
                        <FormItem><FormLabel className="text-blue-600">Жолооч (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`cargoItems.${index}.mainContractorPrice`} render={({ field }) => (
                        <FormItem><FormLabel className="text-orange-600">ЕР.Гүйцэтгэгч (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`cargoItems.${index}.ourPrice`} render={({ field }) => (
                        <FormItem><FormLabel className="text-green-600 font-bold">Бидний үнэ (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card className="border-primary/20 shadow-md overflow-hidden">
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /> Мэдээлэл хянах</h3>
                </div>
                <CardContent className="p-6 space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Гэрээний нэр</p>
                      <p className="text-xl font-bold">{form.watch('title')}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Харилцагч:</span> <span className="font-semibold">{customers.find(c => c.id === form.watch('customerId'))?.name}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Хугацаа:</span> <span className="font-semibold">{format(form.watch('dateRange.from'), 'yyyy.MM.dd')} - {format(form.watch('dateRange.to'), 'yyyy.MM.dd')}</span></div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Маршрут</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm font-bold"><div className="w-2 h-2 rounded-full bg-blue-600" /> {warehouses.find(w => w.id === form.watch('startWarehouseId'))?.name}</div>
                        <div className="w-0.5 h-4 bg-slate-200 ml-0.75" />
                        <div className="flex items-center gap-2 text-sm font-bold"><div className="w-2 h-2 rounded-full bg-green-600" /> {warehouses.find(w => w.id === form.watch('endWarehouseId'))?.name}</div>
                        <div className="mt-2 text-xs text-primary font-bold">{form.watch('totalDistance')} км</div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Ачаа ба Үнэ</p>
                    <Table>
                      <TableHeader><TableRow><TableHead>Ачаа</TableHead><TableHead className="text-right">Жолооч</TableHead><TableHead className="text-right">Бидний үнэ</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {form.watch('cargoItems').map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold">{item.name} ({item.unit})</TableCell>
                            <TableCell className="text-right text-xs">₮{item.driverPrice?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-bold text-primary">₮{item.ourPrice?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t mt-12 pb-12">
            <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
              {currentStep === 0 ? 'Цуцлах' : 'Өмнөх'}
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={nextStep}>
                Дараах алхам
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Бүртгэл дуусгах
              </Button>
            )}
          </div>
        </form>
      </Form>
      {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
    </div>
  );
}
