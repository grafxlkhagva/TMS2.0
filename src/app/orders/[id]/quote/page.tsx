
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, VehicleType, TrailerType, Region, PackagingType, OrderItemCargo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format, toDate } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileUp, FileSpreadsheet } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

export default function QuotePage() {
    const { id: orderId } = useParams<{ id: string }>();
    const router = useRouter();
    const { toast } = useToast();

    const [order, setOrder] = React.useState<Order | null>(null);
    const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
    const [allData, setAllData] = React.useState<any>({});
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = React.useState(false);
    const [errorText, setErrorText] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!orderId) return;

        async function fetchQuoteData() {
            setIsLoading(true);
            try {
                const orderDocRef = doc(db, 'orders', orderId);
                const orderDocSnap = await getDoc(orderDocRef);

                if (!orderDocSnap.exists()) {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга олдсонгүй.' });
                    router.push('/orders');
                    return;
                }
                const orderData = { id: orderDocSnap.id, ...orderDocSnap.data() } as Order;
                setOrder(orderData);

                const itemsQuery = query(collection(db, 'order_items'), where('orderId', '==', orderId));
                const itemsSnap = await getDocs(itemsQuery);
                const itemsDataPromises = itemsSnap.docs.map(async (d) => {
                    const itemData = d.data();
                    const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', d.id));
                    const cargoSnapshot = await getDocs(cargoQuery);
                    const cargoItems = cargoSnapshot.docs.map(cargoDoc => ({ id: cargoDoc.id, ...cargoDoc.data() } as OrderItemCargo));
                    
                    return { id: d.id, ...itemData, cargoItems: cargoItems } as OrderItem;
                });
                const itemsData = await Promise.all(itemsDataPromises);
                setOrderItems(itemsData);

                const [warehouseSnap, serviceTypeSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap] = await Promise.all([
                    getDocs(query(collection(db, "warehouses"), orderBy("name"))),
                    getDocs(query(collection(db, "service_types"), orderBy("name"))),
                    getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
                    getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
                    getDocs(query(collection(db, "regions"), orderBy("name"))),
                    getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
                ]);

                setAllData({
                    warehouses: warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)),
                    serviceTypes: serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)),
                    vehicleTypes: vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)),
                    trailerTypes: trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)),
                    regions: regionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)),
                    packagingTypes: packagingTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingType)),
                });

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchQuoteData();
    }, [orderId, router, toast]);

    const handleSelectItem = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItems(new Set(orderItems.map(item => item.id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleExcelExport = async () => {
        if (selectedItems.size === 0) {
            toast({ variant: 'destructive', title: 'Анхаар', description: 'Экспорт хийх тээвэрлэлтээ сонгоно уу.'});
            return;
        }
        setIsExporting(true);
        setErrorText(null);
        try {
            const selectedOrderItems = orderItems.filter(item => selectedItems.has(item.id));
            const payload = {
                order,
                orderItems: selectedOrderItems,
                allData,
            };

            const response = await fetch('/api/quotes/excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                 let msg = 'Excel файл үүсгэхэд алдаа гарлаа';
                try {
                    const ct = response.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const data = await response.json();
                        if (typeof data === 'string') msg = data;
                        else if (typeof data?.message === 'string') msg = data.message;
                        else msg = JSON.stringify(data);
                    } else {
                        const text = await response.text();
                        if (text) msg = text;
                    }
                } catch {}
                throw new Error(String(msg));
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quote-${order?.orderNumber}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (e: unknown) {
             const errorMessage = e instanceof Error ? e.message : String(e);
             setErrorText(errorMessage);
             toast({ variant: 'destructive', title: 'Алдаа', description: errorMessage });
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
             <div className="container mx-auto py-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const getDetailName = (collection: string, id: string) => {
        return allData[collection]?.find((d: any) => d.id === id)?.name || id;
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
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Үнийн санал гаргах</CardTitle>
                            <CardDescription>
                                Харилцагчид илгээх үнийн саналдаа багтаах тээвэрлэлтүүдийг сонгоно уу.
                            </CardDescription>
                        </div>
                        <Button onClick={handleExcelExport} disabled={isExporting || selectedItems.size === 0}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileSpreadsheet className="mr-2 h-4 w-4"/>}
                            Excel татах
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {errorText && <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-md">Алдаа: {errorText}</p>}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox 
                                        onCheckedChange={handleSelectAll}
                                        checked={selectedItems.size === orderItems.length && orderItems.length > 0}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Үйлчилгээ</TableHead>
                                <TableHead>Чиглэл</TableHead>
                                <TableHead>Ачаа</TableHead>
                                <TableHead>Үнийн дүн</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.length > 0 ? (
                                orderItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox 
                                                onCheckedChange={() => handleSelectItem(item.id)}
                                                checked={selectedItems.has(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell>{getDetailName('serviceTypes', item.serviceTypeId)}</TableCell>
                                        <TableCell>{getDetailName('regions', item.startRegionId)} &rarr; {getDetailName('regions', item.endRegionId)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {item.cargoItems?.map(c => (
                                                    <span key={c.id} className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.name} ({c.quantity} {c.unit})</span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.finalPrice?.toLocaleString()}₮</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Тээвэрлэлт олдсонгүй. Эхлээд тээвэрлэлт нэмнэ үү.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
