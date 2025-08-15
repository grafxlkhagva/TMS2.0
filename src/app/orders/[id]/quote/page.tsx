
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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PrintQuoteButton from '@/components/print/PrintQuoteButton';

// --- HELPER FUNCTIONS ---

/**
 * Safely converts various date-like types to a Date object.
 * @param date - The value to convert (Timestamp, Date, string, null, undefined).
 * @returns A valid Date object or undefined if conversion is not possible.
 */
const toDateSafe = (date: any): Date | undefined => {
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'string' || typeof date === 'number') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  return undefined;
};

/**
 * Safely rounds a number to 2 decimal places. Returns 0 for invalid inputs.
 */
const roundCurrency = (value: number | undefined | null): number => {
  if (value == null || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
};

/** Reusable number formatter for Mongolian Tugrik. */
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

function QuoteLayout({ order, orderItems, allData }: { order: Order; orderItems: OrderItem[], allData: AllData }) {
    
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

  const acceptedItems = orderItems.filter(
    (item) => item.acceptedQuoteId && item.finalPrice != null
  );

  const { totalPayment, totalVat, totalFinalPrice } = acceptedItems.reduce(
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
    <div className="bg-white p-8 text-gray-800 text-[10px]" style={{ fontFamily: 'Inter, "Noto Sans Mongolian", sans-serif' }}>
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

      <table className="w-full text-left text-[9px]" style={{ tableLayout: 'fixed', wordBreak: 'break-word' }}>
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead className="bg-gray-100 font-bold">
          <tr>
            <th scope="col" className="p-1 border border-gray-400">Үйлчилгээний төрөл</th>
            <th scope="col" className="p-1 border border-gray-400">Ачааны мэдээлэл</th>
            <th scope="col" className="p-1 border border-gray-400">Ачих</th>
            <th scope="col" className="p-1 border border-gray-400">Буулгах</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">Нийт зам</th>
            <th scope="col" className="p-1 border border-gray-400">Тээврийн хэрэгсэл</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">Тээврийн үнэ</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">Тоо</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">Нийт төлбөр</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">НӨАТ</th>
            <th scope="col" className="p-1 border border-gray-400 text-right">Нийт дүн</th>
          </tr>
        </thead>
        <tbody>
          {acceptedItems.length > 0 ? (
            acceptedItems.map((item) => {
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
                  <td className="p-1 border border-gray-400 text-right font-medium align-top">{fmt(finalPrice)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={11} className="text-center p-4 border border-gray-400">Үнийн саналд оруулахаар сонгогдсон тээвэрлэлт алга.</td>
            </tr>
          )}
        </tbody>
        {acceptedItems.length > 0 && (
          <tfoot className="font-bold bg-gray-100">
            <tr>
              <td colSpan={8} className="p-1 border border-gray-400 text-right">Нийт дүн:</td>
              <td className="p-1 border border-gray-400 text-right">{fmt(totalPayment)}</td>
              <td className="p-1 border border-gray-400 text-right">{fmt(totalVat)}</td>
              <td className="p-1 border border-gray-400 text-right">{fmt(totalFinalPrice)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      
      {order.conditions && (
        <section className="mb-6 mt-8">
          <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Тээврийн нөхцөл</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
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

      <footer className="text-center text-gray-500 mt-10 pt-4 border-t">
        <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
      </footer>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function GenerateQuotePage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  
  const [order, setOrder] = React.useState<Order | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [allData, setAllData] = React.useState<AllData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const componentRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (!orderId) return;
    setIsLoading(true);
    
    async function fetchData() {
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
                id: orderDocSnap.id, ...data,
                createdAt: toDateSafe(data.createdAt),
            } as Order;
            setOrder(currentOrder);

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
                    id: d.id, ...itemData,
                    createdAt: toDateSafe(itemData.createdAt),
                    loadingStartDate: toDateSafe(itemData.loadingStartDate),
                    loadingEndDate: toDateSafe(itemData.loadingEndDate),
                    unloadingStartDate: toDateSafe(itemData.unloadingStartDate),
                    unloadingEndDate: toDateSafe(itemData.unloadingEndDate),
                    cargoItems: cargoItems
                } as OrderItem;
            });

            const itemsData = await Promise.all(itemsDataPromises);
            itemsData.sort((a,b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0));
            setOrderItems(itemsData);

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
  
  const acceptedItems = orderItems.filter(item => item.acceptedQuoteId && item.finalPrice != null);


  if (isLoading || !order || !allData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
           <Skeleton className="h-[1000px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen py-10">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6 no-print">
            <h1 className="text-2xl font-bold">Үнийн санал</h1>
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href={`/orders/${orderId}`}><ArrowLeft className="mr-2 h-4 w-4"/> Буцах</Link>
                </Button>
                <PrintQuoteButton
                  getContent={() => componentRef.current}
                  fileName={`Quote-${order?.orderNumber || 'details'}.pdf`}
                  disabled={isLoading || !order || !allData || acceptedItems.length === 0}
                />
            </div>
        </div>
        <div ref={componentRef} id="print-root" className="bg-white rounded-lg shadow-lg mx-auto" style={{ width: '1123px' }}>
            <QuoteLayout order={order} orderItems={orderItems} allData={allData} />
        </div>
      </div>
    </div>
  );
}
