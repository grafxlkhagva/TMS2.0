
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, CustomerEmployee, VehicleType, TrailerType, Region, PackagingType, DriverQuote } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, PlusCircle, Trash2, Edit, Loader2, CheckCircle, XCircle, CircleDollarSign, Download } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuotePrintLayout from '@/components/quote-print-layout';


const quoteFormSchema = z.object({
    driverName: z.string().min(2, "Жолоочийн нэр оруулна уу."),
    driverPhone: z.string().min(8, "Утасны дугаар буруу байна."),
    price: z.coerce.number().min(1, "Үнийн санал оруулна уу."),
    notes: z.string().optional(),
});
type QuoteFormValues = z.infer<typeof quoteFormSchema>;


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
  profitMargin: z.coerce.number().min(0, "Ашгийн хувь 0-аас багагүй байна.").max(100, "Ашгийн хувь 100-аас ихгүй байна.").optional(),
  withVAT: z.boolean().optional(),
  cargoItems: z.array(z.object({
    name: z.string().min(2, "Ачааны нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
    quantity: z.coerce.number().min(0.1, "Тоо хэмжээг оруулна уу."),
    unit: z.string().min(1, "Хэмжих нэгжийг оруулна уу."),
    packagingTypeId: z.string().min(1, "Баглаа боодол сонгоно уу."),
    notes: z.string().optional(),
  })).min(1, "Дор хаяж нэг ачаа нэмнэ үү."),
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
  const [quotes, setQuotes] = React.useState<Map<string, DriverQuote[]>>(new Map());
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>([]);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
  const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
  const [packagingTypes, setPackagingTypes] = React.useState<PackagingType[]>([]);
  const [customerEmployees, setCustomerEmployees] = React.useState<CustomerEmployee[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<OrderItem | null>(null);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = React.useState(false);
  
  const printRef = React.useRef<HTMLDivElement>(null);


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
  
  const quoteForms = React.useRef<Map<string, any>>(new Map());

  const totalOrderPrice = React.useMemo(() => {
    return orderItems.reduce((acc, item) => acc + (item.finalPrice || 0), 0);
  }, [orderItems]);

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
      const currentOrder = {
          id: orderDocSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
      } as Order;
      setOrder(currentOrder);

      const [itemsSnap, warehouseSnap, serviceTypeSnap, employeesSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap] = await Promise.all([
        getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
        getDocs(query(collection(db, "warehouses"), where('name', '!=', ''))),
        getDocs(query(collection(db, "service_types"), where('name', '!=', ''))),
        getDocs(query(collection(db, 'customer_employees'), where('customerId', '==', currentOrder.customerId))),
        getDocs(query(collection(db, "vehicle_types"), where('name', '!=', ''))),
        getDocs(query(collection(db, "trailer_types"), where('name', '!=', ''))),
        getDocs(query(collection(db, "regions"), where('name', '!=', ''))),
        getDocs(query(collection(db, "packaging_types"), where('name', '!=', ''))),
      ]);
      
      const itemsData: OrderItem[] = itemsSnap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id, 
            ...data,
            createdAt: data.createdAt.toDate(),
            loadingStartDate: data.loadingStartDate.toDate(),
            loadingEndDate: data.loadingEndDate.toDate(),
            unloadingStartDate: data.unloadingStartDate.toDate(),
            unloadingEndDate: data.unloadingEndDate.toDate(),
        } as OrderItem
      });
      itemsData.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setOrderItems(itemsData);

      // Fetch quotes for each item
      const quotesMap = new Map<string, DriverQuote[]>();
      for (const item of itemsData) {
          const quotesQuery = query(collection(db, 'driver_quotes'), where('orderItemId', '==', item.id));
          const quotesSnapshot = await getDocs(quotesQuery);
          let quotesData = quotesSnapshot.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, 
                ...data, 
                createdAt: data.createdAt.toDate()
            } as DriverQuote
          });
          quotesData.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
          quotesMap.set(item.id, quotesData);
      }
      setQuotes(quotesMap);

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
      const batch = writeBatch(db);
      // Delete quotes associated with the item
      const quotesQuery = query(collection(db, 'driver_quotes'), where('orderItemId', '==', itemToDelete.id));
      const quotesSnapshot = await getDocs(quotesQuery);
      quotesSnapshot.forEach(doc => batch.delete(doc.ref));

      // Delete the item itself
      batch.delete(doc(db, 'order_items', itemToDelete.id));
      await batch.commit();

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

  async function onNewItemSubmit(values: FormValues) {
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
  
  const handleAddQuote = async (itemId: string, values: QuoteFormValues) => {
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'driver_quotes'), {
            ...values,
            orderItemId: itemId,
            status: 'Pending',
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Амжилттай', description: 'Шинэ үнийн санал нэмэгдлээ.' });
        fetchOrderData(); // Refetch quotes
        quoteForms.current.get(itemId)?.reset();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Үнийн санал нэмэхэд алдаа гарлаа.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleAcceptQuote = async (item: OrderItem, quoteToAccept: DriverQuote) => {
    setIsSubmitting(true);
    try {
        const batch = writeBatch(db);
        const itemQuotes = quotes.get(item.id) || [];

        // Update the accepted quote
        const acceptedQuoteRef = doc(db, 'driver_quotes', quoteToAccept.id);
        batch.update(acceptedQuoteRef, { status: 'Accepted' });

        // Reject other quotes
        itemQuotes.forEach(q => {
            if (q.id !== quoteToAccept.id && q.status !== 'Rejected') {
                batch.update(doc(db, 'driver_quotes', q.id), { status: 'Rejected' });
            }
        });

        // Calculate final price based on the item's settings
        const basePrice = quoteToAccept.price * (1 + (item.profitMargin || 0) / 100);
        const finalPrice = item.withVAT ? basePrice * 1.1 : basePrice;

        // Update the order item
        const orderItemRef = doc(db, 'order_items', item.id);
        batch.update(orderItemRef, { 
            acceptedQuoteId: quoteToAccept.id,
            finalPrice: finalPrice,
            status: 'Assigned' 
        });

        await batch.commit();
        toast({ title: 'Амжилттай', description: 'Үнийн санал сонгогдлоо.' });
        fetchOrderData();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Үнийн санал сонгоход алдаа гарлаа.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleRevertQuoteSelection = async (item: OrderItem) => {
    setIsSubmitting(true);
    try {
        const batch = writeBatch(db);
        const itemQuotes = quotes.get(item.id) || [];

        // 1. Revert all quotes for this item to 'Pending'
        itemQuotes.forEach(q => {
             batch.update(doc(db, 'driver_quotes', q.id), { status: 'Pending' });
        });

        // 2. Revert the order item itself
        const orderItemRef = doc(db, 'order_items', item.id);
        batch.update(orderItemRef, {
            acceptedQuoteId: null,
            finalPrice: null,
            status: 'Pending'
        });

        await batch.commit();
        toast({ title: 'Буцаалаа', description: 'Жолоочийн сонголтыг буцаалаа. Та шинээр сонгох боломжтой.' });
        fetchOrderData();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Сонголтыг буцаахад алдаа гарлаа.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
      try {
          await deleteDoc(doc(db, 'driver_quotes', quoteId));
          toast({ title: 'Амжилттай', description: 'Үнийн санал устгагдлаа.' });
          fetchOrderData();
      } catch (error) {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Үнийн санал устгахад алдаа гарлаа.' });
      }
  }

  const handlePrint = async () => {
    const input = printRef.current;
    if (!input) {
      toast({ variant: "destructive", title: "Алдаа", description: "Хэвлэх загвар олдсонгүй." });
      return;
    }
    setIsPrinting(true);
    try {
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`uneyn-sanal-${order?.orderNumber}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: "destructive", title: "Алдаа", description: "PDF үүсгэхэд алдаа гарлаа." });
    } finally {
        setIsPrinting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }
  
  const getServiceName = (id: string) => serviceTypes.find(s => s.id === id)?.name || 'Тодорхойгүй';
  const getRegionName = (id: string) => regions.find(r => r.id === id)?.name || 'Тодорхойгүй';


  const handleAddNewItem = () => {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 1);
    
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
        profitMargin: 0,
        withVAT: true,
        cargoItems: [],
    });
  };

  function QuoteForm({ orderItemId }: { orderItemId: string }) {
    const quoteForm = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: { driverName: '', driverPhone: '', price: 0, notes: '' },
    });
    quoteForms.current.set(orderItemId, quoteForm);

    return (
        <Form {...quoteForm}>
             <form onSubmit={quoteForm.handleSubmit((values) => handleAddQuote(orderItemId, values))} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-start p-3 border rounded-md bg-muted/50">
                <FormField control={quoteForm.control} name="driverName" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel className="text-xs">Жолоочийн нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={quoteForm.control} name="driverPhone" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Утас</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={quoteForm.control} name="price" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="text-xs">Үнийн санал (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={quoteForm.control} name="notes" render={({ field }) => (<FormItem className="md:col-span-4"><FormLabel className="text-xs">Тэмдэглэл</FormLabel><FormControl><Textarea rows={1} {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <div className="md:col-span-1 flex justify-end items-end h-full">
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Нэмэх"}
                    </Button>
                </div>
            </form>
        </Form>
    );
  }
  
  const calculateFinalPrice = (item: OrderItem, quote: DriverQuote) => {
      const basePrice = quote.price * (1 + (item.profitMargin || 0) / 100);
      const finalPrice = item.withVAT ? basePrice * 1.1 : basePrice;
      return finalPrice;
  }

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
            <div className="lg:col-span-1 space-y-6">
                <Card>
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
                    {totalOrderPrice > 0 && (
                        <OrderDetailItem icon={CircleDollarSign} label="Нийт үнийн дүн" value={`${totalOrderPrice.toLocaleString()}₮`} />
                    )}
                    <OrderDetailItem icon={FileText} label="Статус" value={<Badge>{order.status}</Badge>} />
                    <OrderDetailItem icon={User} label="Бүртгэсэн хэрэглэгч" value={order.createdBy.name} />
                    <OrderDetailItem icon={FileText} label="Бүртгэсэн огноо" value={order.createdAt.toLocaleString()} />
                  </CardContent>
                </Card>
            </div>
        
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Тээвэрлэлтийн жагсаалт</CardTitle>
                        <CardDescription>Энэ захиалгад хамаарах тээвэрлэлтүүд.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {orderItems.length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                           {orderItems.map((item, index) => (
                               <AccordionItem value={`item-${index}`} key={item.id}>
                                   <AccordionTrigger>
                                       <div className="flex justify-between w-full pr-4">
                                           <div className="text-left">
                                               <p className="font-semibold">Тээвэрлэлт #{index + 1}: {getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}</p>
                                               <p className="text-sm text-muted-foreground">{getServiceName(item.serviceTypeId)} | {format(item.loadingStartDate, "yyyy-MM-dd")}</p>
                                           </div>
                                            <div className="flex items-center gap-4">
                                                {item.finalPrice && (
                                                    <p className="font-semibold text-primary">{item.finalPrice.toLocaleString()}₮</p>
                                                )}
                                               <Badge variant={item.status === 'Assigned' ? 'default' : 'secondary'}>{item.status}</Badge>
                                           </div>
                                       </div>
                                   </AccordionTrigger>
                                   <AccordionContent className="space-y-4">
                                       <div className="flex items-center justify-end gap-2 px-4">
                                           <Button variant="outline" size="sm" asChild>
                                               <Link href={`/orders/${orderId}/items/${item.id}/edit`}>
                                                   <Edit className="mr-2 h-4 w-4" />
                                                   Засах
                                               </Link>
                                           </Button>
                                           <Button variant="destructive" size="sm" onClick={() => setItemToDelete(item)}>
                                               <Trash2 className="mr-2 h-4 w-4" />
                                               Устгах
                                           </Button>
                                       </div>
                                   </AccordionContent>
                               </AccordionItem>
                           ))}
                        </Accordion>
                        ) : (
                            <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Тээвэрлэлт одоогоор алга.</div>
                        )}
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
                            onSubmit={onNewItemSubmit}
                            onAddNewItem={handleAddNewItem}
                        />
                    </CardContent>
                </Card>

                {orderItems.length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Үнийн санал цуглуулах</CardTitle>
                            <CardDescription>Тээвэрлэлт тус бүрээр үнийн санал авч, жолооч сонгох хэсэг.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={orderItems[0].id} className="w-full">
                                <TabsList className="mb-4">
                                    {orderItems.map((item, index) => (
                                        <TabsTrigger key={item.id} value={item.id}>Тээвэрлэлт #{index + 1}</TabsTrigger>
                                    ))}
                                </TabsList>
                                {orderItems.map((item) => (
                                    <TabsContent key={item.id} value={item.id} className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold">Шинэ үнийн санал нэмэх</h4>
                                            <Button variant="outline" size="sm" onClick={handlePrint} disabled={isPrinting}>
                                                {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                                PDF татах
                                            </Button>
                                        </div>
                                        <QuoteForm orderItemId={item.id} />
                                        <h4 className="font-semibold pt-4">Ирсэн саналууд</h4>
                                         <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Жолооч</TableHead>
                                                    <TableHead>Эцсийн үнэ</TableHead>
                                                    <TableHead>Статус</TableHead>
                                                    <TableHead className="text-right">Үйлдэл</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {quotes.get(item.id)?.length > 0 ? (
                                                    quotes.get(item.id)?.map(quote => (
                                                        <TableRow key={quote.id} className={quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50' : ''}>
                                                            <TableCell>
                                                                <p className="font-medium">{quote.driverName}</p>
                                                                <p className="text-xs text-muted-foreground">{quote.driverPhone}</p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-medium text-primary">{calculateFinalPrice(item, quote).toLocaleString()}₮</p>
                                                                <p className="text-xs text-muted-foreground">Жолооч: {quote.price.toLocaleString()}₮</p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={quote.status === 'Accepted' ? 'default' : quote.status === 'Rejected' ? 'destructive' : 'secondary'}>
                                                                    {quote.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    {quote.status === 'Accepted' ? (
                                                                         <Button size="sm" variant="destructive" onClick={() => handleRevertQuoteSelection(item)} disabled={isSubmitting}>
                                                                             <XCircle className="mr-2 h-4 w-4"/> Буцаах
                                                                         </Button>
                                                                    ) : (
                                                                        <Button size="sm" onClick={() => handleAcceptQuote(item, quote)} disabled={isSubmitting || !!item.acceptedQuoteId}>
                                                                            <CheckCircle className="mr-2 h-4 w-4"/> Сонгох
                                                                        </Button>
                                                                    )}

                                                                    {quote.status !== 'Accepted' && (
                                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteQuote(quote.id)} disabled={isSubmitting}>
                                                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow><TableCell colSpan={4} className="text-center h-24">Үнийн санал олдсонгүй.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
      </div>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Энэ тээвэрлэлтийг устгах гэж байна. Энэ үйлдэл нь холбогдох үнийн саналуудын хамт устгагдах болно.
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

        {/* Hidden printable component */}
        <div className="absolute -left-[9999px] top-auto">
             <div ref={printRef}>
                {orderItems.map((item, index) => (
                    <QuotePrintLayout 
                        key={item.id}
                        order={order} 
                        orderItem={item} 
                        quotes={quotes.get(item.id) || []}
                        itemIndex={index}
                        calculateFinalPrice={calculateFinalPrice}
                     />
                ))}
             </div>
        </div>
    </div>
  );
}
