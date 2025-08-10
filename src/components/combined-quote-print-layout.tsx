
'use client';

import * as React from 'react';
import { format } from 'date-fns';
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

// Helper to safely round numbers to 2 decimal places.
const roundCurrency = (value: number | undefined | null): number => {
  if (value == null) return 0;
  return Math.round(value * 100) / 100;
};

// Data-fetching functions should live in the page component, not the print layout.
// This component now expects all necessary data to be passed in as props.
type AllData = {
  regions: Region[];
  serviceTypes: ServiceType[];
  vehicleTypes: VehicleType[];
  trailerTypes: TrailerType[];
  warehouses: Warehouse[];
  packagingTypes: PackagingType[];
};

type CombinedQuotePrintLayoutProps = {
  order: Order | null;
  orderItems: OrderItem[];
  allData: AllData;
};

// This is a dedicated print component. It's best practice to keep it pure and
// focused on rendering data. Using React.forwardRef allows the parent to get a DOM ref if needed.
const CombinedQuotePrintLayout = React.forwardRef<
  HTMLDivElement,
  CombinedQuotePrintLayoutProps
>(({ order, orderItems, allData }, ref) => {
  if (!order) return null;

  // Helper functions to find names from IDs.
  // Memoizing them ensures they aren't recreated on every render.
  const getServiceName = React.useCallback((id: string) => allData.serviceTypes.find(s => s.id === id)?.name || 'N/A', [allData.serviceTypes]);
  const getRegionName = React.useCallback((id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A', [allData.regions]);
  const getWarehouseName = React.useCallback((id: string) => allData.warehouses.find(w => w.id === id)?.name || 'N/A', [allData.warehouses]);
  const getVehicleTypeName = React.useCallback((id: string) => allData.vehicleTypes.find(v => v.id === id)?.name || 'N/A', [allData.vehicleTypes]);
  const getTrailerTypeName = React.useCallback((id: string) => allData.trailerTypes.find(t => t.id === id)?.name || 'N/A', [allData.trailerTypes]);
  const getPackagingTypeName = React.useCallback((id: string) => allData.packagingTypes.find(p => p.id === id)?.name || 'N/A', [allData.packagingTypes]);

  // Business Logic Fix: Filter for items with an accepted quote and where finalPrice is defined (can be 0).
  const acceptedItems = orderItems.filter(
    (item) => item.acceptedQuoteId && item.finalPrice != null
  );

  // Calculate totals safely
  const { totalPayment, totalVat, totalFinalPrice } = acceptedItems.reduce(
    (acc, item) => {
      const finalPrice = roundCurrency(item.finalPrice);
      // Guard against falsy withVAT values
      const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
      const vat = finalPrice - priceBeforeVat;
      
      acc.totalPayment += priceBeforeVat;
      acc.totalVat += vat;
      acc.totalFinalPrice += finalPrice;
      return acc;
    },
    { totalPayment: 0, totalVat: 0, totalFinalPrice: 0 }
  );
  
  // Stable SSR/Print Rendering: Use a stable date from the order data.
  const quoteDate = order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      {/* Print-only CSS block */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        @media print {
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: 297mm;
            height: 210mm;
            font-family: "Inter", "Roboto", "Noto Sans", "Noto Sans Mongolian", system-ui, sans-serif;
          }
          tr, thead, tfoot, .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table {
            border-collapse: collapse;
          }
        }
      `}</style>
      <div ref={ref} className="bg-white p-8 text-gray-800 text-[10px]" style={{ fontFamily: '"Inter", "Roboto", "Noto Sans", "Noto Sans Mongolian", system-ui, sans-serif', width: '297mm', minHeight: '210mm' }}>
        {/* Header */}
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

        {/* Customer Info */}
        <section className="mb-6 print-avoid-break">
          <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Захиалагчийн мэдээлэл</h3>
          <div className="flex"><p className="font-bold">Байгууллага:</p><p className="ml-1">{order.customerName}</p></div>
          <div className="flex"><p className="font-bold">Хариуцсан ажилтан:</p><p className="ml-1">{order.employeeName}</p></div>
        </section>

        {/* Main Table */}
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
                // Business Logic Fix: Guard against division by zero for frequency.
                const frequency = item.frequency && item.frequency > 0 ? item.frequency : 1;
                const finalPrice = roundCurrency(item.finalPrice);
                const priceBeforeVat = item.withVAT ? finalPrice / 1.1 : finalPrice;
                const vatAmount = finalPrice - priceBeforeVat;
                const singleTransportPrice = priceBeforeVat / frequency;

                return (
                  // Stable SSR/Print Rendering: Use stable ID for key.
                  <tr key={item.id}>
                    <td className="p-1 border border-gray-400 align-top">{getServiceName(item.serviceTypeId)}</td>
                    <td className="p-1 border border-gray-400 align-top">
                      {/* Using a definition list for semantic cargo details */}
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
                    <td className="p-1 border border-gray-400 text-right align-top">{roundCurrency(singleTransportPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        
        {/* Transportation Conditions */}
        {order.conditions && (
          <section className="mb-6 mt-8 print-avoid-break">
            <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Тээврийн нөхцөл</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div className="flex"><p className="font-bold">Ачилт:</p><p className="ml-1">{order.conditions.loading}</p></div>
              <div className="flex"><p className="font-bold">Буулгалт:</p><p className="ml-1">{order.conditions.unloading}</p></div>
              <div className="flex"><p className="font-bold">ТХ-н бэлэн байдал:</p><p className="ml-1">{order.conditions.vehicleAvailability}</p></div>
              <div className="flex"><p className="font-bold">Төлбөрийн нөхцөл:</p><p className="ml-1">{order.conditions.paymentTerm}</p></div>
              <div className="col-span-2 flex"><p className="font-bold">Даатгал:</p><p className="ml-1">{order.conditions.insurance}</p></div>
              <div className="col-span-2">
                <p className="font-bold">Зөвшөөрөл:</p>
                {(order.conditions.permits?.roadPermit || order.conditions.permits?.roadToll) ? (
                  <ul className="list-disc list-inside ml-4">
                    {order.conditions.permits.roadPermit && <li>Замын зөвшөөрөл авна</li>}
                    {order.conditions.permits.roadToll && <li>Замын хураамж тушаана</li>}
                  </ul>
                ) : <p className="ml-1">Тодорхойлоогүй</p>}
              </div>
              {order.conditions.additionalConditions && (
                <div className="col-span-2 flex"><p className="font-bold">Нэмэлт нөхцөл:</p><p className="ml-1">{order.conditions.additionalConditions}</p></div>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-gray-500 mt-10 pt-4 border-t">
          <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
        </footer>
      </div>
    </>
  );
});

CombinedQuotePrintLayout.displayName = 'CombinedQuotePrintLayout';

export default CombinedQuotePrintLayout;

    