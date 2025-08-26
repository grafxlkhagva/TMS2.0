
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
import { format } from 'date-fns';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import PrintButton from '@/components/print/PrintButton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- HELPER FUNCTIONS ---

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


// --- COMPONENT TYPES ---

type AllData = {
  serviceTypes: ServiceType[];
  regions: Region[];
  warehouses: Warehouse[];
  vehicleTypes: VehicleType[];
  trailerTypes: TrailerType[];
  packagingTypes: PackagingType[];
};

// --- QUOTE LAYOUT COMPONENT ---

const QuoteLayout = React.forwardRef<HTMLDivElement, { order: Order; orderItems: OrderItem[], allData: AllData }>(
  ({ order, orderItems, allData }, ref) => {
    
  const maps = React.useMemo(() => ({
    services: Object.fromEntries(allData.serviceTypes.map(x => [x.id, x.name])),
    regions: Object.fromEntries(allData.regions.map(x => [x.id, x.name])),
    warehouses: Object.fromEntries(allData.warehouses.map(x => [x.id, x.name])),
    vehicles: Object.fromEntries(allData.vehicleTypes.map(x => [x.id, x.name])),
    trailers: Object.fromEntries(allData.trailerTypes.map(x => [x.id, x.name])),
    packaging: Object.fromEntries(allData.packagingTypes.map(x => [x.id, x.name])),
  }), [allData]);

  const getServiceName = (id: string) => maps.services[id] || 'N/A';
  const getRegionName = (id: string) => maps.regions[id] || 'N/A';
  const getWarehouseName = (id: string) => maps.warehouses[id] || 'N/A';
  const getVehicleTypeName = (id: string) => maps.vehicles[id] || 'N/A';
  const getTrailerTypeName = (id: string) => maps.trailers[id] || 'N/A';
  const getPackagingTypeName = (id: string) => maps.packaging[id] || 'N/A';

  const { totalPayment, totalVat, totalFinalPrice } = orderItems.reduce(
    (acc, item) => {
      const finalPrice = roundCurrency(item.finalPrice);
      const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
      const vat = finalPrice - priceBeforeVat;
      
      acc.totalPayment += priceBeforeVat;
      acc.totalVat += vat;
      acc.totalFinalPrice += finalPrice;
      return acc;
    },
    { totalPayment: 0, totalVat: 0, totalFinalPrice: 0 }
  );
  
  const quoteDate = toDateSafe(order.createdAt) ? format(toDateSafe(order.createdAt)!, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  return (
    <div ref={ref} id="print-root" className="bg-white p-8 text-gray-800 text-[10px]" style={{ fontFamily: 'Inter, "Noto Sans Mongolian", sans-serif' }}>
      <header className="flex justify-between items-start border-b-2 border-gray-700 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tumen Tech TMS</h1>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase">Үнийн санал</h2>
          <div className="flex justify-end mt-1"><p className="font-bold">Огноо:</p><p className="ml-1">{quoteDate}</p></div>
          <div className="flex justify-end mt-1"><p className="font-bold">Захиалгын №:</p><p className="ml-1">{order.orderNumber}</p></div>
        </div>
      </header>

      <section className="mb-6">
        <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Захиалагчийн мэдээлэл</h3>
        <div className="flex"><p><strong>Байгууллага:</strong><span className="ml-1">{order.customerName}</span></p></div>
        <div className="flex"><p><strong>Хариуцсан ажилтан:</strong><span className="ml-1">{order.employeeName}</span></p></div>
      </section>

      <table className="w-full text-left text-[9px]" style={{ tableLayout: 'auto' }}>
        <thead className="bg-gray-100 font-bold">
          <tr>
            <th scope="col" className="p-1 border border-gray-400 whitespace-nowrap">Үйлчилгээний төрөл</th>
            <th scope="col" className="p-1 border border-gray-400 whitespace-nowrap">Ачааны мэдээлэл</th>
            <th scope="col" className="p-1 border border-gray-400">Ачих</th>
            <th scope="col" className="p-1 border border-gray-400">Буулгах</th>
            <th scope="col" className="p-1 border border-gray-400 text-right whitespace-nowrap">Нийт зам</th>
            <th scope="col" className="p-1 border border-gray-400 whitespace-nowrap">Тээврийн хэрэгсэл</th>
            <th scope="col" className="p-1 border border-gray-400 text-right whitespace-nowrap">Тээврийн үнэ</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">Тоо</th>
            <th scope="col" className="p-1 border border-gray-400 text-right whitespace-nowrap">Нийт төлбөр</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">НӨАТ</th>
            <th scope="col" className="p-1 border border-gray-400 text-right whitespace-nowrap">Нийт дүн</th>
          </tr>
        </thead>
        <tbody>
          {orderItems.length > 0 ? (
            orderItems.map((item) => {
              const frequency = item.frequency && item.frequency > 0 ? item.frequency : 1;
              const finalPrice = roundCurrency(item.finalPrice);
              const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
              const vatAmount = finalPrice - priceBeforeVat;
              const unitPriceExVat = priceBeforeVat / frequency;

              return (
                <tr key={item.id}>
                  <td className="p-1 border border-gray-400 align-top">{getServiceName(item.serviceTypeId)}</td>
                  <td className="p-1 border border-gray-400 align-top">
                    <dl>
                      {(item.cargoItems || []).map((cargo: OrderItemCargo, i: number) => (
                        <React.Fragment key={cargo.id || `cargo-${i}`}>
                          <dt className="font-semibold">{cargo.name}</dt>
                          <dd className="pl-2 mb-1">{`${cargo.quantity} ${cargo.unit} (${getPackagingTypeName(cargo.packagingTypeId)})`}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </td>
                  <td className="p-1 border border-gray-400 align-top">
                    <p>{getRegionName(item.startRegionId)}</p>
                    <p className="text-gray-600">{getWarehouseName(item.startWarehouseId)}</p>
                  </td>
                  <td className="p-1 border border-gray-400 align-top">
                    <p>{getRegionName(item.endRegionId)}</p>
                    <p className="text-gray-600">{getWarehouseName(item.endWarehouseId)}</p>
                  </td>
                  <td className="p-1 border border-gray-400 text-right align-top">{item.totalDistance ?? '-'} км</td>
                  <td className="p-1 border border-gray-400 align-top">{`${getVehicleTypeName(item.vehicleTypeId ?? '')}, ${getTrailerTypeName(item.trailerTypeId ?? '')}`}</td>
                  <td className="p-1 border border-gray-400 text-right align-top">{fmt(unitPriceExVat)}</td>
                  <td className="p-1 border border-gray-400 text-right align-top">{frequency}</td>
                  <td className="p-1 border border-gray-400 text-right align-top">{fmt(priceBeforeVat)}</td>
                  <td className="p-1 border border-gray-400 text-right align-top">{fmt(vatAmount)}</td>
                  <td className="p-1 border border-gray-400 text-right align-top">{fmt(finalPrice)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={11} className="p-4 text-center">Үнийн саналд оруулахаар сонгогдсон тээвэрлэлт алга.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} className="p-2 font-bold text-right border border-gray-400">Нийт төлбөр</td>
            <td className="p-2 font-bold text-right border border-gray-400">{fmt(totalPayment)}</td>
            <td className="p-2 font-bold text-right border border-gray-400">{fmt(totalVat)}</td>
            <td className="p-2 font-bold text-right border border-gray-400">{fmt(totalFinalPrice)}</td>
          </tr>
        </tfoot>
      </table>

      {order.conditions && (
        <section className="mt-8 mb-6">
          <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Тээврийн нөхцөл</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px]">
            <div className="flex"><p><strong>Ачилт:</strong><span className="ml-1">{order.conditions.loading}</span></p></div>
            <div className="flex"><p><strong>Буулгалт:</strong><span className="ml-1">{order.conditions.unloading}</span></p></div>
            <div className="flex"><p><strong>ТХ-н бэлэн байдал:</strong><span className="ml-1">{order.conditions.vehicleAvailability}</span></p></div>
            <div className="flex"><p><strong>Төлбөрийн нөхцөл:</strong><span className="ml-1">{order.conditions.paymentTerm}</span></p></div>
            <div className="col-span-2 flex"><p><strong>Даатгал:</strong><span className="ml-1">{order.conditions.insurance}</span></p></div>
            <div className="col-span-2">
              <p><strong>Зөвшөөрөл:</strong></p>
              {(order.conditions.permits?.roadPermit || order.conditions.permits?.roadToll) ? (
                <ul className="list-disc list-inside ml-4">
                  {order.conditions.permits.roadPermit && <li>Замын зөвшөөрөл авна</li>}
                  {order.conditions.permits.roadToll && <li>Замын хураамж тушаана</li>}
                </ul>
              ) : <p className="ml-1">Тодорхойлоогүй</p>}
            </div>
            {order.conditions.additionalConditions && (
              <div className="col-span-2 flex"><p><strong>Нэмэлт нөхцөл:</strong><span className="ml-1">{order.conditions.additionalConditions}</span></p></div>
            )}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Тайлбар</h3>
        <p className="text-gray-700">
          Энэхүү үнийн санал нь зөвхөн энд дурдсан үйлчилгээ болон бараа бүтээгдэхүүнд хамаарна.
        </p>
      </section>
    </div>
  );
});

QuoteLayout.displayName = "QuoteLayout";


// --- MAIN PAGE COMPONENT ---

export default function GenerateQuotePage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const componentRef = React.useRef<HTMLDivElement>(null);

  const [order, setOrder] = React.useState<Order | null>(null);
  const [allData, setAllData] = React.useState<AllData | null>(null);
  const [acceptedItems, setAcceptedItems] = React.useState<OrderItem[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<Map<string, OrderItem>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  
  const getRegionName = React.useCallback((id: string) => allData?.regions.find(r => r.id === id)?.name || 'N/A', [allData]);

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
        setOrder({ id: orderDocSnap.id, ...orderData } as Order);

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
            return { id: d.id, ...itemData, cargoItems, createdAt: toDateSafe(itemData.createdAt) } as OrderItem;
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

  if (isLoading || !order || !allData) {
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
          <div>
            <h1 className="text-2xl font-bold">Үнийн санал үүсгэх</h1>
            <p className="text-muted-foreground">{order.orderNumber}</p>
          </div>
        </div>
        <PrintButton
          targetRef={componentRef}
          fileName={`Quote-${order.orderNumber}.pdf`}
          disabled={selectedItems.size === 0}
          orientation="landscape"
          buttonVariant="default"
        />
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
                    <div className="border rounded-lg shadow-sm overflow-hidden">
                       <QuoteLayout order={order} orderItems={selectedItemsArray} allData={allData} />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      {/* This component is for printing, it's hidden from the screen */}
       <div className="print-only">
         {selectedItemsArray.length > 0 && <QuoteLayout ref={componentRef} order={order} orderItems={selectedItemsArray} allData={allData} />}
      </div>
    </div>
  );
}

    
