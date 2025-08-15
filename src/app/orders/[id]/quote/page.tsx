
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
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

// Helper to safely round numbers to 2 decimal places.
const roundCurrency = (value: number | undefined | null): number => {
  if (value == null) return 0;
  return Math.round(value * 100) / 100;
};

type AllData = {
  serviceTypes: ServiceType[];
  regions: Region[];
  warehouses: Warehouse[];
  vehicleTypes: VehicleType[];
  trailerTypes: TrailerType[];
  packagingTypes: PackagingType[];
};

function QuoteLayout({ order, orderItems, allData }: { order: Order; orderItems: OrderItem[], allData: AllData }) {
    
  const getServiceName = React.useCallback((id: string) => allData.serviceTypes.find(s => s.id === id)?.name || 'N/A', [allData.serviceTypes]);
  const getRegionName = React.useCallback((id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A', [allData.regions]);
  const getWarehouseName = React.useCallback((id: string) => allData.warehouses.find(w => w.id === id)?.name || 'N/A', [allData.warehouses]);
  const getVehicleTypeName = React.useCallback((id: string) => allData.vehicleTypes.find(v => v.id === id)?.name || 'N/A', [allData.vehicleTypes]);
  const getTrailerTypeName = React.useCallback((id: string) => allData.trailerTypes.find(t => t.id === id)?.name || 'N/A', [allData.trailerTypes]);
  const getPackagingTypeName = React.useCallback((id: string) => allData.packagingTypes.find(p => p.id === id)?.name || 'N/A', [allData.packagingTypes]);

  // Rows with zero or positive price must not be filtered out. Check for null/undefined.
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
  
  // Use a stable date from the order data to prevent hydration warnings.
  const quoteDate = order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      <div className="bg-white p-8 text-gray-800 text-[10px]" style={{ width: '297mm', minHeight: '210mm' }}>
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

        <table className="w-full text-left text-[9px]">
          <thead className="bg-gray-100 font-bold">
            <tr>
              <th scope="col" className="p-1 border border-gray-400">Үйлчилгээний төрөл</th>
              <th scope="col" className="p-1 border border-gray-400">Ачааны мэдээлэл</th>
              <th scope="col" className="p-1 border border-gray-400">Ачих</th>
              <th scope="col" className="p-1 border border-gray-400">Буулгах</th>
              <th scope="col" className="p-1 border border-gray-400 text-right">Нийт зам</th>
              <th scope="col" className="p-1 border border-gray-400">Тээврийн хэрэгсэл</th>
              <th scope="col" className="p-1 border border-gray-400 text-right">Тээврийн үнэ</th>
              <th scope="col" className="p-1 border border-gray-400 text-right">Тээврийн тоо</th>
              <th scope="col" className="p-1 border border-gray-400 text-right">Нийт төлбөр</th>
              <th scope="col" className="p-1 border border-gray-400 text-right">НӨАТ</th>
              <th scope="col" className="p-1 border border-gray-400 text-right">Нийт дүн</th>
            </tr>
          </thead>
          <tbody>
            {acceptedItems.length > 0 ? (
              acceptedItems.map((item) => {
                // Guard against division by zero for frequency.
                const frequency = item.frequency && item.frequency > 0 ? item.frequency : 1;
                const finalPrice = roundCurrency(item.finalPrice);
                const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
                const vatAmount = finalPrice - priceBeforeVat;
                const singleTransportPriceWithProfit = priceBeforeVat / frequency;

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
                    <td className="p-1 border border-gray-400 text-right align-top">{item.totalDistance} км</td>
                    <td className="p-1 border border-gray-400 align-top">{`${getVehicleTypeName(item.vehicleTypeId)}, ${getTrailerTypeName(item.trailerTypeId)}`}</td>
                    <td className="p-1 border border-gray-400 text-right align-top">{roundCurrency(singleTransportPriceWithProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border border-gray-400 text-right align-top">{frequency}</td>
                    <td className="p-1 border border-gray-400 text-right align-top">{roundCurrency(priceBeforeVat).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border border-gray-400 text-right align-top">{roundCurrency(vatAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border border-gray-400 text-right font-medium align-top">{finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                <td className="p-1 border border-gray-400 text-right">{roundCurrency(totalPayment).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-1 border border-gray-400 text-right">{roundCurrency(totalVat).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-1 border border-gray-400 text-right">{roundCurrency(totalFinalPrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
    </>
  );
}


export default function GenerateQuotePage() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const printRef = React.useRef<HTMLDivElement>(null);

  const [order, setOrder] = React.useState<Order | null>(null);
  const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
  const [allData, setAllData] = React.useState<AllData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Quote-${order?.orderNumber || 'details'}`,
  });
  
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
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
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

            const itemsDataPromises: Promise<OrderItem>[] = itemsSnap.docs.map(async (d) => {
                const itemData = d.data();
                const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemId', '==', d.id));
                const cargoSnapshot = await getDocs(cargoQuery);
                const cargoItems = cargoSnapshot.docs.map(cargoDoc => ({ id: cargoDoc.id, ...cargoDoc.data() } as OrderItemCargo));
                
                return {
                    id: d.id, ...itemData,
                    createdAt: itemData.createdAt.toDate(),
                    loadingStartDate: itemData.loadingStartDate instanceof Timestamp ? itemData.loadingStartDate.toDate() : new Date(itemData.loadingStartDate),
                    loadingEndDate: itemData.loadingEndDate instanceof Timestamp ? itemData.loadingEndDate.toDate() : new Date(itemData.loadingEndDate),
                    unloadingStartDate: itemData.unloadingStartDate instanceof Timestamp ? itemData.unloadingStartDate.toDate() : new Date(itemData.unloadingStartDate),
                    unloadingEndDate: itemData.unloadingEndDate instanceof Timestamp ? itemData.unloadingEndDate.toDate() : new Date(itemData.unloadingEndDate),
                    cargoItems: cargoItems
                } as OrderItem;
            });

            const itemsData = await Promise.all(itemsDataPromises);
            itemsData.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        @page { size: A4 landscape; margin: 12mm; }
      `}</style>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6 no-print">
            <h1 className="text-2xl font-bold">Үнийн санал</h1>
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href={`/orders/${orderId}`}><ArrowLeft className="mr-2 h-4 w-4"/> Буцах</Link>
                </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4"/> Хэвлэх
                </Button>
            </div>
        </div>
        <div ref={printRef} className="print-area bg-white rounded-lg shadow-lg mx-auto">
            <QuoteLayout order={order} orderItems={orderItems} allData={allData} />
        </div>
      </div>
    </div>
  );
}
