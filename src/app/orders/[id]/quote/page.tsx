
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
    <div ref={ref} className="bg-white p-8 text-gray-800 text-[10px]" style={{ fontFamily: 'Inter, "Noto Sans Mongolian", sans-serif' }}>
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
                  <td className="p-1 border border-gray-400 text-right align-top">{fmt(finalPrice)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={11} className="p-4 text-center">No accepted items.</td>
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
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [allData, setAllData] = React.useState<AllData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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

  if (isLoading || !order || !allData) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const acceptedItems = orderItems.filter(item => item.acceptedQuoteId && item.finalPrice != null);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders/${orderId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Захиалга руу буцах
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Үнийн санал</h1>
            <p className="text-muted-foreground">{order.orderNumber}</p>
          </div>
        </div>
        <PrintQuoteButton
          targetRef={componentRef}
          fileName={`Quote-${order.orderNumber}.pdf`}
          disabled={acceptedItems.length === 0}
        />
      </div>
      
      {acceptedItems.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Үнийн саналд оруулахаар сонгогдсон тээвэрлэлт алга.</p>
              <p className="text-sm text-muted-foreground mt-2">Та захиалгын дэлгэрэнгүй хуудаснаас жолоочийн саналыг баталгаажуулна уу.</p>
          </div>
      )}

      {/* This component is for printing, it's not visible on the screen */}
       <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
         {acceptedItems.length > 0 && <QuoteLayout ref={componentRef} order={order} orderItems={acceptedItems} allData={allData} />}
      </div>
      
      {/* This is the visible preview on the screen */}
       {acceptedItems.length > 0 && (
         <div className="border rounded-lg shadow-sm overflow-hidden">
            <QuoteLayout order={order} orderItems={acceptedItems} allData={allData} />
         </div>
       )}

    </div>
  );
}
