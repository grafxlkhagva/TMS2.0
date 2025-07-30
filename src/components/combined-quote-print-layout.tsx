
'use client';

import * as React from 'react';
import type { Order, OrderItem, ServiceType, Region, VehicleType, TrailerType } from '@/types';
import { format } from 'date-fns';

type AllData = {
    regions: Region[];
    serviceTypes: ServiceType[];
    vehicleTypes: VehicleType[];
    trailerTypes: TrailerType[];
};

type CombinedQuotePrintLayoutProps = {
  order: Order | null;
  orderItems: OrderItem[];
  allData: AllData;
};

const CombinedQuotePrintLayout = ({ order, orderItems, allData }: CombinedQuotePrintLayoutProps) => {
    if (!order) return null;

    const getRegionName = (id: string) => allData.regions.find(r => r.id === id)?.name || 'N/A';
    const getVehicleTypeName = (id: string) => allData.vehicleTypes.find(v => v.id === id)?.name || 'N/A';
    const getTrailerTypeName = (id: string) => allData.trailerTypes.find(t => t.id === id)?.name || 'N/A';

    const acceptedItems = orderItems.filter(item => item.acceptedQuoteId && item.finalPrice);
    const totalFinalPrice = acceptedItems.reduce((acc, item) => acc + (item.finalPrice || 0), 0);

    return (
        <div className="bg-white p-8 font-sans text-gray-800 text-xs" style={{ width: '210mm' }}>
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
                    <h2 className="text-xl font-bold uppercase">Нэгдсэн үнийн санал</h2>
                    <p className="mt-1">Огноо: {format(new Date(), 'yyyy-MM-dd')}</p>
                    <p className="mt-1">Захиалгын №: {order.orderNumber}</p>
                </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
                <h3 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2">Захиалагчийн мэдээлэл</h3>
                <p><strong>Байгууллага:</strong> {order.customerName}</p>
                <p><strong>Хариуцсан ажилтан:</strong> {order.employeeName}</p>
            </div>

             <div className="mb-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 font-bold">
                            <th className="p-2 border">№</th>
                            <th className="p-2 border">Чиглэл</th>
                            <th className="p-2 border">Тээврийн хэрэгсэл</th>
                            <th className="p-2 border">Огноо</th>
                            <th className="p-2 border text-right">Эцсийн үнэ (₮)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acceptedItems.length > 0 ? acceptedItems.map((item, index) => (
                            <tr key={item.id} className="border-b">
                                <td className="p-2 border">{index + 1}</td>
                                <td className="p-2 border">{getRegionName(item.startRegionId)} &rarr; {getRegionName(item.endRegionId)}</td>
                                <td className="p-2 border">{getVehicleTypeName(item.vehicleTypeId)}, {getTrailerTypeName(item.trailerTypeId)}</td>
                                <td className="p-2 border">
                                    <p>Ачих: {format(new Date(item.loadingStartDate), 'yy/MM/dd')}-{format(new Date(item.loadingEndDate), 'yy/MM/dd')}</p>
                                    <p>Буулгах: {format(new Date(item.unloadingStartDate), 'yy/MM/dd')}-{format(new Date(item.unloadingEndDate), 'yy/MM/dd')}</p>
                                </td>
                                <td className="p-2 border text-right font-medium">{item.finalPrice?.toLocaleString()}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center p-4">Нэгдсэн үнийн саналд оруулахаар сонгогдсон тээвэрлэлт алга.</td>
                            </tr>
                        )}
                    </tbody>
                    {acceptedItems.length > 0 && (
                        <tfoot>
                            <tr className="font-bold bg-gray-100">
                                <td colSpan={4} className="p-2 border text-right">Нийт дүн:</td>
                                <td className="p-2 border text-right">{totalFinalPrice.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            {/* Footer */}
            <div className="text-center text-gray-500 mt-10 pt-4 border-t">
                <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
            </div>
        </div>
    );
};

CombinedQuotePrintLayout.displayName = 'CombinedQuotePrintLayout';

export default CombinedQuotePrintLayout;

    