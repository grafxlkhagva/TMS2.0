
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


export default function GenerateQuotePage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);

  const [order, setOrder] = React.useState<Order | null>(null);
  const [allData, setAllData] = React.useState<AllData>(initialAllData);
  const [acceptedItems, setAcceptedItems] = React.useState<OrderItem[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<Map<string, OrderItem>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  
  const getRegionName = React.useCallback((id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A', [allData.regions]);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);

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
  
  // Prepare a clean version of the data for the PDF renderer, removing any non-serializable fields.
  const cleanDataForPdf = (data: any) => {
    const cleaned = { ...data };
    for (const key in cleaned) {
      if (key.endsWith('Ref')) {
        delete cleaned[key];
      }
    }
    return cleaned;
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
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders/${orderId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Захиалга руу буцах
            </Link>
          </Button>
          {order && <div>
            <h1 className="text-2xl font-bold">Үнийн санал үүсгэх</h1>
            <p className="text-muted-foreground">{order.orderNumber}</p>
          </div>}
        </div>
        
        {isClient && selectedItemsArray.length > 0 && order && allData && (
           <PDFDownloadLink
            document={<QuoteDocument 
              order={cleanDataForPdf(order)} 
              orderItems={selectedItemsArray.map(item => ({
                ...cleanDataForPdf(item),
                cargoItems: item.cargoItems ? item.cargoItems.map(cleanDataForPdf) : []
              }))} 
              allData={allData} 
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 flex flex-col gap-6 sticky top-6">
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
                        <p className="text-sm text-muted-foreground p-2">Баталгаажсан үнийн саналтай тээвэрлэлт олдсонгүй.</p>
                    )}
                </CardContent>
                {selectedItems.size > 0 && (
                    <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                        <div className="font-semibold">Нийт дүн: {fmt(totalFinalPrice)}₮</div>
                        <p className="text-xs text-muted-foreground">{selectedItems.size} тээвэрлэлт сонгогдсон.</p>
                    </CardFooter>
                )}
            </Card>
        </div>
        
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary"/>
                        Урьдчилан харах
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg shadow-sm overflow-hidden p-6 prose prose-sm max-w-none">
                       <h2 className='text-center'>ҮНИЙН САНАЛ</h2>
                       {order && <p className='text-center font-semibold'>{order.orderNumber}</p>}
                       <hr/>
                       <h3>Захиалагчийн мэдээлэл</h3>
                       <p><strong>Байгууллага:</strong> {order?.customerName}</p>
                       <p><strong>Хариуцсан ажилтан:</strong> {order?.employeeName}</p>
                       <h3>Тээвэрлэлтүүд</h3>
                       <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Чиглэл</TableHead>
                                <TableHead className="text-right">Үнэ (НӨАТ-гүй)</TableHead>
                                <TableHead className="text-right">НӨАТ</TableHead>
                                <TableHead className="text-right">Нийт дүн</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedItemsArray.map(item => {
                               const finalPrice = roundCurrency(item.finalPrice);
                               const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
                               const vat = finalPrice - priceBeforeVat;
                               return (
                                <TableRow key={item.id}>
                                    <TableCell>{getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}</TableCell>
                                    <TableCell className="text-right">{fmt(priceBeforeVat)}</TableCell>
                                    <TableCell className="text-right">{fmt(vat)}</TableCell>
                                    <TableCell className="text-right">{fmt(finalPrice)}</TableCell>
                                </TableRow>
                               )
                            })}
                        </TableBody>
                       </Table>
                       <p className="text-right font-bold mt-4">Нийт дүн: {fmt(totalFinalPrice)}₮</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

