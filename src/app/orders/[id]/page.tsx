
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"

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
import { cn } from '@/lib/utils';

function OrderDetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
  );
}

const orderItemSchema = z.object({
  startWarehouseId: z.string().min(1, { message: "Ачих агуулах сонгоно уу." }),
  endWarehouseId: z.string().min(1, { message: "Хүргэх агуулах сонгоно уу." }),
  serviceTypeId: z.string().min(1, { message: "Үйлчилгээний төрөл сонгоно уу." }),
  cargoInfo: z.string().min(3, { message: "Ачааны мэдээлэл оруулна уу." }),
  deliveryDate: z.date({ required_error: "Хүргэх огноо сонгоно уу." }),
});

const formSchema = z.object({
  items: z.array(orderItemSchema).min(1, { message: 'Дор хаяж нэг тээврийн зүйл нэмнэ үү.' }),
});

type FormValues = z.infer<typeof formSchema>;


export default function OrderDetailPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<OrderItem | null>(null);

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
      setOrder({ id: orderDocSnap.id, ...data, createdAt: data.createdAt.toDate() } as Order);

      const [itemsSnap, warehouseSnap, serviceTypeSnap] = await Promise.all([
        getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
        getDocs(query(collection(db, "warehouses"), orderBy("name"))),
        getDocs(query(collection(db, "service_types"), orderBy("name"))),
      ]);
      
      const itemsData = itemsSnap.docs.map(d => {
        const data = d.data();
        const deliveryDate = data.deliveryDate instanceof Timestamp ? data.deliveryDate.toDate() : data.deliveryDate;
        return {id: d.id, ...data, createdAt: data.createdAt.toDate(), deliveryDate } as OrderItem
      });
      setOrderItems(itemsData);

      setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
      setServiceTypes(serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)));

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
      toast({ title: 'Амжилттай', description: 'Тээврийн зүйл устгагдлаа.'});
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.'});
    } finally {
      setIsSubmitting(false);
      setItemToDelete(null);
    }
  };

  async function onSubmit(values: FormValues) {
    if (!orderId) return;
    setIsSubmitting(true);
    try {
      const promises = values.items.map(item => 
        addDoc(collection(db, 'order_items'), {
          ...item,
          orderId: orderId,
          status: 'Pending',
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(promises);
      toast({ title: 'Амжилттай', description: 'Шинэ тээвэрлэлтийн зүйлс нэмэгдлээ.'});
      form.reset({ items: [] });
      fetchOrderData(); // Refetch data to show new items
    } catch (error) {
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн зүйлс нэмэхэд алдаа гарлаа.'});
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
            <OrderDetailItem icon={User} label="Хариуцсан ажилтан" value={order.employeeName} />
            <OrderDetailItem icon={User} label="Бүртгэсэн хэрэглэгч" value={order.createdBy.name} />
            <OrderDetailItem icon={FileText} label="Бүртгэсэн огноо" value={order.createdAt.toLocaleString()} />
          </CardContent>
        </Card>
        
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Тээврийн зүйлсийн жагсаалт</CardTitle>
                    <CardDescription>Энэ захиалгад хамаарах тээвэрлэлтийн мэдээлэл.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ачих агуулах</TableHead>
                                <TableHead>Хүргэх агуулах</TableHead>
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
                                        <TableCell>{item.deliveryDate ? format(item.deliveryDate, "yyyy-MM-dd") : ''}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Тээвэрлэлтийн зүйлс одоогоор алга.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Шинэ тээврийн зүйлс нэмэх</CardTitle>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold">Тээвэрлэлт #{index + 1}</h4>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <Separator/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name={`items.${index}.startWarehouseId`} render={({ field }) => ( <FormItem><FormLabel>Ачих агуулах</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map(w => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name={`items.${index}.endWarehouseId`} render={({ field }) => ( <FormItem><FormLabel>Хүргэх агуулах</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Хүргэх агуулах..." /></SelectTrigger></FormControl><SelectContent>{warehouses.map(w => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            </div>
                            <FormField control={form.control} name={`items.${index}.serviceTypeId`} render={({ field }) => (<FormItem><FormLabel>Үйлчилгээний төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Үйлчилгээний төрөл..." /></SelectTrigger></FormControl><SelectContent>{serviceTypes.map(s => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name={`items.${index}.deliveryDate`} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Хүргэх огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn( 'w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground' )}>{field.value ? format(field.value, 'PPP') : ( <span>Огноо сонгох</span> )}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date('1900-01-01')} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name={`items.${index}.cargoInfo`} render={({ field }) => ( <FormItem><FormLabel>Ачааны мэдээлэл</FormLabel><FormControl><Textarea placeholder="Ачааны онцлог, хэмжээ..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    ))}
                    <div className="flex justify-between items-center">
                        <Button type="button" variant="outline" onClick={() => append({ startWarehouseId: '', endWarehouseId: '', serviceTypeId: '', cargoInfo: '', deliveryDate: new Date() })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Шинэ зүйл нэмэх
                        </Button>
                        <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Нэмэх
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
                        Энэ тээврийн зүйлийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
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
