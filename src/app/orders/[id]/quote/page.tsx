
'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type {
  Order,
  OrderItem,
  ServiceType,
  Region,
  VehicleType,
  TrailerType,
  Warehouse,
  PackagingType,
  OrderItemCargo,
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import QuoteDocument from '@/components/pdf/QuoteDocument';


const toDateSafe = (date: any): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'string' || typeof date === 'number') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }
  return undefined;
};

const roundCurrency = (value: number | undefined | null): number => {
  if (value == null || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
};

const nf = new Intl.NumberFormat('mn-MN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n: number) => nf.format(roundCurrency(n));


type AllData = {
  serviceTypes: ServiceType[];
  regions: Region[];
  warehouses: Warehouse[];
  vehicleTypes: VehicleType[];
  trailerTypes: TrailerType[];
  packagingTypes: PackagingType[];
};

const initialAllData: AllData = {
  serviceTypes: [],
  regions: [],
  warehouses: [],
  vehicleTypes: [],
  trailerTypes: [],
  packagingTypes: [],
};

const cleanDataForPdf = (data: any): any => {
    if (data === null || data === undefined || React.isValidElement(data)) {
        return data;
    }

    if (data instanceof Timestamp) {
        return data.toDate();
    }
    if (data instanceof Date) {
        return data;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'firestore') && typeof data.path === 'string') {
        return undefined; // It's a DocumentReference, remove it
    }

    if (Array.isArray(data)) {
        return data.map(item => cleanDataForPdf(item));
    }

    if (typeof data === 'object') {
        const cleaned: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (key.endsWith('Ref')) {
                    continue; // Skip keys ending with 'Ref'
                }
                const value = data[key];
                const cleanedValue = cleanDataForPdf(value);
                if (cleanedValue !== undefined) {
                    cleaned[key] = cleanedValue;
                }
            }
        }
        return cleaned;
    }

    return data;
};


export default function GenerateQuotePage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const [order, setOrder] = React.useState<Order | null>(null);
  const [acceptedItems, setAcceptedItems] = React.useState<OrderItem[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<Map<string, OrderItem>>(new Map());
  const [allData, setAllData] = React.useState<AllData>(initialAllData);
  const [isLoading, setIsLoading] = React.useState(true);

  const getRegionName = React.useCallback(
    (id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A',
    [allData.regions]
  );

  React.useEffect(() => {
    if (!orderId) return;

    async function fetchData() {
      setIsLoading(true);
      try {
        const orderDocRef = doc(db, 'orders', orderId);
        const orderDocSnap = await getDoc(orderDocRef);

        if (!orderDocSnap.exists()) {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга олдсонгүй.' });
          router.push('/orders');
          return;
        }
        const orderData = orderDocSnap.data();
        setOrder({ 
          id: orderDocSnap.id, 
          ...orderData,
          createdAt: toDateSafe(orderData.createdAt)
        } as Order);

        const [itemsSnap, warehouseSnap, serviceTypeSnap, vehicleTypeSnap, trailerTypeSnap, regionSnap, packagingTypeSnap] = await Promise.all([
          getDocs(query(collection(db, 'order_items'), where('orderId', '==', orderId))),
          getDocs(query(collection(db, "warehouses"), orderBy("name"))),
          getDocs(query(collection(db, "service_types"), orderBy("name"))),
          getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
          getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
          getDocs(query(collection(db, "regions"), orderBy("name"))),
          getDocs(query(collection(db, "packaging_types"), orderBy("name"))),
        ]);
        
        const itemsDataPromises = itemsSnap.docs.map(async (d) => {
            const itemData = d.data();
            const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', d.id));
            const cargoSnapshot = await getDocs(cargoQuery);
            const cargoItems = cargoSnapshot.docs.map(cargoDoc => ({ id: cargoDoc.id, ...cargoDoc.data() } as OrderItemCargo));
            return { 
                id: d.id, 
                ...itemData, 
                cargoItems, 
                createdAt: toDateSafe(itemData.createdAt),
                loadingStartDate: toDateSafe(itemData.loadingStartDate),
                loadingEndDate: toDateSafe(itemData.loadingEndDate),
                unloadingStartDate: toDateSafe(itemData.unloadingStartDate),
                unloadingEndDate: toDateSafe(itemData.unloadingEndDate),
            } as OrderItem;
        });

        const allItems = await Promise.all(itemsDataPromises);
        const filteredAcceptedItems = allItems.filter(item => item.acceptedQuoteId && item.finalPrice != null);
        filteredAcceptedItems.sort((a,b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
        
        setAcceptedItems(filteredAcceptedItems);
        setSelectedItems(new Map(filteredAcceptedItems.map(item => [item.id, item])));
        
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

    fetchData();
  }, [orderId, router, toast]);

  const handleSelectChange = (item: OrderItem) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(item.id)) {
        newMap.delete(item.id);
      } else {
        newMap.set(item.id, item);
      }
      return newMap;
    });
  };
    
  const selectedItemsArray = Array.from(selectedItems.values()).sort((a,b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
  
  const { totalFinalPrice } = selectedItemsArray.reduce(
    (acc, item) => {
      acc.totalFinalPrice += roundCurrency(item.finalPrice);
      return acc;
    },
    { totalFinalPrice: 0 }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent><Skeleton className="h-96 w-full" /></CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
            <div>
                 <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link href={`/orders/${orderId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Захиалга руу буцах
                     </Link>
                </Button>
                <h1 className="text-3xl font-headline font-bold">Үнийн санал үүсгэх</h1>
                <p className="text-muted-foreground font-mono">{order?.orderNumber}</p>
            </div>
            <div>
               {isClient && selectedItemsArray.length > 0 && order && allData.serviceTypes.length > 0 && (
                 <PDFDownloadLink
                  document={<QuoteDocument 
                    order={cleanDataForPdf(order)} 
                    orderItems={cleanDataForPdf(selectedItemsArray)}
                    allData={cleanDataForPdf(allData)}
                  />}
                  fileName={`Quote-${order.orderNumber}.pdf`}
                >
                  {({ loading }) => (
                    <Button disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                       PDF Татах
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </div>
          </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 space-y-6 sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>Тээвэрлэлт сонгох</CardTitle>
                    <CardDescription>Үнийн саналд оруулах тээвэрлэлтүүдээ сонгоно уу.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {acceptedItems.length > 0 ? (
                        acceptedItems.map((item, index) => (
                            <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                                <Checkbox 
                                    id={`item-${item.id}`}
                                    checked={selectedItems.has(item.id)}
                                    onCheckedChange={() => handleSelectChange(item)}
                                />
                                <label htmlFor={`item-${item.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                                    Тээвэрлэлт #{index + 1}: {getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}
                                </label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">Баталгаажсан үнийн саналтай тээвэрлэлт олдсонгүй.</p>
                    )}
                </CardContent>
                {selectedItems.size > 0 && (
                    <CardFooter className="flex flex-col items-start pt-4 border-t">
                        <p className="text-lg font-semibold">Нийт дүн: {fmt(totalFinalPrice)}₮</p>
                        <p className="text-sm text-muted-foreground">{selectedItems.size} тээвэрлэлт сонгогдсон.</p>
                    </CardFooter>
                )}
            </Card>
        </div>
        <div className="md:col-span-2">
             <Card>
                 <CardHeader>
                     <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Урьдчилан харах</CardTitle>
                        </div>
                     </div>
                 </CardHeader>
                 <CardContent>
                    <div className="border rounded-md p-6 bg-gray-50 aspect-[1/1.414] overflow-auto">
                        <div className="bg-white p-8 font-sans text-gray-800 text-[10px] w-full h-full">
                           <header className="flex justify-between items-start border-b-2 border-gray-700 pb-4 mb-6">
                             <div>
                               <h1 className="text-2xl font-bold">Түмэн Тех ТМС</h1>
                             </div>
                             <div className="text-right">
                               <h2 className="text-xl font-bold uppercase">ҮНИЙН САНАЛ</h2>
                               <p className="mt-1">Захиалгын №: {order?.orderNumber}</p>
                             </div>
                           </header>
                           <section className="mb-6">
                               <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Захиалагчийн мэдээлэл</h3>
                               <p><strong>Байгууллага:</strong> {order?.customerName}</p>
                               <p><strong>Хариуцсан ажилтан:</strong> {order?.employeeName}</p>
                           </section>
                           <section>
                               <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Тээвэрлэлтүүд</h3>
                               <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead className="h-8 text-[9px]">Чиглэл</TableHead>
                                       <TableHead className="h-8 text-[9px] text-right">Үнэ (НӨАТ-гүй)</TableHead>
                                       <TableHead className="h-8 text-[9px] text-right">НӨАТ</TableHead>
                                       <TableHead className="h-8 text-[9px] text-right">Нийт дүн</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {selectedItemsArray.map(item => {
                                       const finalPrice = roundCurrency(item.finalPrice);
                                       const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
                                       const vat = finalPrice - priceBeforeVat;
                                       return (
                                        <TableRow key={item.id}>
                                            <TableCell className="py-1 text-[9px]">{getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}</TableCell>
                                            <TableCell className="py-1 text-[9px] text-right">{fmt(priceBeforeVat)}</TableCell>
                                            <TableCell className="py-1 text-[9px] text-right">{fmt(vat)}</TableCell>
                                            <TableCell className="py-1 text-[9px] text-right font-semibold">{fmt(finalPrice)}</TableCell>
                                        </TableRow>
                                       )
                                   })}
                               </TableBody>
                               </Table>
                               <p className="text-right font-bold mt-4">Нийт дүн: {fmt(totalFinalPrice)}₮</p>
                           </section>
                        </div>
                    </div>
                 </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}
