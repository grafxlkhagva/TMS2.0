
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, CustomerEmployee, Region, VehicleType, TrailerType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, PlusCircle, Trash2, CalendarIcon, Loader2 } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

const orderItemSchema = z.object({
  startRegionId: z.string().min(1, "Ачих бүс сонгоно уу."),
  startWarehouseId: z.string().min(1, "Ачих агуулах сонгоно уу."),
  endRegionId: z.string().min(1, "Буулгах бүс сонгоно уу."),
  endWarehouseId: z.string().min(1, "Буулгах агуулах сонгоно уу."),
  deliveryDateRange: z.object({
    from: z.date({ required_error: "Эхлэх огноо сонгоно уу." }),
    to: z.date({ required_error: "Дуусах огноо сонгоно уу." }),
  }),
  serviceTypeId: z.string().min(1, "Үйлчилгээний төрөл сонгоно уу."),
  vehicleTypeId: z.string().min(1, "Машины төрөл сонгоно уу."),
  trailerTypeId: z.string().min(1, "Тэвшний төрөл сонгоно уу."),
  totalDistance: z.coerce.number().min(1, "Нийт зайг оруулна уу."),
  cargoWeight: z.coerce.number().min(0.1, "Ачааны жинг оруулна уу."),
  cargoInfo: z.string().min(3, "Ачааны мэдээлэл оруулна уу."),
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
  
  const watchedItems = form.watch("items");

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

      const [itemsSnap, warehouseSnap, serviceTypeSnap, employeesSnap, regionSnap, vehicleTypeSnap, trailerTypeSnap] = await Promise.all([
        getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
        getDocs(query(collection(db, "warehouses"), orderBy("name"))),
        getDocs(query(collection(db, "service_types"), orderBy("name"))),
        getDocs(query(collection(db, 'customer_employees'), where('customerId', '==', currentOrder.customerId))),
        getDocs(query(collection(db, "regions"), orderBy("name"))),
        getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
        getDocs(query(collection(db, "trailer_types"), orderBy("name")))
      ]);
      
      const itemsData = itemsSnap.docs.map(d => {
        const data = d.data();
        const deliveryStartDate = data.deliveryStartDate instanceof Timestamp ? data.deliveryStartDate.toDate() : data.deliveryStartDate;
        const deliveryEndDate = data.deliveryEndDate instanceof Timestamp ? data.deliveryEndDate.toDate() : data.deliveryEndDate;
        return {id: d.id, ...data, createdAt: data.createdAt.toDate(), deliveryStartDate, deliveryEndDate } as OrderItem
      });
      setOrderItems(itemsData);

      setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
      setServiceTypes(serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)));
      setCustomerEmployees(employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerEmployee)));
      setRegions(regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)));
      setVehicleTypes(vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)));
      setTrailerTypes(trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)));

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
      const promises = values.items.map(item => 
        addDoc(collection(db, 'order_items'), {
          ...item,
          deliveryStartDate: item.deliveryDateRange.from,
          deliveryEndDate: item.deliveryDateRange.to,
          deliveryDateRange: undefined, // remove the temporary field
          orderId: orderId,
          status: 'Pending',
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(promises);
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
  
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || id;

  const handleAddNewItem = () => {
    append({
        startRegionId: '',
        startWarehouseId: '',
        endRegionId: '',
        endWarehouseId: '',
        deliveryDateRange: { from: new Date(), to: new Date() },
        serviceTypeId: '',
        vehicleTypeId: '',
        trailerTypeId: '',
        totalDistance: 0,
        cargoWeight: 0,
        cargoInfo: '',
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ачих агуулах</TableHead>
                                <TableHead>Буулгах агуулах</TableHead>
                                <TableHead>Ачаа</TableHead>
                                <TableHead>Огноо</TableHead>
                                <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.length > 0 ? (
                                orderItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{getWarehouseName(item.startWarehouseId)}</TableCell>
                                        <TableCell>{getWarehouseName(item.endWarehouseId)}</TableCell>
                                        <TableCell>{item.cargoInfo}</TableCell>
                                        <TableCell>{`${format(item.deliveryStartDate, "yy-MM-dd")} / ${format(item.deliveryEndDate, "yy-MM-dd")}`}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Шинэ тээвэрлэлт нэмэх</CardTitle>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {fields.map((field, index) => {
                        const startRegionId = watchedItems[index]?.startRegionId;
                        const endRegionId = watchedItems[index]?.endRegionId;
                        const filteredStartWarehouses = warehouses.filter(w => w.regionId === startRegionId);
                        const filteredEndWarehouses = warehouses.filter(w => w.regionId === endRegionId);

                        return (
                        <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold">Тээвэрлэлт #{index + 1}</h4>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <Separator/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name={`items.${index}.startRegionId`} render={({ field }) => ( <FormItem><FormLabel>Ачих бүс</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue(`items.${index}.startWarehouseId`, ''); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map(r => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`items.${index}.endRegionId`} render={({ field }) => ( <FormItem><FormLabel>Буулгах бүс</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue(`items.${index}.endWarehouseId`, ''); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map(r => ( <SelectItem key={r.id} value={r.id}> {r.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`items.${index}.startWarehouseId`} render={({ field }) => ( <FormItem><FormLabel>Ачих агуулах</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!startRegionId}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{filteredStartWarehouses.map(w => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`items.${index}.endWarehouseId`} render={({ field }) => ( <FormItem><FormLabel>Буулгах агуулах</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!endRegionId}><FormControl><SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger></FormControl><SelectContent>{filteredEndWarehouses.map(w => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            </div>
                            <FormField control={form.control} name={`items.${index}.deliveryDateRange`} render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Тээвэрлэх огноо</FormLabel>
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
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name={`items.${index}.serviceTypeId`} render={({ field }) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Үйлчилгээний төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map(s => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`items.${index}.vehicleTypeId`} render={({ field }) => (<FormItem><FormLabel>Машины төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Машины төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map(s => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`items.${index}.trailerTypeId`} render={({ field }) => (<FormItem><FormLabel>Тэвшний төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Тэвшний төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map(s => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <FormField control={form.control} name={`items.${index}.totalDistance`} render={({ field }) => ( <FormItem><FormLabel>Нийт зам (км)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                               <FormField control={form.control} name={`items.${index}.cargoWeight`} render={({ field }) => ( <FormItem><FormLabel>Ачааны жин (тонн)</FormLabel><FormControl><Input type="number" placeholder="25.5" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                            <FormField control={form.control} name={`items.${index}.cargoInfo`} render={({ field }) => ( <FormItem><FormLabel>Ачааны мэдээлэл</FormLabel><FormControl><Textarea placeholder="Ачааны онцлог, хэмжээ..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    )})}
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
