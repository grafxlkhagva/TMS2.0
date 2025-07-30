
'use client';

import * as React from 'react';
import type { Order, OrderItem, DriverQuote } from '@/types';
import { format } from 'date-fns';

type QuotePrintLayoutProps = {
  order: Order | null;
  orderItem: OrderItem;
  quotes: DriverQuote[];
  itemIndex: number;
  calculateFinalPrice: (item: OrderItem, quote: DriverQuote) => {
    priceWithProfit: number;
    vatAmount: number;
    finalPrice: number;
  };
};

const QuotePrintLayout = ({ order, orderItem, quotes, itemIndex, calculateFinalPrice }: QuotePrintLayoutProps) => {
    if (!order) return null;

    return (
        <div className="bg-white p-8 font-sans text-gray-800" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-700 pb-4 mb-8">
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
                    <h1 className="text-3xl font-bold mt-2">Tumen Tech TMS</h1>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold uppercase">Үнийн санал</h2>
                    <p className="mt-1">Огноо: {format(new Date(), 'yyyy-MM-dd')}</p>
                    <p className="mt-1">Захиалгын №: {order.orderNumber}</p>
                    <p className="mt-1">Тээвэрлэлт №: {itemIndex + 1}</p>
                </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold border-b border-gray-400 pb-1 mb-2">Захиалагчийн мэдээлэл</h3>
                <p><strong>Байгууллага:</strong> {order.customerName}</p>
                <p><strong>Хариуцсан ажилтан:</strong> {order.employeeName}</p>
            </div>

            {/* Quotes Table */}
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-200 uppercase">
                    <tr>
                        <th className="p-2">Жолооч</th>
                        <th className="p-2">Утас</th>
                        <th className="p-2">Санал (₮)</th>
                        <th className="p-2">Эцсийн үнэ (₮)</th>
                        <th className="p-2">Тэмдэглэл</th>
                    </tr>
                </thead>
                <tbody>
                    {quotes.map(quote => {
                       const { finalPrice } = calculateFinalPrice(orderItem, quote);
                       return (
                        <tr key={quote.id} className="border-b">
                            <td className="p-2">{quote.driverName}</td>
                            <td className="p-2">{quote.driverPhone}</td>
                            <td className="p-2">{quote.price.toLocaleString()}</td>
                            <td className="p-2">{finalPrice.toLocaleString()}</td>
                            <td className="p-2">{quote.notes || '-'}</td>
                        </tr>
                       )
                    })}
                </tbody>
            </table>
            
            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-12 pt-4 border-t">
                <p>Tumen Tech TMS - Тээвэр ложистикийн удирдлагын систем</p>
            </div>
        </div>
    );
};

QuotePrintLayout.displayName = 'QuotePrintLayout';

export default QuotePrintLayout;

