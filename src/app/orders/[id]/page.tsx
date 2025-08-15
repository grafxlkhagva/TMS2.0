

'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, Timestamp, updateDoc, writeBatch, orderBy, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, CustomerEmployee, VehicleType, TrailerType, Region, PackagingType, DriverQuote, OrderItemCargo, Shipment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, PlusCircle, Trash2, Edit, Loader2, CheckCircle, XCircle, CircleDollarSign, Info, Truck, ExternalLink, Download } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';


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

async function generateShipmentNumber() {
    const counterRef = doc(db, 'counters', 'shipmentCounter');
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
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `SHP-${year}${month}-${String(newCount).padStart(4, '0')}`;
}


export default function OrderDetailPage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [quotes, setQuotes] = React.useState<Map<string, DriverQuote[]>>(new Map());
  const [shipments, setShipments] = React.useState<Map<string, Shipment>>(new Map());
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
  const [itemToShip, setItemToShip] = React.useState<OrderItem | null>(null);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = React.useState(false);
  const [selectedItemsForQuote, setSelectedItemsForQuote] = React.useState<Set<string>>(new Set());
  
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

      const [itemsSnap, warehouseSnap, serviceTypeSnap, employeesSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap, shipmentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
        getDocs(query(collection(db, "warehouses"), orderBy("name"))),
        getDocs(query(collection(db, "service_types"), orderBy("name"))),
        getDocs(query(collection(db, 'customer_employees'), where('customerId', '==', currentOrder.customerId))),
        getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
        getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
        getDocs(query(collection(db, "regions"), orderBy("name"))),
        getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
        getDocs(query(collection(db, 'shipments'), where('orderId', '==', orderId))),
      ]);
      
      const itemsDataPromises: Promise<OrderItem>[] = itemsSnap.docs.map(async (d) => {
        const itemData = d.data();
        const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', d.id));
        const cargoSnapshot = await getDocs(cargoQuery);
        const cargoItems = cargoSnapshot.docs.map(cargoDoc => ({ id: cargoDoc.id, ...cargoDoc.data() } as OrderItemCargo));
        
        return {
            id: d.id, 
            ...itemData,
            createdAt: itemData.createdAt.toDate(),
            loadingStartDate: itemData.loadingStartDate instanceof Timestamp ? itemData.loadingStartDate.toDate() : new Date(itemData.loadingStartDate),
            loadingEndDate: itemData.loadingEndDate instanceof Timestamp ? itemData.loadingEndDate.toDate() : new Date(itemData.loadingEndDate),
            unloadingStartDate: itemData.unloadingStartDate instanceof Timestamp ? itemData.unloadingStartDate.toDate() : new Date(itemData.unloadingStartDate),
            unloadingEndDate: itemData.unloadingEndDate instanceof Timestamp ? itemData.unloadingEndDate.toDate() : new Date(itemData.unloadingEndDate),
            cargoItems: cargoItems
        } as OrderItem
      });

      const itemsData = await Promise.all(itemsDataPromises);
      itemsData.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setOrderItems(itemsData);
      
      const initialSelectedItems = new Set<string>();
      itemsData.forEach(item => {
        if(item.acceptedQuoteId) {
            initialSelectedItems.add(item.id);
        }
      });
      setSelectedItemsForQuote(initialSelectedItems);

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
          quotesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          quotesMap.set(item.id, quotesData);
      }
      setQuotes(quotesMap);
      
      const shipmentsMap = new Map<string, Shipment>();
      shipmentsSnap.forEach(doc => {
          const shipment = {id: doc.id, ...doc.data()} as Shipment;
          shipmentsMap.set(shipment.orderItemId, shipment);
      });
      setShipments(shipmentsMap);

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
      
      const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', itemToDelete.id));
      const cargoSnapshot = await getDocs(cargoQuery);
      cargoSnapshot.forEach(doc => batch.delete(doc.ref));

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

        const { finalPrice } = calculateFinalPrice(item, quoteToAccept);

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
        console.error("Error accepting quote:", error);
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
        console.error("Error reverting quote:", error);
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
  
  const handleCreateShipment = async () => {
    if (!itemToShip || !order || !itemToShip.acceptedQuoteId) return;

    setIsSubmitting(true);
    try {
        const acceptedQuote = (quotes.get(itemToShip.id) || []).find(q => q.id === itemToShip.acceptedQuoteId);
        if (!acceptedQuote) {
            toast({ variant: "destructive", title: "Алдаа", description: "Сонгогдсон үнийн санал олдсонгүй."});
            return;
        }
        
        const shipmentNumber = await generateShipmentNumber();
        const batch = writeBatch(db);

        // 1. Create new shipment document
        const shipmentRef = doc(collection(db, 'shipments'));
        batch.set(shipmentRef, {
            shipmentNumber,
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderItemId: itemToShip.id,
            customerId: order.customerId,
            customerName: order.customerName,
            driverInfo: {
                name: acceptedQuote.driverName,
                phone: acceptedQuote.driverPhone,
                quoteId: acceptedQuote.id
            },
            route: {
                startRegion: getRegionName(itemToShip.startRegionId),
                endRegion: getRegionName(itemToShip.endRegionId),
                startWarehouse: getWarehouseName(itemToShip.startWarehouseId),
                endWarehouse: getWarehouseName(itemToShip.endWarehouseId),
            },
            vehicleInfo: {
                vehicleType: getVehicleTypeName(itemToShip.vehicleTypeId),
                trailerType: getTrailerTypeName(itemToShip.trailerTypeId),
            },
            status: 'Preparing',
            createdAt: serverTimestamp(),
            estimatedDeliveryDate: itemToShip.unloadingEndDate,
        });

        // 2. Update order item status
        const orderItemRef = doc(db, 'order_items', itemToShip.id);
        batch.update(orderItemRef, { status: 'Shipped' });

        await batch.commit();

        toast({ title: "Амжилттай", description: `${shipmentNumber} дугаартай шинэ тээвэрлэлт үүслээ.`});
        fetchOrderData(); // Refresh data
    } catch (error) {
        console.error("Error creating shipment:", error);
        toast({ variant: "destructive", title: "Алдаа", description: "Тээвэр үүсгэхэд алдаа гарлаа."});
    } finally {
        setIsSubmitting(false);
        setItemToShip(null);
    }
  }

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
  
  const getRegionName = (id: string) => regions.find(r => r.id === id)?.name || 'N/A';
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || 'N/A';
  const getVehicleTypeName = (id: string) => vehicleTypes.find(v => v.id === id)?.name || 'N/A';
  const getTrailerTypeName = (id: string) => trailerTypes.find(t => t.id === id)?.name || 'N/A';

  const handleSelectItemForQuote = (itemId: string) => {
    setSelectedItemsForQuote(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        return newSet;
    });
  };

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
    const priceWithProfit = quote.price * (1 + (item.profitMargin || 0) / 100);
    const vatAmount = item.withVAT ? priceWithProfit * 0.1 : 0;
    const finalPrice = priceWithProfit + vatAmount;
    return {
        priceWithProfit,
        vatAmount,
        finalPrice,
    };
  }

  const allData = {
    serviceTypes,
    regions,
    warehouses,
    vehicleTypes,
    trailerTypes,
    packagingTypes,
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
             <div className="flex items-center gap-2">
                <Button asChild>
                    <Link href={`/orders/${order.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Захиалга засах
                    </Link>
                </Button>
            </div>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 space-y-6 sticky top-6">
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
                                   <div className="flex items-center gap-4 w-full pr-4 border-b">
                                       <div className="py-4 pl-4">
                                            <Checkbox
                                                id={`select-item-${item.id}`}
                                                checked={selectedItemsForQuote.has(item.id)}
                                                onCheckedChange={() => handleSelectItemForQuote(item.id)}
                                                disabled={!item.acceptedQuoteId}
                                                aria-label="Нэгдсэн саналд нэмэх"
                                            />
                                       </div>
                                       <AccordionTrigger className="flex-1 py-4 pr-0 border-b-0">
                                            <div className="flex justify-between items-center w-full gap-4">
                                                <div className="text-left flex-1 min-w-0">
                                                    <p className="font-semibold truncate">Тээвэрлэлт #{index + 1}: {getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}</p>
                                                    <p className="text-sm text-muted-foreground">{format(new Date(item.loadingStartDate), "yyyy-MM-dd")}</p>
                                                </div>
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    {item.finalPrice != null && (
                                                        <p className="font-semibold text-primary">{item.finalPrice.toLocaleString()}₮</p>
                                                    )}
                                                    <Badge variant={item.status === 'Assigned' ? 'default' : item.status === 'Shipped' ? 'success' : 'secondary'}>{item.status}</Badge>
                                                </div>
                                           </div>
                                       </AccordionTrigger>
                                   </div>
                                   <AccordionContent className="space-y-4">
                                       <div className="flex items-center justify-end gap-2 px-4 pb-4 border-b">
                                           {shipments.has(item.id) ? (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/shipments/${shipments.get(item.id)?.id}`}>
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        Тээвэрлэлт рүү
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button variant="default" size="sm" onClick={() => setItemToShip(item)} disabled={!item.acceptedQuoteId || item.status === 'Shipped'}>
                                                    <Truck className="mr-2 h-4 w-4" />
                                                    Тээвэр үүсгэх
                                                </Button>
                                            )}
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
                                       <div className="px-4 space-y-4">
                                         <h4 className="font-semibold pt-2">Шинэ үнийн санал нэмэх</h4>
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
                                                    quotes.get(item.id)?.map(quote => {
                                                        const { finalPrice } = calculateFinalPrice(item, quote);
                                                        return (
                                                        <TableRow key={quote.id} className={quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50' : ''}>
                                                            <TableCell>
                                                                <p className="font-medium">{quote.driverName}</p>
                                                                <p className="text-xs text-muted-foreground">{quote.driverPhone}</p>
                                                            </TableCell>
                                                             <TableCell>
                                                                <p className="font-bold text-base text-primary pt-1">{finalPrice.toLocaleString()}₮</p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={quote.status === 'Accepted' ? 'default' : quote.status === 'Rejected' ? 'destructive' : 'secondary'}>
                                                                    {quote.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    {item.acceptedQuoteId === quote.id ? (
                                                                         <Button size="sm" variant="destructive" onClick={() => handleRevertQuoteSelection(item)} disabled={isSubmitting || item.status === 'Shipped'}>
                                                                             <XCircle className="mr-2 h-4 w-4"/> Буцаах
                                                                         </Button>
                                                                    ) : (
                                                                        <Button size="sm" onClick={() => handleAcceptQuote(item, quote)} disabled={isSubmitting || !!item.acceptedQuoteId || item.status === 'Shipped'}>
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
                                                    )})
                                                ) : (
                                                    <TableRow><TableCell colSpan={4} className="text-center h-24">Үнийн санал олдсонгүй.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
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
                            allData={allData}
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
        
       <AlertDialog open={!!itemToShip} onOpenChange={(open) => !open && setItemToShip(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Тээвэрлэлт үүсгэх</AlertDialogTitle>
                    <AlertDialogDescription>
                        Та энэ тээвэрлэлтийг баталгаажуулж, шинэ тээвэр үүсгэхдээ итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreateShipment} disabled={isSubmitting}>
                        {isSubmitting ? "Үүсгэж байна..." : "Тийм, үүсгэх"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
