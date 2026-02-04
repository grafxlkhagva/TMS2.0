
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, getDocs, updateDoc, writeBatch, serverTimestamp, Timestamp, where, deleteDoc, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { OrderItem, OrderItemCargo, Warehouse, ServiceType, VehicleType, TrailerType, Region, PackagingType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, CalendarIcon, Loader2, Plus, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import QuickAddDialog, { type QuickAddDialogProps } from '@/components/quick-add-dialog';
import { Checkbox } from '@/components/ui/checkbox';


const cargoItemSchema = z.object({
    id: z.string().optional(), // Keep track of existing items
    name: z.string().min(2, "Ачааны нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
    quantity: z.coerce.number().min(0.1, "Тоо хэмжээг оруулна уу."),
    unit: z.string().min(1, "Хэмжих нэгжийг оруулна уу."),
    packagingTypeId: z.string().min(1, "Баглаа боодол сонгоно уу."),
    notes: z.string().optional(),
});

const formSchema = z.object({
    serviceTypeId: z.string().min(1, "Үйлчилгээний төрөл сонгоно уу."),
    frequency: z.coerce.number().min(1, "Давтамж дор хаяж 1 байх ёстой."),
    startRegionId: z.string().min(1, "Ачих бүс сонгоно уу."),
    startWarehouseId: z.string().min(1, "Ачих агуулах сонгоно уу."),
    endRegionId: z.string().min(1, "Буулгах бүс сонгоно уу."),
    endWarehouseId: z.string().min(1, "Буулгах агуулах сонгоно уу."),
    totalDistance: z.coerce.number().min(1, "Нийт зайг оруулна уу."),
    loadingDateTime: z.date({ required_error: "Ачих огноо, цаг сонгоно уу." }),
    unloadingDateTime: z.date({ required_error: "Буулгах огноо, цаг сонгоно уу." }),
    vehicleTypeId: z.string().min(1, "Машины төрөл сонгоно уу."),
    trailerTypeId: z.string().min(1, "Тэвшний төрөл сонгоно уу."),
    profitMargin: z.coerce.number().min(0, "Ашгийн хувь 0-аас багагүй байна.").max(100, "Ашгийн хувь 100-аас ихгүй байна.").optional(),
    withVAT: z.boolean().optional(),
    tenderStatus: z.enum(['Open', 'Closed']).optional(),
    cargoItems: z.array(cargoItemSchema).min(1, "Дор хаяж нэг ачаа нэмнэ үү."),
});

type FormValues = z.infer<typeof formSchema>;


export default function EditOrderItemPage() {
    const { id: orderId, itemId } = useParams<{ id: string, itemId: string }>();
    const router = useRouter();
    const { toast } = useToast();

    // Data states
    const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
    const [regions, setRegions] = React.useState<Region[]>([]);
    const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>([]);
    const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
    const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
    const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
    const [cargoToDelete, setCargoToDelete] = React.useState<string[]>([]);

    // Control states
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "cargoItems"
    });

    React.useEffect(() => {
        if (!itemId) return;

        async function fetchInitialData() {
            setIsLoading(true);
            try {
                const [itemSnap, cargoSnap, warehouseSnap, serviceTypeSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap] = await Promise.all([
                    getDoc(doc(db, 'order_items', itemId)),
                    getDocs(query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', itemId))),
                    getDocs(query(collection(db, "warehouses"), orderBy("name"))),
                    getDocs(query(collection(db, "service_types"), orderBy("name"))),
                    getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
                    getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
                    getDocs(query(collection(db, "regions"), orderBy("name"))),
                    getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
                ]);

                // Populate dropdown data
                setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
                setServiceTypes(serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)));
                setVehicleTypes(vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)));
                setTrailerTypes(trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)));
                setRegions(regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)));
                setPackagingTypes(packagingTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingType)));

                // Populate form with item data
                if (itemSnap.exists()) {
                    const itemData = itemSnap.data() as OrderItem;
                    const cargoData = cargoSnap.docs.map(d => ({ id: d.id, ...d.data() }) as OrderItemCargo);

                    form.reset({
                        serviceTypeId: itemData.serviceTypeId,
                        frequency: itemData.frequency,
                        startRegionId: itemData.startRegionId,
                        startWarehouseId: itemData.startWarehouseId,
                        endRegionId: itemData.endRegionId,
                        endWarehouseId: itemData.endWarehouseId,
                        totalDistance: itemData.totalDistance,
                        vehicleTypeId: itemData.vehicleTypeId,
                        trailerTypeId: itemData.trailerTypeId,
                        profitMargin: itemData.profitMargin || 0,
                        withVAT: itemData.withVAT || false,
                        tenderStatus: itemData.tenderStatus || 'Closed',
                        loadingDateTime: itemData.loadingStartDate instanceof Timestamp ? itemData.loadingStartDate.toDate() : itemData.loadingStartDate,
                        unloadingDateTime: itemData.unloadingStartDate instanceof Timestamp ? itemData.unloadingStartDate.toDate() : itemData.unloadingStartDate,
                        cargoItems: cargoData.map(c => ({
                            id: c.id,
                            name: c.name,
                            quantity: c.quantity,
                            unit: c.unit,
                            packagingTypeId: c.packagingTypeId,
                            notes: c.notes || '',
                        })),
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт олдсонгүй.' });
                    router.push(`/orders/${orderId}`);
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
            } finally {
                setIsLoading(false);
            }
        }

        fetchInitialData();
    }, [itemId, orderId, router, toast, form]);


    async function onSubmit(values: FormValues) {
        if (!orderId || !itemId) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);

            // 1. Update the Order Item
            const { loadingDateTime, unloadingDateTime, cargoItems, ...rest } = values;
            const orderItemRef = doc(db, 'order_items', itemId);
            batch.update(orderItemRef, {
                ...rest,
                startRegionRef: doc(db, 'regions', values.startRegionId),
                startWarehouseRef: doc(db, 'warehouses', values.startWarehouseId),
                endRegionRef: doc(db, 'regions', values.endRegionId),
                endWarehouseRef: doc(db, 'warehouses', values.endWarehouseId),
                serviceTypeRef: doc(db, 'service_types', values.serviceTypeId),
                vehicleTypeRef: doc(db, 'vehicle_types', values.vehicleTypeId),
                trailerTypeRef: doc(db, 'trailer_types', values.trailerTypeId),
                loadingStartDate: loadingDateTime,
                loadingEndDate: loadingDateTime,
                unloadingStartDate: unloadingDateTime,
                unloadingEndDate: unloadingDateTime,
                updatedAt: serverTimestamp(),
            });

            // 2. Delete cargo items marked for deletion
            cargoToDelete.forEach(cargoId => {
                batch.delete(doc(db, 'order_item_cargoes', cargoId));
            });

            // 3. Update or create cargo items
            cargoItems.forEach(cargo => {
                const { id: cargoId, ...cargoData } = cargo;
                const cargoRef = cargoId ? doc(db, 'order_item_cargoes', cargoId) : doc(collection(db, 'order_item_cargoes'));

                const dataToSave = {
                    ...cargoData,
                    packagingTypeRef: doc(db, 'packaging_types', cargoData.packagingTypeId),
                }

                if (cargoId) {
                    batch.update(cargoRef, dataToSave);
                } else {
                    batch.set(cargoRef, {
                        ...dataToSave,
                        orderItemId: itemId,
                        orderItemRef: orderItemRef,
                    });
                }
            });

            await batch.commit();

            toast({ title: 'Амжилттай', description: 'Тээвэрлэлтийн мэдээлэл шинэчлэгдлээ.' });
            router.push(`/orders/${orderId}`);

        } catch (error) {
            console.error("Error updating item:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleAddCargo = () => {
        append({ name: '', quantity: 1, unit: 'кг', packagingTypeId: '', notes: '' });
    }

    const handleRemoveCargo = (index: number) => {
        const cargoItem = form.getValues(`cargoItems.${index}`);
        if (cargoItem.id) {
            setCargoToDelete(prev => [...prev, cargoItem.id!]);
        }
        remove(index);
    }

    const standardUnits = ["кг", "тн", "м3", "литр", "ш", "боодол", "хайрцаг"];

    const handleQuickAdd = (type: 'regions' | 'service_types' | 'vehicle_types' | 'trailer_types' | 'packaging_types' | 'warehouses', formField: any) => {
        setDialogProps({
            open: true,
            collectionName: type,
            title: `Шинэ ${type} нэмэх`,
            isWarehouse: type === 'warehouses',
            onSuccess: (newItem) => {
                switch (type) {
                    case 'regions': setRegions(prev => [...prev, newItem as Region]); break;
                    case 'service_types': setServiceTypes(prev => [...prev, newItem as ServiceType]); break;
                    case 'vehicle_types': setVehicleTypes(prev => [...prev, newItem as VehicleType]); break;
                    case 'trailer_types': setTrailerTypes(prev => [...prev, newItem as TrailerType]); break;
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
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Card><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="outline" size="sm" asChild className="mb-4">
                    <Link href={`/orders/${orderId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Захиалга руу буцах
                    </Link>
                </Button>
                <h1 className="text-3xl font-headline font-bold">Тээвэрлэлт засах</h1>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Тээвэрлэлтийн мэдээлэл</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <h5 className="font-semibold mt-4">Тээврийн үйлчилгээ</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="serviceTypeId" render={({ field }) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map((s) => (<SelectItem key={s.id} value={s.id}> {s.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('service_types', 'serviceTypeId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Давтамж</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h5 className="font-semibold">Тээврийн чиглэл</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="startRegionId" render={({ field }) => (<FormItem><FormLabel>Ачих бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r) => (<SelectItem key={r.id} value={r.id}> {r.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('regions', 'startRegionId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="startWarehouseId" render={({ field }) => (<FormItem><FormLabel>Ачих агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}> {w.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('warehouses', 'startWarehouseId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="endRegionId" render={({ field }) => (<FormItem><FormLabel>Буулгах бүс</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r) => (<SelectItem key={r.id} value={r.id}> {r.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('regions', 'endRegionId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="endWarehouseId" render={({ field }) => (<FormItem><FormLabel>Буулгах агуулах</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}> {w.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('warehouses', 'endWarehouseId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="totalDistance" render={({ field }) => (<FormItem><FormLabel>Нийт зам (км)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="loadingDateTime" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Ачих огноо, цаг</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, 'yyyy-MM-dd HH:mm') : <span>Огноо, цаг сонгох</span>}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar 
                                                        initialFocus 
                                                        mode="single" 
                                                        selected={field.value} 
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const currentTime = field.value || new Date();
                                                                date.setHours(currentTime.getHours(), currentTime.getMinutes());
                                                            }
                                                            field.onChange(date);
                                                        }} 
                                                        captionLayout="dropdown" 
                                                        fromYear={2020} 
                                                        toYear={new Date().getFullYear() + 2} 
                                                    />
                                                    <div className="border-t p-3">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                                            <Input 
                                                                type="time" 
                                                                className="w-full"
                                                                value={field.value ? format(field.value, 'HH:mm') : ''}
                                                                onChange={(e) => {
                                                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                    const newDate = field.value ? new Date(field.value) : new Date();
                                                                    newDate.setHours(hours || 0, minutes || 0);
                                                                    field.onChange(newDate);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="unloadingDateTime" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Буулгах огноо, цаг</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, 'yyyy-MM-dd HH:mm') : <span>Огноо, цаг сонгох</span>}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar 
                                                        initialFocus 
                                                        mode="single" 
                                                        selected={field.value} 
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const currentTime = field.value || new Date();
                                                                date.setHours(currentTime.getHours(), currentTime.getMinutes());
                                                            }
                                                            field.onChange(date);
                                                        }} 
                                                        captionLayout="dropdown" 
                                                        fromYear={2020} 
                                                        toYear={new Date().getFullYear() + 2} 
                                                    />
                                                    <div className="border-t p-3">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                                            <Input 
                                                                type="time" 
                                                                className="w-full"
                                                                value={field.value ? format(field.value, 'HH:mm') : ''}
                                                                onChange={(e) => {
                                                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                    const newDate = field.value ? new Date(field.value) : new Date();
                                                                    newDate.setHours(hours || 0, minutes || 0);
                                                                    field.onChange(newDate);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h5 className="font-semibold">Тээврийн хэрэгсэл</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (<FormItem><FormLabel>Машин</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map((s) => (<SelectItem key={s.id} value={s.id}> {s.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('vehicle_types', 'vehicleTypeId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="trailerTypeId" render={({ field }) => (<FormItem><FormLabel>Тэвш</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map((s) => (<SelectItem key={s.id} value={s.id}> {s.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('trailer_types', 'trailerTypeId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <h5 className="font-semibold">Санхүүгийн мэдээлэл</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="profitMargin" render={({ field }) => (<FormItem><FormLabel>Ашгийн хувь (%)</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="withVAT" render={({ field }) => (<FormItem className="flex flex-row items-end space-x-2 pb-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="withVAT-edit" /></FormControl><div className="space-y-1 leading-none"><label htmlFor="withVAT-edit" className="text-sm">НӨАТ-тэй эсэх</label></div><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h5 className="font-semibold">Ачаа</h5>
                                {fields.map((cargoField, cargoIndex) => (
                                    <div key={cargoField.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 border rounded-md">
                                        <FormField control={form.control} name={`cargoItems.${cargoIndex}.name`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Нэр</FormLabel><FormControl><Input placeholder="Цемент" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`cargoItems.${cargoIndex}.quantity`} render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel className="text-xs">Хэмжээ</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`cargoItems.${cargoIndex}.unit`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Нэгж</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Нэгж..." /></SelectTrigger></FormControl><SelectContent>{standardUnits.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`cargoItems.${cargoIndex}.packagingTypeId`} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Баглаа</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{packagingTypes.map((p) => (<SelectItem key={p.id} value={p.id}> {p.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('packaging_types', `cargoItems.${cargoIndex}.packagingTypeId`)}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`cargoItems.${cargoIndex}.notes`} render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Тэмдэглэл</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive self-end" onClick={() => handleRemoveCargo(cargoIndex)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={handleAddCargo}><PlusCircle className="mr-2 h-4 w-4" /> Ачаа нэмэх</Button>
                                {form.formState.errors?.cargoItems && (<p className="text-sm font-medium text-destructive">{(form.formState.errors.cargoItems as any).message || 'Ачааны мэдээлэл дутуу байна.'}</p>)}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href={`/orders/${orderId}`}>Цуцлах</Link>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Хадгалах
                        </Button>
                    </div>
                </form>
            </Form>
            {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
        </div>
    );
}
