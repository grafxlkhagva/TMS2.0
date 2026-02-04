
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderItem, Warehouse, ServiceType, VehicleType, TrailerType, Region, PackagingType, OrderItemCargo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileDown, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const VAT_RATE = 0.1;

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
    const [isPdfExporting, setIsPdfExporting] = React.useState(false);
    const [showPreview, setShowPreview] = React.useState(true);
    const [quoteNumber] = React.useState(() => `Q${Math.floor(Math.random() * 9000) + 1000}`);

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

    const getDetailName = (collectionName: string, id: string) => {
        if (!id) return '';
        return allData[collectionName]?.find((d: any) => d.id === id)?.name || '';
    }

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

    const selectedOrderItems = orderItems.filter(item => selectedItems.has(item.id));

    // Calculate totals
    const calculateTotals = () => {
        let totalBeforeVat = 0;
        let totalVat = 0;
        let grandTotal = 0;

        selectedOrderItems.forEach(item => {
            const finalPrice = item.finalPrice || 0;
            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
            const vatAmount = item.withVAT ? finalPrice - priceBeforeVat : 0;

            totalBeforeVat += priceBeforeVat;
            totalVat += vatAmount;
            grandTotal += finalPrice;
        });

        return { totalBeforeVat, totalVat, grandTotal };
    };

    const handlePdfExport = async () => {
        if (selectedItems.size === 0) {
            toast({ variant: 'destructive', title: 'Анхаар', description: 'PDF татах тээвэрлэлтээ сонгоно уу.'});
            return;
        }
        setIsPdfExporting(true);

        try {
            const payload = {
                order,
                orderItems: selectedOrderItems,
                allData,
                quoteNumber
            };

            const response = await fetch('/api/quotes/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                let msg = 'PDF файл үүсгэхэд алдаа гарлаа';
                try {
                    const ct = response.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const data = await response.json();
                        if (typeof data === 'string') msg = data;
                        else if (typeof (data as any)?.message === 'string') msg = (data as any).message;
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
            a.download = `quote-${quoteNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: 'Амжилттай', description: 'PDF файл татагдлаа.' });

        } catch (error) {
            console.error('PDF export error:', error);
            const msg = error instanceof Error ? error.message : String(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: msg });
        } finally {
            setIsPdfExporting(false);
        }
    };

    const handleExcelExport = async () => {
        if (selectedItems.size === 0) {
            toast({ variant: 'destructive', title: 'Анхаар', description: 'Excel татах тээвэрлэлтээ сонгоно уу.'});
            return;
        }
        setIsExporting(true);
        try {
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
                throw new Error('Excel файл үүсгэхэд алдаа гарлаа');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quote-${quoteNumber}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: 'Амжилттай', description: 'Excel файл татагдлаа.' });

        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Excel үүсгэхэд алдаа гарлаа.' });
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

    const { totalBeforeVat, totalVat, grandTotal } = calculateTotals();

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/orders/${orderId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Захиалга руу буцах
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Үнийн санал</h1>
                        <p className="text-muted-foreground text-sm">Тээвэрлэлтүүдээ сонгоод PDF татаарай</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                        {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {showPreview ? 'Preview нуух' : 'Preview харах'}
                    </Button>
                    <Button variant="outline" onClick={handleExcelExport} disabled={isExporting || selectedItems.size === 0}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileSpreadsheet className="mr-2 h-4 w-4"/>}
                        Excel
                    </Button>
                    <Button onClick={handlePdfExport} disabled={isPdfExporting || selectedItems.size === 0}>
                        {isPdfExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}
                        PDF татах
                    </Button>
                </div>
            </div>

            {/* Selection Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Тээвэрлэлт сонгох</CardTitle>
                    <CardDescription>
                        Үнийн саналд багтаах тээвэрлэлтүүдийг сонгоно уу. Сонгосон: {selectedItems.size}/{orderItems.length}
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                <TableHead className="text-right">Үнийн дүн</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orderItems.length > 0 ? (
                                orderItems.map(item => (
                                    <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-muted/50' : ''}>
                                        <TableCell>
                                            <Checkbox 
                                                onCheckedChange={() => handleSelectItem(item.id)}
                                                checked={selectedItems.has(item.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{getDetailName('serviceTypes', item.serviceTypeId)}</TableCell>
                                        <TableCell>
                                            {getDetailName('warehouses', item.startWarehouseId) || getDetailName('regions', item.startRegionId)} 
                                            {' → '} 
                                            {getDetailName('warehouses', item.endWarehouseId) || getDetailName('regions', item.endRegionId)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {item.cargoItems?.map(c => (
                                                    <span key={c.id} className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.name} ({c.quantity} {c.unit})</span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{item.finalPrice?.toLocaleString()}₮</TableCell>
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

            {/* Quote Preview */}
            {showPreview && selectedItems.size > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Үнийн саналын урьдчилсан харагдац</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white border rounded-lg p-8 shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="text-sm space-y-1">
                                    <p className="text-gray-600">Ulaanbaatar city, Mongolia</p>
                                    <p className="font-medium mt-4">Tumen Resources LLC, Mongol HD TOWER-905,</p>
                                    <p>Sukhbaatar district, Baga toiruu-49, 210646, Ulaanbaatar city, Mongolia</p>
                                    <p className="text-blue-600 underline mt-2">www.tumentech.mn</p>
                                    <p>7775-1111</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-orange-500">TUMEN TECH</div>
                                    <div className="text-xs text-gray-500">DIGITAL TRUCKING COMPANY</div>
                                </div>
                            </div>

                            {/* Bill To & Quote Info */}
                            <div className="flex justify-between mb-6">
                                <div className="text-sm">
                                    <p className="font-bold mb-1">BILL TO</p>
                                    <p className="font-medium">{order?.customerName}</p>
                                    <p>{order?.employeeName}</p>
                                    <p>{order?.employeeEmail}</p>
                                    <p>{order?.employeePhone}</p>
                                </div>
                                <div className="text-sm text-right">
                                    <div className="flex justify-end gap-4">
                                        <span>Quote No:</span>
                                        <span className="font-medium">{quoteNumber}</span>
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <span>Quote Date:</span>
                                        <span className="font-medium">{format(new Date(), 'M/d/yyyy')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#4F81BD] text-white">
                                            <th className="border border-gray-300 p-2 text-center">№</th>
                                            <th className="border border-gray-300 p-2">Үйлчилгээний төрөл</th>
                                            <th className="border border-gray-300 p-2">Ачааны мэдээлэл</th>
                                            <th className="border border-gray-300 p-2">Тээвэр эхлэх цэг</th>
                                            <th className="border border-gray-300 p-2">Тээвэр дуусах цэг</th>
                                            <th className="border border-gray-300 p-2">Нийт зай</th>
                                            <th className="border border-gray-300 p-2">Машины төрөл</th>
                                            <th className="border border-gray-300 p-2">Даац, Тэвшний хэмжээ</th>
                                            <th className="border border-gray-300 p-2">Үнэлгээ</th>
                                            <th className="border border-gray-300 p-2">Хэмжээ нэгж</th>
                                            <th className="border border-gray-300 p-2">Нийт хөлс ₮</th>
                                            <th className="border border-gray-300 p-2">НӨАТ ₮</th>
                                            <th className="border border-gray-300 p-2">Нийт дүн ₮</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrderItems.map((item, index) => {
                                            const finalPrice = item.finalPrice || 0;
                                            const frequency = item.frequency || 1;
                                            const unitPrice = frequency > 0 ? finalPrice / frequency : finalPrice;
                                            const priceBeforeVat = item.withVAT ? finalPrice / (1 + VAT_RATE) : finalPrice;
                                            const vatAmount = item.withVAT ? finalPrice - priceBeforeVat : 0;

                                            const cargoDesc = item.cargoItems?.map((c: any) => {
                                                const parts = [];
                                                if (c.name) parts.push(c.name);
                                                if (c.quantity && c.unit) parts.push(`(${c.quantity} ${c.unit})`);
                                                return parts.join(' ');
                                            }).join(', ') || '';

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('serviceTypes', item.serviceTypeId)}</td>
                                                    <td className="border border-gray-300 p-2">{cargoDesc}</td>
                                                    <td className="border border-gray-300 p-2">
                                                        {getDetailName('warehouses', item.startWarehouseId)}
                                                    </td>
                                                    <td className="border border-gray-300 p-2">
                                                        {getDetailName('warehouses', item.endWarehouseId)}
                                                    </td>
                                                    <td className="border border-gray-300 p-2 text-center">
                                                        {item.totalDistance ? `${item.totalDistance}км` : ''}
                                                    </td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('vehicleTypes', item.vehicleTypeId)}</td>
                                                    <td className="border border-gray-300 p-2">{getDetailName('trailerTypes', item.trailerTypeId)}</td>
                                                    <td className="border border-gray-300 p-2 text-right">{Math.round(unitPrice).toLocaleString()}</td>
                                                    <td className="border border-gray-300 p-2 text-center">{frequency}</td>
                                                    <td className="border border-gray-300 p-2 text-right">{Math.round(priceBeforeVat).toLocaleString()}</td>
                                                    <td className="border border-gray-300 p-2 text-right">{Math.round(vatAmount).toLocaleString()}</td>
                                                    <td className="border border-gray-300 p-2 text-right font-medium">{Math.round(finalPrice).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Notes Section */}
                            <div className="mt-4">
                                <div className="bg-gray-200 px-3 py-1 font-bold text-sm inline-block">Тайлбар</div>
                                <div className="border border-gray-300 p-4 text-sm space-y-1">
                                    <p>Ачилт: Захиалагч тал хариуцна</p>
                                    <p>Буулгалт: Захилагч тал хариуцна</p>
                                    <p>Маршрут: {selectedOrderItems[0] && `${getDetailName('warehouses', selectedOrderItems[0].startWarehouseId)} - ${getDetailName('warehouses', selectedOrderItems[0].endWarehouseId)}`}</p>
                                    <p>ТХ-ийн бэлэн байдал: 24 цаг</p>
                                    <p>Тээвэрлэлтийн хугацаа: Стандартаар 48 цагын хугацаанд тээвэрлэлт хийнэ.</p>
                                    <p>Төлбөрийн нөхцөл: Гэрээний дагуу</p>
                                    <p>Даатгал: Тээвэрлэгчийн хариуцлагын даатгал /3 тэрбум/</p>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="mt-4 flex justify-end">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between gap-8">
                                        <span>Нийт хөлс:</span>
                                        <span className="font-medium">{Math.round(totalBeforeVat).toLocaleString()}₮</span>
                                    </div>
                                    <div className="flex justify-between gap-8">
                                        <span>НӨАТ (10%):</span>
                                        <span className="font-medium">{Math.round(totalVat).toLocaleString()}₮</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between gap-8 text-lg font-bold">
                                        <span>Нийт дүн:</span>
                                        <span>{Math.round(grandTotal).toLocaleString()}₮</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
