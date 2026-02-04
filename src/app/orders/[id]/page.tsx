

'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, Timestamp, updateDoc, writeBatch, orderBy, runTransaction, type DocumentReference, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, CustomerEmployee, VehicleType, TrailerType, Region, PackagingType, DriverQuote, OrderItemCargo, Shipment, SystemUser, Driver, Vehicle, DriverWithVehicle } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, PlusCircle, Trash2, Edit, Loader2, CheckCircle, XCircle, CircleDollarSign, Info, Truck, ExternalLink, Download, Megaphone, MegaphoneOff, Calendar, Package, MapPin, UserPlus, FileSpreadsheet, Send, CheckIcon, ChevronsUpDown, X } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { OrderDetailHeader } from "@/components/orders/order-detail-header";
import { OrderMap } from "@/components/orders/order-map";
import { ShipmentList } from "@/components/orders/shipments/shipment-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
    tenderStatus: z.enum(['Open', 'Closed']).optional(),
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



const toDateSafe = (date: any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    // Handle Firestore-like object structure from serialization
    if (typeof date === 'object' && date !== null && !Array.isArray(date) && 'seconds' in date && 'nanoseconds' in date) {
        // This is a basic check; you might want more robust validation
        return new Timestamp(date.seconds, date.nanoseconds).toDate();
    }
    // Basic check for string that could be a date
    if (typeof date === 'string' && date.length > 5 && (date.includes('-') || date.includes('/'))) {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    // Return a default or invalid date if parsing fails, to avoid crashes.
    return new Date(0);
};


async function generateShipmentNumber() {
    if (!db) throw new Error("Database not initialized");
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
    const [transportManagers, setTransportManagers] = React.useState<SystemUser[]>([]);
    const [drivers, setDrivers] = React.useState<DriverWithVehicle[]>([]);


    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [itemToDelete, setItemToDelete] = React.useState<OrderItem | null>(null);
    const [itemToShip, setItemToShip] = React.useState<OrderItem | null>(null);
    const [isUpdatingEmployee, setIsUpdatingEmployee] = React.useState(false);
    const [sendingToSheet, setSendingToSheet] = React.useState<string | null>(null);
    const [showDeleteOrderDialog, setShowDeleteOrderDialog] = React.useState(false);
    const [isDeletingOrder, setIsDeletingOrder] = React.useState(false);


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

    const financialStats = React.useMemo(() => {
        let totalRevenue = 0;
        let totalProfit = 0;

        orderItems.forEach(item => {
            if (item.status === 'Cancelled') return;
            totalRevenue += item.finalPrice || 0;

            if (item.acceptedQuoteId) {
                const itemQuotes = quotes.get(item.id) || [];
                const acceptedQuote = itemQuotes.find(q => q.id === item.acceptedQuoteId);
                if (acceptedQuote) {
                    const margin = (item.profitMargin || 0) / 100;
                    totalProfit += acceptedQuote.price * margin;
                }
            }
        });

        return { totalRevenue, totalProfit };
    }, [orderItems, quotes]);

    const selectedEmployee = React.useMemo(() => {
        if (!order || !customerEmployees.length) return null;
        return customerEmployees.find(e => e.id === order.employeeId);
    }, [order, customerEmployees]);

    const fetchOrderData = React.useCallback(async () => {
        if (!orderId || !db) return;
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
                createdAt: toDateSafe(data.createdAt)
            } as Order;
            setOrder(currentOrder);

            const [
                itemsSnap,
                warehouseSnap,
                serviceTypeSnap,
                employeesSnap,
                vehicleTypeSnap,
                trailerTypeSnap,
                regionSnap,
                packagingTypeSnap,
                shipmentsSnap,
                managersSnap,
                driversSnap,
                vehiclesSnap
            ] = await Promise.all([
                getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
                getDocs(query(collection(db, "warehouses"), orderBy("name"))),
                getDocs(query(collection(db, "service_types"), orderBy("name"))),
                getDocs(query(collection(db, 'customer_employees'), where('customerId', '==', currentOrder.customerId))),
                getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
                getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
                getDocs(query(collection(db, "regions"), orderBy("name"))),
                getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
                getDocs(query(collection(db, 'shipments'), where('orderId', '==', orderId))),
                getDocs(query(collection(db, 'users'), where('role', '==', 'transport_manager'))),
                getDocs(query(collection(db, 'Drivers'), orderBy('display_name'))),
                getDocs(query(collection(db, "vehicles"))),
            ]);

            setTransportManagers(managersSnap.docs.map(d => d.data() as SystemUser));

            const vehiclesData = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
            const vehicleTypesMap = new Map(vehicleTypeSnap.docs.map(doc => [doc.id, doc.data().name]));
            const trailerTypesMap = new Map(trailerTypeSnap.docs.map(doc => [doc.id, doc.data().name]));

            const vehiclesByDriverId = new Map<string, Vehicle & { vehicleTypeName?: string; trailerTypeName?: string; }>();
            vehiclesData.forEach(vehicle => {
                if (vehicle.driverId) {
                    vehiclesByDriverId.set(vehicle.driverId, {
                        ...vehicle,
                        vehicleTypeName: vehicleTypesMap.get(vehicle.vehicleTypeId),
                        trailerTypeName: trailerTypesMap.get(vehicle.trailerTypeId),
                    });
                }
            });

            const driversData = driversSnap.docs.map(doc => {
                const docData = doc.data() as Driver;
                const driverId = doc.id;
                return {
                    ...docData,
                    id: driverId,
                    created_time: toDateSafe(docData.created_time),
                    vehicle: vehiclesByDriverId.get(driverId),
                } as DriverWithVehicle;
            });
            setDrivers(driversData);

            const itemsDataPromises: Promise<OrderItem>[] = itemsSnap.docs.map(async (d) => {
                const itemData = d.data();
                const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', d.id));
                const cargoSnapshot = await getDocs(cargoQuery);
                const cargoItems = cargoSnapshot.docs.map(cargoDoc => ({ id: cargoDoc.id, ...cargoDoc.data() } as OrderItemCargo));

                return {
                    id: d.id,
                    ...itemData,
                    createdAt: toDateSafe(itemData.createdAt),
                    loadingStartDate: toDateSafe(itemData.loadingStartDate),
                    loadingEndDate: toDateSafe(itemData.loadingEndDate),
                    unloadingStartDate: toDateSafe(itemData.unloadingStartDate),
                    unloadingEndDate: toDateSafe(itemData.unloadingEndDate),
                    cargoItems: cargoItems
                } as OrderItem
            });

            const itemsData = await Promise.all(itemsDataPromises);
            itemsData.sort((a, b) => toDateSafe(a.createdAt).getTime() - toDateSafe(b.createdAt).getTime());
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
                        createdAt: toDateSafe(data.createdAt)
                    } as DriverQuote
                });
                quotesData.sort((a, b) => toDateSafe(b.createdAt).getTime() - toDateSafe(a.createdAt).getTime());
                quotesMap.set(item.id, quotesData);
            }
            setQuotes(quotesMap);

            const shipmentsMap = new Map<string, Shipment>();
            shipmentsSnap.forEach(doc => {
                const shipment = { id: doc.id, ...doc.data() } as Shipment;
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

    const handleDeleteOrder = async () => {
        if (!order || !db) return;
        setIsDeletingOrder(true);
        
        // Blur active element to prevent aria-hidden focus conflict
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        try {
            const batch = writeBatch(db);
            const orderRef = doc(db, 'orders', order.id);

            const itemsQuery = query(collection(db, 'order_items'), where('orderId', '==', order.id));
            const itemsSnapshot = await getDocs(itemsQuery);

            for (const itemDoc of itemsSnapshot.docs) {
                const itemRef = itemDoc.ref;
                const quotesQuery = query(collection(db, 'driver_quotes'), where('orderItemRef', '==', itemRef));
                const quotesSnapshot = await getDocs(quotesQuery);
                quotesSnapshot.forEach(quoteDoc => batch.delete(quoteDoc.ref));

                const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemRef', '==', itemRef));
                const cargoSnapshot = await getDocs(cargoQuery);
                cargoSnapshot.forEach(cargoDoc => batch.delete(cargoDoc.ref));

                batch.delete(itemRef);
            }
            batch.delete(orderRef);

            await batch.commit();

            toast({ title: 'Амжилттай', description: `Захиалга устгагдлаа.` });
            
            // Close dialog first, then navigate after a short delay
            setIsDeletingOrder(false);
            setShowDeleteOrderDialog(false);
            
            setTimeout(() => {
                router.push('/orders');
            }, 100);
        } catch (error) {
            console.error("Error deleting order:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга устгахад алдаа гарлаа.' });
            setIsDeletingOrder(false);
            setShowDeleteOrderDialog(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete || !db) return;
        setIsSubmitting(true);
        
        // Blur active element to prevent aria-hidden focus conflict
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        try {
            const batch = writeBatch(db);
            const itemRef = doc(db, 'order_items', itemToDelete.id);

            // Delete related quotes, cargoes, and shipments
            const quotesQuery = query(collection(db, 'driver_quotes'), where('orderItemRef', '==', itemRef));
            const quotesSnapshot = await getDocs(quotesQuery);
            quotesSnapshot.forEach(doc => batch.delete(doc.ref));

            const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemRef', '==', itemRef));
            const cargoSnapshot = await getDocs(cargoQuery);
            cargoSnapshot.forEach(doc => batch.delete(doc.ref));

            const shipmentQuery = query(collection(db, 'shipments'), where('orderItemRef', '==', itemRef));
            const shipmentSnapshot = await getDocs(shipmentQuery);
            shipmentSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete the item itself
            batch.delete(itemRef);
            await batch.commit();

            setOrderItems(prev => prev.filter(i => i.id !== itemToDelete.id));
            toast({ title: 'Амжилттай', description: 'Тээвэрлэлт устгагдлаа.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
            setItemToDelete(null);
        }
    };

    const handleDuplicateItem = async (item: OrderItem) => {
        if (!orderId || !db) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const newItemRef = doc(collection(db, 'order_items'));

            // Exclude ID and specific status fields
            const { id, status, acceptedQuoteId, finalPrice, createdAt, loadingStartDate, loadingEndDate, unloadingStartDate, unloadingEndDate, ...rest } = item;

            // Simple date duplication for now (keeping same dates for simplicity, user can edit)
            batch.set(newItemRef, {
                ...rest,
                orderId: orderId,
                orderRef: doc(db, 'orders', orderId),
                status: 'Pending',
                tenderStatus: 'Closed',
                loadingStartDate: loadingStartDate,
                loadingEndDate: loadingEndDate,
                unloadingStartDate: unloadingStartDate,
                unloadingEndDate: unloadingEndDate,
                createdAt: serverTimestamp(),
            });

            // Duplicate Cargo
            const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', item.id));
            const cargoSnapshot = await getDocs(cargoQuery);
            cargoSnapshot.forEach(cargoDoc => {
                const cargoData = cargoDoc.data();
                const newCargoRef = doc(collection(db, 'order_item_cargoes'));
                batch.set(newCargoRef, {
                    ...cargoData,
                    orderItemId: newItemRef.id,
                    orderItemRef: newItemRef
                });
            });

            await batch.commit();
            toast({ title: 'Амжилттай', description: 'Тээвэрлэлт хувилагдлаа.' });
            fetchOrderData();
        } catch (error) {
            console.error("Error duplicating item:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт хувилахад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    async function handleEmployeeChange(newEmployeeId: string) {
        if (!order || !db) return;
        setIsUpdatingEmployee(true);
        try {
            const selectedEmployee = customerEmployees.find(e => e.id === newEmployeeId);
            if (!selectedEmployee) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Сонгогдсон ажилтан олдсонгүй.' });
                return;
            }

            const orderDocRef = doc(db, 'orders', order.id);
            const employeeRef = doc(db, 'customer_employees', newEmployeeId);
            await updateDoc(orderDocRef, {
                employeeId: newEmployeeId,
                employeeName: `${selectedEmployee.lastName} ${selectedEmployee.firstName}`,
                employeeRef: employeeRef,
            });

            setOrder(prevOrder => prevOrder ? {
                ...prevOrder,
                employeeId: newEmployeeId,
                employeeName: `${selectedEmployee.lastName} ${selectedEmployee.firstName}`,
                employeeRef: employeeRef
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
        if (!orderId || !db) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const orderRef = doc(db, 'orders', orderId);

            values.items.forEach((item: any) => {
                const { loadingDateRange, unloadingDateRange, cargoItems, ...rest } = item;

                const orderItemRef = doc(collection(db, 'order_items'));
                batch.set(orderItemRef, {
                    ...rest,
                    orderId: orderId,
                    orderRef: orderRef,
                    startRegionRef: doc(db, 'regions', item.startRegionId),
                    startWarehouseRef: doc(db, 'warehouses', item.startWarehouseId),
                    endRegionRef: doc(db, 'regions', item.endRegionId),
                    endWarehouseRef: doc(db, 'warehouses', item.endWarehouseId),
                    serviceTypeRef: doc(db, 'service_types', item.serviceTypeId),
                    vehicleTypeRef: doc(db, 'vehicle_types', item.vehicleTypeId),
                    trailerTypeRef: doc(db, 'trailer_types', item.trailerTypeId),
                    loadingStartDate: loadingDateRange.from,
                    loadingEndDate: loadingDateRange.to,
                    unloadingStartDate: unloadingDateRange.from,
                    unloadingEndDate: unloadingDateRange.to,
                    status: 'Pending',
                    tenderStatus: 'Closed',
                    createdAt: serverTimestamp(),
                });

                cargoItems.forEach((cargo: any) => {
                    const cargoRef = doc(collection(db, 'order_item_cargoes'));
                    batch.set(cargoRef, {
                        ...cargo,
                        orderItemId: orderItemRef.id,
                        orderItemRef: orderItemRef,
                        packagingTypeId: cargo.packagingTypeId,
                        packagingTypeRef: doc(db, 'packaging_types', cargo.packagingTypeId),
                    });
                });
            });

            await batch.commit();

            toast({ title: 'Амжилттай', description: 'Шинэ тээвэрлэлтүүд нэмэгдлээ.' });
            form.reset({ items: [] });
            fetchOrderData(); // Refetch data to show new items
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээвэрлэлт нэмэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleAcceptQuote = async (item: OrderItem, quoteToAccept: DriverQuote) => {
        if (!db) return;
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
        if (!db) return;
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
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'driver_quotes', quoteId));
            toast({ title: 'Амжилттай', description: 'Үнийн санал устгагдлаа.' });
            fetchOrderData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Үнийн санал устгахад алдаа гарлаа.' });
        }
    }

    const handleCreateShipment = async () => {
        if (!itemToShip || !order || !itemToShip.acceptedQuoteId || !db) return;

        setIsSubmitting(true);
        
        // Blur active element to prevent aria-hidden focus conflict
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        try {
            const acceptedQuote = (quotes.get(itemToShip.id) || []).find(q => q.id === itemToShip.acceptedQuoteId);
            if (!acceptedQuote) {
                toast({ variant: "destructive", title: "Алдаа", description: "Сонгогдсон үнийн санал олдсонгүй." });
                return;
            }

            const shipmentNumber = await generateShipmentNumber();
            const batch = writeBatch(db);

            // 1. Create new shipment document
            const shipmentRef = doc(collection(db, 'shipments'));
            const orderRef = doc(db, 'orders', order.id);
            const orderItemRef = doc(db, 'order_items', itemToShip.id);
            const customerRef = doc(db, 'customers', order.customerId);
            const startWarehouseRef = doc(db, 'warehouses', itemToShip.startWarehouseId);
            const endWarehouseRef = doc(db, 'warehouses', itemToShip.endWarehouseId);

            batch.set(shipmentRef, {
                shipmentNumber,
                orderId: order.id,
                orderRef: orderRef,
                orderNumber: order.orderNumber,
                orderItemId: itemToShip.id,
                orderItemRef: orderItemRef,
                customerId: order.customerId,
                customerRef: customerRef,
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
                routeRefs: {
                    startWarehouseRef: startWarehouseRef,
                    endWarehouseRef: endWarehouseRef,
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
            batch.update(orderItemRef, { status: 'Shipped' });

            await batch.commit();

            toast({ title: "Амжилттай", description: `${shipmentNumber} дугаартай шинэ тээвэрлэлт үүслээ.` });
            fetchOrderData(); // Refresh data
        } catch (error) {
            console.error("Error creating shipment:", error);
            toast({ variant: "destructive", title: "Алдаа", description: "Тээвэр үүсгэхэд алдаа гарлаа." });
        } finally {
            setIsSubmitting(false);
            setItemToShip(null);
        }
    }

    const handleToggleTenderStatus = async (item: OrderItem) => {
        if (!db) return;
        const newStatus = item.tenderStatus === 'Open' ? 'Closed' : 'Open';
        try {
            const itemRef = doc(db, 'order_items', item.id);
            await updateDoc(itemRef, { tenderStatus: newStatus });
            toast({ title: 'Амжилттай', description: `Тендерийн статус "${newStatus === 'Open' ? 'Нээлттэй' : 'Хаалттай'}" боллоо.` });
            fetchOrderData(); // Refresh data to show new status
        } catch (error) {
            console.error("Error updating tender status:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Тендерийн статус шинэчлэхэд алдаа гарлаа.' });
        }
    }

    const allData = {
        serviceTypes,
        regions,
        warehouses,
        vehicleTypes,
        trailerTypes,
        packagingTypes,
    };

    const handleSendToSheet = async (item: OrderItem, quote: DriverQuote) => {
        if (!order) return;
        setSendingToSheet(quote.id);
        try {
            const customerEmployee = customerEmployees.find(e => e.id === order.employeeId);
            const transportManager = transportManagers.find(m => m.uid === order.transportManagerId);

            const payload = {
                order,
                orderItem: item,
                quote,
                allData,
                customerEmployee,
                transportManager,
            };

            const response = await fetch('/api/quotes/send-to-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Sheet-рүү илгээхэд алдаа гарлаа.');
            }

            toast({ title: 'Амжилттай', description: 'Үнийн саналыг Google Sheet-рүү илгээлээ.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: (error as Error).message });
        } finally {
            setSendingToSheet(null);
        }
    };


    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-48" />
                <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
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
    const getChannelName = (channel: 'Phone' | 'App') => channel === 'Phone' ? 'Утсаар' : 'Апп-р';

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
            tenderStatus: 'Closed',
            cargoItems: [],
        });
    };

    const calculateFinalPrice = (item: OrderItem, quote: DriverQuote) => {
        const profitMargin = (item.profitMargin || 0) / 100;
        const driverPrice = quote.price;

        const priceWithProfit = driverPrice * (1 + profitMargin);
        const vatAmount = item.withVAT ? priceWithProfit * 0.1 : 0;
        const finalPrice = priceWithProfit + vatAmount;
        const profitAmount = priceWithProfit - driverPrice;

        return {
            priceWithProfit,
            vatAmount,
            finalPrice,
            profitAmount
        };
    }

    const getItemStatusBadgeVariant = (status: OrderItem['status']) => {
        switch (status) {
            case 'Delivered':
                return 'success';
            case 'Assigned':
            case 'Shipped':
            case 'In Transit':
                return 'default';
            case 'Cancelled':
                return 'destructive';
            case 'Pending':
            default:
                return 'secondary';
        }
    };



    return (
        <div className="container mx-auto py-6 space-y-6">
            <OrderDetailHeader order={order} onDelete={() => setShowDeleteOrderDialog(true)} />

            <Tabs defaultValue="overview" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="overview">Тойм</TabsTrigger>
                    <TabsTrigger value="shipments">Тээвэрлэлт</TabsTrigger>
                    <TabsTrigger value="financials">Санхүү</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4 border rounded-xl overflow-hidden bg-card text-card-foreground shadow h-[500px]">
                            <OrderMap order={order} orderItems={orderItems} warehouses={warehouses} />
                        </div>
                        <Card className="col-span-3 h-full">
                            <CardHeader>
                                <CardTitle>Үндсэн мэдээлэл</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <OrderDetailItem icon={Building} label="Харилцагч" value={<Link href={`/customers/${order.customerId}`} className="text-primary hover:underline">{order.customerName}</Link>} />
                                <OrderDetailItem
                                    icon={User}
                                    label="Харилцагчийн ажилтан"
                                    value={
                                        selectedEmployee ? (
                                            <div>
                                                <p>{selectedEmployee.lastName} {selectedEmployee.firstName}</p>
                                                <p className="text-xs text-muted-foreground">{selectedEmployee.phone} &bull; {selectedEmployee.email}</p>
                                            </div>
                                        ) : order.employeeName
                                    }
                                />
                                <OrderDetailItem icon={User} label="Тээврийн менежер" value={order.transportManagerName} />
                                {financialStats.totalRevenue > 0 && (
                                    <OrderDetailItem icon={CircleDollarSign} label="Нийт үнийн дүн" value={`${Math.round(financialStats.totalRevenue).toLocaleString()}₮`} />
                                )}
                                <OrderDetailItem icon={FileText} label="Статус" value={<Badge>{order.status}</Badge>} />
                                <OrderDetailItem icon={User} label="Бүртгэсэн хэрэглэгч" value={order.createdBy.name} />
                                <OrderDetailItem icon={FileText} label="Бүртгэсэн огноо" value={order.createdAt.toLocaleString()} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="shipments" className="space-y-6">
                    <ShipmentList
                        orderItems={orderItems}
                        shipments={shipments}
                        quotes={quotes}
                        drivers={drivers}
                        setDrivers={setDrivers}
                        onFetchOrderData={fetchOrderData}
                        db={db}
                        isSubmitting={isSubmitting}
                        sendingToSheet={sendingToSheet}
                        orderId={orderId}
                        onToggleTenderStatus={handleToggleTenderStatus}
                        onSetItemToShip={setItemToShip}
                        onSetItemToDelete={setItemToDelete}
                        onDuplicateItem={handleDuplicateItem}
                        onAcceptQuote={handleAcceptQuote}
                        onRevertQuote={handleRevertQuoteSelection}
                        onDeleteQuote={handleDeleteQuote}
                        onSendToSheet={handleSendToSheet}
                        getRegionName={getRegionName}
                        getWarehouseName={getWarehouseName}
                        getVehicleTypeName={getVehicleTypeName}
                        getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Шинэ тээвэрлэлт нэмэх</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OrderItemForm
                                form={form}
                                fields={fields}
                                remove={remove}
                                isSubmitting={isSubmitting}
                                onSubmit={onNewItemSubmit}
                                onAddNewItem={handleAddNewItem}
                                allData={allData}
                                setAllData={{
                                    setServiceTypes,
                                    setRegions,
                                    setWarehouses,
                                    setVehicleTypes,
                                    setTrailerTypes,
                                    setPackagingTypes,
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="financials">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Нийт зардал</CardTitle>
                                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₮{Math.round(financialStats.totalRevenue).toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">Бүх тээвэрлэлтийн нийлбэр</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Төлөвлөсөн ашиг</CardTitle>
                                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", financialStats.totalProfit > 0 ? "text-green-600" : "text-muted-foreground")}>
                                    +{Math.round(financialStats.totalProfit).toLocaleString()}₮
                                </div>
                                <p className="text-xs text-muted-foreground">Тооцоолсон ашиг</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !isSubmitting && setItemToDelete(open ? itemToDelete : null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ тээвэрлэлтийг устгах гэж байна. Энэ үйлдэл нь холбогдох үнийн санал, ачаа, тээврийн мэдээллийг хамт устгах болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Цуцлах</AlertDialogCancel>
                        <Button 
                            onClick={handleDeleteItem}
                            disabled={isSubmitting} 
                            variant="destructive"
                        >
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Устгаж байна...</> : "Устгах"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!itemToShip} onOpenChange={(open) => !isSubmitting && setItemToShip(open ? itemToShip : null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Тээвэрлэлт үүсгэх</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та энэ тээвэрлэлтийг баталгаажуулж, шинэ тээвэр үүсгэхдээ итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Цуцлах</AlertDialogCancel>
                        <Button 
                            onClick={handleCreateShipment}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Үүсгэж байна...</> : "Тийм, үүсгэх"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteOrderDialog} onOpenChange={(open) => !isDeletingOrder && setShowDeleteOrderDialog(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Захиалга устгах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та энэ захиалгыг бүрмөсөн устгахдаа итгэлтэй байна уу? Энэ захиалгатай холбоотой бүх тээвэрлэлт, үнийн саналууд устах болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingOrder}>Цуцлах</AlertDialogCancel>
                        <Button 
                            onClick={handleDeleteOrder}
                            disabled={isDeletingOrder} 
                            variant="destructive"
                        >
                            {isDeletingOrder ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Устгаж байна...</> : "Устгах"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
