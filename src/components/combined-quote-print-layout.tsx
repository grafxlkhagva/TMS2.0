
'use client';

import * as React from 'react';
import type { Order, OrderItem, ServiceType, Region, VehicleType, TrailerType, Warehouse, PackagingType, OrderItemCargo } from '@/types';
import { format } from 'date-fns';

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
  quotesMap: Map<string, any[]>;
};

const CombinedQuotePrintLayout = React.forwardRef<HTMLDivElement, CombinedQuotePrintLayoutProps>(
  ({ order, orderItems, allData, quotesMap }, ref) => {
    if (!order) return null;

    const getServiceName = (id: string) => allData.serviceTypes.find(s => s.id === id)?.name || 'N/A';
    const getRegionName = (id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A';
    const getWarehouseName = (id: string) => allData.warehouses.find(w => w.id === id)?.name || 'N/A';
    const getVehicleTypeName = (id: string) => allData.vehicleTypes.find(v => v.id === id)?.name || 'N/A';
    const getTrailerTypeName = (id: string) => allData.trailerTypes.find(t => t.id === id)?.name || 'N/A';
    const getPackagingTypeName = (id: string) => allData.packagingTypes.find(p => p.id === id)?.name || 'N/A';

    const acceptedItems = orderItems.filter(item => item.acceptedQuoteId && item.finalPrice);

    let totalPayment = 0;
    let totalVat = 0;
    let totalFinalPrice = 0;

    acceptedItems.forEach(item => {
        const finalPrice = item.finalPrice || 0;
        const priceBeforeVat = finalPrice / (item.withVAT ? 1.1 : 1);
        const vat = item.withVAT ? priceBeforeVat * 0.1 : 0;
        
        totalPayment += priceBeforeVat;
        totalVat += vat;
        totalFinalPrice += finalPrice;
    });

    return (
        <div ref={ref} className="bg-white p-8 font-sans text-gray-800 text-[10px]" style={{ width: '297mm', minHeight: '210mm' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-700 pb-4 mb-6">
                <div>
                     <svg
                        className="h-12 w-12"
                        viewBox="0 0 714 735"
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g transform="matrix(1,0,0,1,-7830.54,-17449.4)">
                          <g transform="matrix(1.2013e-16,1.96187,-1.96187,1.2013e-16,13141.4,-15700.3)">
                            <path
                              d="M17271.2,2506.18L17066.3,2506.18L17066.3,2707.06C17053.3,2705.87 17040.7,2703.4 17028.6,2699.78L17028.6,2468.5L17263,2468.5C17267.1,2480.56 17269.9,2493.17 17271.2,2506.18ZM17245.2,2430.82L17179.4,2430.82L17179.4,2367.56C17206.4,2383 17229,2404.79 17245.2,2430.82ZM17245.4,2619.23C17229.2,2645.36 17206.4,2667.24 17179.4,2682.72L17179.4,2619.23L17245.4,2619.23ZM17263.1,2581.55L17141.7,2581.55L17141.7,2699.14C17129.6,2702.91 17117,2705.53 17114,2706.86L17104,2543.87L17271.3,2543.87C17269.9,2556.88 17267.1,2569.49 17263.1,2581.55ZM16991,2683.89C16963,2668.35 16939.5,2646.02 16922.8,2619.23L16991,2619.23L16991,2683.89ZM16905.1,2581.55C16901.1,2569.49 16898.3,2556.88 16897,2543.87L16991,2543.87L16991,2581.55L16905.1,2581.55ZM16897,2506.18C16898.4,2493.17 16901.2,2480.56 16905.2,2468.5L16991,2468.5L16991,2506.18L16897,2506.18ZM16923,2430.82C16939.6,2404.13 16963,2381.89 16991,2366.39L16991,2430.82L16923,2430.82ZM17028.6,2350.5C17040.7,2346.88 17053.3,2344.41 17066.3,2343.22L17066.3,2430.82L17028.6,2430.82L17028.6,2350.5ZM17104,2343.42C17117,2344.75 17129.6,2347.37 17141.7,2351.14L17141.7,2430.82L17104,2430.82L17104,2343.42Z"
                              style={{ fill: 'rgb(242,99,33)' }}
                            />
                          </g>
                        </g>
                      </svg>
                    <h1 className="text-2xl font-bold mt-2">Tumen Tech TMS</h1>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold uppercase">Үнийн санал</h2>
                    <div className="flex justify-end mt-1"><p><strong>Огноо:</strong></p><p className="ml-1">{format(new Date(), 'yyyy-MM-dd')}</p></div>
                    <div className="flex justify-end mt-1"><p><strong>Захиалгын №:</strong></p><p className="ml-1">{order.orderNumber}</p></div>
                </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
                <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Захиалагчийн мэдээлэл</h3>
                <div className="flex"><p><strong>Байгууллага:</strong></p><p className="ml-1">{order.customerName}</p></div>
                <div className="flex"><p><strong>Хариуцсан ажилтан:</strong></p><p className="ml-1">{order.employeeName}</p></div>
            </div>

             <div className="mb-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 font-bold">
                            <th className="p-1 border">Үйлчилгээний төрөл</th>
                            <th className="p-1 border">Ачааны мэдээлэл</th>
                            <th className="p-1 border">Ачих</th>
                            <th className="p-1 border">Буулгах</th>
                            <th className="p-1 border">Нийт зам</th>
                            <th className="p-1 border">Тээврийн хэрэгсэл</th>
                            <th className="p-1 border text-right">Тээврийн үнэ</th>
                            <th className="p-1 border text-right">Тээврийн тоо</th>
                            <th className="p-1 border text-right">Нийт төлбөр</th>
                            <th className="p-1 border text-right">НӨАТ</th>
                            <th className="p-1 border text-right">Нийт дүн</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acceptedItems.length > 0 ? acceptedItems.map((item) => {
                            const finalPrice = item.finalPrice || 0;
                            const priceBeforeVatWithProfit = finalPrice / (item.withVAT ? 1.1 : 1);
                            const vatAmount = item.withVAT ? priceBeforeVatWithProfit * 0.1 : 0;
                            const singleTransportPriceWithProfit = priceBeforeVatWithProfit / (item.frequency || 1);

                            return (
                              <tr key={item.id} className="border-b">
                                <td className="p-1 border align-top">{getServiceName(item.serviceTypeId)}</td>
                                <td className="p-1 border align-top">
                                    <table className="w-full">
                                        <tbody>
                                            {(item.cargoItems || []).map((cargo: OrderItemCargo, i: number) => (
                                                <tr key={i}>
                                                    <td className="pr-2">{cargo.name}</td>
                                                    <td className="pr-2">{cargo.quantity}{cargo.unit}</td>
                                                    <td>({getPackagingTypeName(cargo.packagingTypeId)})</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </td>
                                <td className="p-1 border align-top">
                                  <p>{getRegionName(item.startRegionId)}</p>
                                  <p className="text-gray-600">{getWarehouseName(item.startWarehouseId)}</p>
                                </td>
                                <td className="p-1 border align-top">
                                  <p>{getRegionName(item.endRegionId)}</p>
                                  <p className="text-gray-600">{getWarehouseName(item.endWarehouseId)}</p>
                                </td>
                                <td className="p-1 border align-top">{item.totalDistance} км</td>
                                <td className="p-1 border align-top">{`${getVehicleTypeName(item.vehicleTypeId)}, ${getTrailerTypeName(item.trailerTypeId)}`}</td>
                                <td className="p-1 border text-right align-top">{singleTransportPriceWithProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-1 border text-right align-top">{item.frequency}</td>
                                <td className="p-1 border text-right align-top">{priceBeforeVatWithProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-1 border text-right align-top">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-1 border text-right font-medium align-top">{finalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={11} className="text-center p-4">Үнийн саналд оруулахаар сонгогдсон тээвэрлэлт алга.</td>
                            </tr>
                        )}
                    </tbody>
                    {acceptedItems.length > 0 && (
                        <tfoot>
                            <tr className="font-bold bg-gray-100">
                                <td colSpan={8} className="p-1 border text-right">Нийт дүн:</td>
                                <td className="p-1 border text-right">{totalPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-1 border text-right">{totalVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="p-1 border text-right">{totalFinalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {order.conditions && (
                 <div className="mb-6 mt-8">
                    <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Тээврийн нөхцөл</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div className="flex"><p><strong>Ачилт:</strong></p><p className="ml-1">{order.conditions.loading}</p></div>
                        <div className="flex"><p><strong>Буулгалт:</strong></p><p className="ml-1">{order.conditions.unloading}</p></div>
                        <div className="flex"><p><strong>ТХ-н бэлэн байдал:</strong></p><p className="ml-1">{order.conditions.vehicleAvailability}</p></div>
                        <div className="flex"><p><strong>Төлбөрийн нөхцөл:</strong></p><p className="ml-1">{order.conditions.paymentTerm}</p></div>
                        <div className="col-span-2 flex"><p><strong>Даатгал:</strong></p><p className="ml-1">{order.conditions.insurance}</p></div>
                        <div className="col-span-2">
                            <strong>Зөвшөөрөл:</strong>
                            {(order.conditions.permits?.roadPermit || order.conditions.permits?.roadToll) ? (
                                <ul className="list-disc list-inside ml-4">
                                    {order.conditions.permits.roadPermit && <li>Замын зөвшөөрөл авна</li>}
                                    {order.conditions.permits.roadToll && <li>Замын хураамж тушаана</li>}
                                </ul>
                            ) : "Тодорхойлоогүй"}
                        </div>
                         {order.conditions.additionalConditions && (
                            <div className="col-span-2 flex"><p><strong>Нэмэлт нөхцөл:</strong></p><p className="ml-1">{order.conditions.additionalConditions}</p></div>
                        )}
                    </div>
                 </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-500 mt-10 pt-4 border-t">
                <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
            </div>
        </div>
    );
  }
);

CombinedQuotePrintLayout.displayName = 'CombinedQuotePrintLayout';

export default CombinedQuotePrintLayout;
