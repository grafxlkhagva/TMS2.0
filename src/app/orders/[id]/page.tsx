
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
import { ArrowLeft, User, Building, FileText, PlusCircle, Trash2, Edit } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import OrderItemForm from '@/components/order-item-form';

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
  totalDistance: z.coerce.number().min(1, "Нийт зайг оруулна уу."),
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

      values.items.forEach((item: any) => {
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

        cargoItems.forEach((cargo: any) => {
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
  
  const getServiceName = (id: string) => serviceTypes.find(s => s.id === id)?.name || 'Тодорхойгүй';
  const getRegionName = (id: string) => regions.find(r => r.id === id)?.name || 'Тодорхойгүй';
  const getVehicleTypeName = (id: string) => vehicleTypes.find(v => v.id === id)?.name || 'Тодорхойгүй';
  const getTrailerTypeName = (id: string) => trailerTypes.find(t => t.id === id)?.name || 'Тодорхойгүй';


  const handleAddNewItem = () => {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 1); // Default range of 1 day
    
    append({
        serviceTypeId: '',
        frequency: 1,
        startRegionId: '',
        startWarehouseId: '',
        endRegionId: '',
        endWarehouseId: '',
        loadingDateRange: { from: fromDate, to: toDate },
        unloadingDateRange: { from: new Date(fromDate.getTime() + 2 * 24 * 60 * 60 * 1000), to: new Date(toDate.getTime() + 2 * 24 * 60 * 60 * 1000) },
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
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-headline font-bold">Захиалгын дэлгэрэнгүй</h1>
                <p className="text-muted-foreground font-mono">{order.orderNumber}</p>
            </div>
            <Button asChild>
                <Link href={`/orders/${order.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Захиалга засах
                </Link>
            </Button>
        </div>
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
            <OrderDetailItem icon={FileText} label="Статус" value={<Badge>{order.status}</Badge>} />
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
                <OrderItemForm 
                    form={form}
                    fields={fields}
                    append={append}
                    remove={remove}
                    allData={{
                      serviceTypes,
                      regions,
                      warehouses,
                      vehicleTypes,
                      trailerTypes,
                      packagingTypes,
                    }}
                    setAllData={{
                      setServiceTypes,
                      setRegions,
                      setWarehouses,
                      setVehicleTypes,
                      setTrailerTypes,
                      setPackagingTypes,
                    }}
                    isSubmitting={isSubmitting}
                    onSubmit={onSubmit}
                    onAddNewItem={handleAddNewItem}
                />
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
