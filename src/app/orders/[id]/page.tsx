
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, orderBy, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, CustomerEmployee, VehicleType, TrailerType, Region, PackagingType, OrderItemCargo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, PlusCircle, Trash2, CalendarIcon, Loader2, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

function OrderDetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
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

const cargoItemSchema = z.object({
  name: z.string().min(2, "Ачааны нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
  quantity: z.coerce.number().min(0.1, "Тоо хэмжээг оруулна уу."),
  unit: z.string().min(1, "Хэмжих нэгжийг оруулна уу."),
  packagingTypeId: z.string().min(1, "Баглаа боодол сонгоно уу."),
  notes: z.string().optional(),
});

const orderItemSchema = z.object({
  serviceTypeId: z.string().min(1, "Үйлчилгээний төрөл сонгоно уу."),
  frequency: z.coerce.number().min(1, "Давтамж дор хаяж 1 байх ёстой."),
  startRegionId: z.string().min(1, "Ачих бүс сонгоно уу."),
  startWarehouseId: z.string().min(1, "Ачих агуулах сонгоно уу."),
  endRegionId: z.string().min(1, "Буулгах бүс сонгоно уу."),
  endWarehouseId: z.string().min(1, "Буулгах агуулах сонгоно уу."),
  loadingDateRange: z.object({
    from: z.date({ required_error: "Ачих эхлэх огноо сонгоно уу." }),
    to: z.date({ required_error: "Ачих дуусах огноо сонгоно уу." }),
  }),
  unloadingDateRange: z.object({
    from: z.date({ required_error: "Буулгах эхлэх огноо сонгоно уу." }),
    to: z.date({ required_error: "Буулгах дуусах огноо сонгоно уу." }),
  }),
  vehicleTypeId: z.string().min(1, "Машины төрөл сонгоно уу."),
  trailerTypeId: z.string().min(1, "Тэвшний төрөл сонгоно уу."),
  totalDistance: z.coerce.number().min(1, "Нийт зайг оруулна уу."),
  cargoItems: z.array(cargoItemSchema).min(1, "Дор хаяж нэг ачаа нэмнэ үү."),
});

const formSchema = z.object({
  items: z.array(orderItemSchema).min(1, { message: 'Дор хаяж нэг тээвэрлэлт нэмнэ үү.' }),
});

type FormValues = z.infer<typeof formSchema>;


export default function OrderDetailPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>([]);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
  const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
  const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
  const [customerEmployees, setCustomerEmployees] = React.useState<CustomerEmployee[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<OrderItem | null>(null);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const fetchOrderData = React.useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      const orderDocSnap = await getDoc(orderDocRef);

      if (!orderDocSnap.exists()) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга олдсонгүй.' });
        router.push('/orders');
        return;
      }
      const data = orderDocSnap.data();
      const currentOrder = { id: orderDocSnap.id, ...data, createdAt: data.createdAt.toDate() } as Order;
      setOrder(currentOrder);

      const [itemsSnap, warehouseSnap, serviceTypeSnap, employeesSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap] = await Promise.all([
        getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
        getDocs(query(collection(db, "warehouses"), orderBy("name"))),
        getDocs(query(collection(db, "service_types"), orderBy("name"))),
        getDocs(query(collection(db, 'customer_employees'), where('customerId', '==', currentOrder.customerId))),
        getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
        getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
        getDocs(query(collection(db, "regions"), orderBy("name"))),
        getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
      ]);
      
      const itemsData = itemsSnap.docs.map(d => {
        const data = d.data();
        const loadingStartDate = data.loadingStartDate instanceof Timestamp ? data.loadingStartDate.toDate() : data.loadingStartDate;
        const loadingEndDate = data.loadingEndDate instanceof Timestamp ? data.loadingEndDate.toDate() : data.loadingEndDate;
        const unloadingStartDate = data.unloadingStartDate instanceof Timestamp ? data.unloadingStartDate.toDate() : data.unloadingStartDate;
        const unloadingEndDate = data.unloadingEndDate instanceof Timestamp ? data.unloadingEndDate.toDate() : data.unloadingEndDate;
        return {id: d.id, ...data, createdAt: data.createdAt ? data.createdAt.toDate() : new Date(), loadingStartDate, loadingEndDate, unloadingStartDate, unloadingEndDate } as OrderItem
      });
      // Sort by createdAt client-side
      itemsData.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setOrderItems(itemsData);

      setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
      setServiceTypes(serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)));
      setCustomerEmployees(employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerEmployee)));
      setVehicleTypes(vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)));
      setTrailerTypes(trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)));
      setRegions(regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)));
      setPackagingTypes(packagingTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingType)));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [orderId, router, toast]);

  React.useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);
  
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'order_items', itemToDelete.id));
      setOrderItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      toast({ title: 'Амжилттай', description: 'Тээвэрлэлт устгагдлаа.'});
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.'});
    } finally {
      setIsSubmitting(false);
      setItemToDelete(null);
    }
  };

  async function handleEmployeeChange(newEmployeeId: string) {
    if (!order) return;
    setIsUpdatingEmployee(true);
    try {
        const selectedEmployee = customerEmployees.find(e => e.id === newEmployeeId);
        if (!selectedEmployee) {
             toast({ variant: 'destructive', title: 'Алдаа', description: 'Сонгогдсон ажилтан олдсонгүй.' });
             return;
        }

        const orderDocRef = doc(db, 'orders', order.id);
        await updateDoc(orderDocRef, {
            employeeId: newEmployeeId,
            employeeName: `${selectedEmployee.lastName} ${selectedEmployee.firstName}`,
        });

        setOrder(prevOrder => prevOrder ? {
             ...prevOrder,
             employeeId: newEmployeeId,
             employeeName: `${selectedEmployee.lastName} ${selectedEmployee.firstName}`
        } : null);

        toast({ title: 'Амжилттай', description: 'Хариуцсан ажилтан солигдлоо.' });
    } catch (error) {
        console.error("Error updating employee:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтан солиход алдаа гарлаа.' });
    } finally {
        setIsUpdatingEmployee(false);
    }
  }

  async function onSubmit(values: FormValues) {
    if (!orderId) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      values.items.forEach(item => {
        const { loadingDateRange, unloadingDateRange, cargoItems, ...rest } = item;
        
        const orderItemRef = doc(collection(db, 'order_items'));
        batch.set(orderItemRef, {
          ...rest,
          loadingStartDate: loadingDateRange.from,
          loadingEndDate: loadingDateRange.to,
          unloadingStartDate: unloadingDateRange.from,
          unloadingEndDate: unloadingDateRange.to,
          orderId: orderId,
          status: 'Pending',
          createdAt: serverTimestamp(),
        });

        cargoItems.forEach(cargo => {
          const cargoRef = doc(collection(db, 'order_item_cargoes'));
          batch.set(cargoRef, {
            ...cargo,
            orderItemId: orderItemRef.id,
          });
        });
      });

      await batch.commit();
      
      toast({ title: 'Амжилттай', description: 'Шинэ тээвэрлэлтүүд нэмэгдлээ.'});
      form.reset({ items: [] });
      fetchOrderData(); // Refetch data to show new items
    } catch (error) {
       console.error(error);
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт нэмэхэд алдаа гарлаа.'});
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1"><CardHeader><Skeleton className="h-40 w-full" /></CardHeader></Card>
            <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-64 w-full" /></CardHeader></Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }
  
  const getServiceName = (id: string) => serviceTypes.find(s => s.id === id)?.name || id;
  const getRegionName = (id: string) => regions.find(r => r.id === id)?.name || 'N/A';
  const getVehicleTypeName = (id: string) => vehicleTypes.find(v => v.id === id)?.name || 'N/A';
  const getTrailerTypeName = (id: string) => trailerTypes.find(t => t.id === id)?.name || 'N/A';


  const handleAddNewItem = () => {
    const fromDate = new Date();
    const toDate = new Date();
    append({
        serviceTypeId: '',
        frequency: 1,
        startRegionId: '',
        startWarehouseId: '',
        endRegionId: '',
        endWarehouseId: '',
        loadingDateRange: { from: fromDate, to: toDate },
        unloadingDateRange: { from: new Date(fromDate), to: new Date(toDate) },
        vehicleTypeId: '',
        trailerTypeId: '',
        totalDistance: 0,
        cargoItems: [],
    });
  };

  return (
    <div className="container mx-auto py-6">
       <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/orders')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Захиалгын жагсаалт
        </Button>
        <h1 className="text-3xl font-headline font-bold">Захиалгын дэлгэрэнгүй</h1>
        <p className="text-muted-foreground font-mono">{order.orderNumber}</p>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Захиалгын мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OrderDetailItem icon={Building} label="Харилцагч" value={<Link href={`/customers/${order.customerId}`} className="hover:underline text-primary">{order.customerName}</Link>} />
            <OrderDetailItem 
                icon={User} 
                label="Хариуцсан ажилтан" 
                value={
                    <Select onValueChange={handleEmployeeChange} value={order.employeeId} disabled={isUpdatingEmployee || customerEmployees.length === 0}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Ажилтан сонгоно уу..." />
                        </SelectTrigger>
                        <SelectContent>
                            {customerEmployees.map(employee => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.lastName} {employee.firstName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                } 
            />
            <OrderDetailItem icon={User} label="Бүртгэсэн хэрэглэгч" value={order.createdBy.name} />
            <OrderDetailItem icon={FileText} label="Бүртгэсэн огноо" value={order.createdAt.toLocaleString()} />
          </CardContent>
        </Card>
        
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Тээвэрлэлтийн жагсаалт</CardTitle>
                    <CardDescription>Энэ захиалгад хамаарах тээвэрлэлтүүд.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Үйлчилгээ</TableHead>
                                    <TableHead>Чиглэл</TableHead>
                                    <TableHead>Хэрэгсэл</TableHead>
                                    <TableHead>Ачих огноо</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orderItems.length > 0 ? (
                                    orderItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{getServiceName(item.serviceTypeId)}</div>
                                                <div className="text-xs text-muted-foreground">x{item.frequency} удаа</div>
                                            </TableCell>
                                            <TableCell>
                                                {getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}
                                            </TableCell>
                                            <TableCell>
                                                {getVehicleTypeName(item.vehicleTypeId)} / {getTrailerTypeName(item.trailerTypeId)}
                                            </TableCell>
                                            <TableCell>{format(item.loadingStartDate, "yyyy-MM-dd")}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                     <Button variant="ghost" size="icon" asChild>
                                                        <Link href={`/orders/${orderId}/items/${item.id}/edit`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">Тээвэрлэлт одоогоор алга.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Шинэ тээвэрлэлт нэмэх</CardTitle>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {fields.map((field, index) => (
                      <OrderItemForm 
                        key={field.id}
                        form={form}
                        itemIndex={index}
                        onRemove={() => remove(index)}
                        serviceTypes={serviceTypes}
                        regions={regions}
                        warehouses={warehouses}
                        vehicleTypes={vehicleTypes}
                        trailerTypes={trailerTypes}
                        packagingTypes={packagingTypes}
                      />
                    ))}
                    <div className="flex justify-between items-center">
                        <Button type="button" variant="outline" onClick={handleAddNewItem}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ тээвэрлэлт нэмэх
                        </Button>
                        <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Хадгалах
                        </Button>
                    </div>
                    {form.formState.errors.items && (<p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>)}
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>
      </div>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Энэ тээвэрлэлтийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteItem} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                        {isSubmitting ? "Устгаж байна..." : "Устгах"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

function OrderItemForm({ form, itemIndex, onRemove, serviceTypes, regions, warehouses, vehicleTypes, trailerTypes, packagingTypes }: any) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `items.${itemIndex}.cargoItems`,
  });

  const handleAddCargo = () => {
    append({
      name: '',
      quantity: 1,
      unit: 'кг',
      packagingTypeId: '',
      notes: '',
    });
  }

  const standardUnits = ["кг", "тн", "м3", "литр", "ш", "боодол", "хайрцаг"];

  return (
    <div className="p-4 border rounded-md relative space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-lg">Тээвэрлэлт #{itemIndex + 1}</h4>
            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
        <Separator/>

        <div className="space-y-4">
            <h5 className="font-semibold mt-4">Тээврийн үйлчилгээ</h5>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.serviceTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.frequency`} render={({ field }: any) => ( <FormItem><FormLabel>Давтамж</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
             </div>
        </div>

        <Separator/>
        
        <div className="space-y-4">
            <h5 className="font-semibold">Тээврийн чиглэл</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.startRegionId`} render={({ field }: any) => ( <FormItem><FormLabel>Ачих бүс</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.startWarehouseId`} render={({ field }: any) => ( <FormItem><FormLabel>Ачих агуулах</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.endRegionId`} render={({ field }: any) => ( <FormItem><FormLabel>Буулгах бүс</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map((r: any) => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.endWarehouseId`} render={({ field }: any) => ( <FormItem><FormLabel>Буулгах агуулах</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map((w: any) => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
            <FormField control={form.control} name={`items.${itemIndex}.totalDistance`} render={({ field }: any) => ( <FormItem><FormLabel>Нийт зам (км)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.loadingDateRange`} render={({ field }: any) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Ачих огноо</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={'outline'}
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value?.from && 'text-muted-foreground'
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value?.from ? (
                                    field.value.to ? (
                                    <>
                                        {format(field.value.from, 'LLL dd, y')} -{' '}
                                        {format(field.value.to, 'LLL dd, y')}
                                    </>
                                    ) : (
                                    format(field.value.from, 'LLL dd, y')
                                    )
                                ) : (
                                    <span>Огноо сонгох</span>
                                )}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={field.value?.from}
                                selected={field.value}
                                onSelect={field.onChange}
                                numberOfMonths={2}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            />
                            </PopoverContent>
                        </Popover>
                        <FormDescription>Эхлэх огноог сонгохдоо хоёр товшино уу.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name={`items.${itemIndex}.unloadingDateRange`} render={({ field }: any) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Буулгах огноо</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={'outline'}
                                className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value?.from && 'text-muted-foreground'
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value?.from ? (
                                    field.value.to ? (
                                    <>
                                        {format(field.value.from, 'LLL dd, y')} -{' '}
                                        {format(field.value.to, 'LLL dd, y')}
                                    </>
                                    ) : (
                                    format(field.value.from, 'LLL dd, y')
                                    )
                                ) : (
                                    <span>Огноо сонгох</span>
                                )}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={field.value?.from}
                                selected={field.value}
                                onSelect={field.onChange}
                                numberOfMonths={2}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            />
                            </PopoverContent>
                        </Popover>
                        <FormDescription>Эхлэх огноог сонгохдоо хоёр товшино уу.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
        </div>

        <Separator/>

        <div className="space-y-4">
             <h5 className="font-semibold">Тээврийн хэрэгсэл</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name={`items.${itemIndex}.vehicleTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Машин</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name={`items.${itemIndex}.trailerTypeId`} render={({ field }: any) => (<FormItem><FormLabel>Тэвш</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map((s: any) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            </div>
        </div>
        
        <Separator />

        <div className="space-y-2">
            <h5 className="font-semibold">Ачаа</h5>
            {fields.map((cargoField, cargoIndex) => (
                <div key={cargoField.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 border rounded-md">
                     <FormField control={form.control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.name`} render={({ field }: any) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Нэр</FormLabel><FormControl><Input placeholder="Цемент" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.quantity`} render={({ field }: any) => (<FormItem className="md:col-span-1"><FormLabel className="text-xs">Хэмжээ</FormLabel><FormControl><Input type="number" placeholder="25" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.unit`} render={({ field }: any) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-xs">Нэгж</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Нэгж..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {standardUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                     <FormField control={form.control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.packagingTypeId`} render={({ field }: any) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Баглаа</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{packagingTypes.map((p: any) => ( <SelectItem key={p.id} value={p.id}> {p.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name={`items.${itemIndex}.cargoItems.${cargoIndex}.notes`} render={({ field }: any) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Тэмдэглэл</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive self-end" onClick={() => remove(cargoIndex)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddCargo}><PlusCircle className="mr-2 h-4 w-4" /> Ачаа нэмэх</Button>
             {form.formState.errors?.items?.[itemIndex]?.cargoItems && (<p className="text-sm font-medium text-destructive">{(form.formState.errors.items[itemIndex].cargoItems as any).message || 'Ачааны мэдээлэл дутуу байна.'}</p>)}
        </div>
    </div>
  )
}

    