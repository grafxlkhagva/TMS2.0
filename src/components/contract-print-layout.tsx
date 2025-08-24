
'use client';

import * as React from 'react';
import type { Contract, OrderItem, Shipment } from '@/types';
import { format } from 'date-fns';

type ContractPrintLayoutProps = {
  contract: Contract | null;
  shipment: Shipment | null;
  orderItem: OrderItem | null;
};

const ContractPrintLayout = React.forwardRef<
  HTMLDivElement,
  ContractPrintLayoutProps
>(({ contract, shipment, orderItem }, ref) => {
  if (!contract || !shipment || !orderItem) return null;
  
  const finalPrice = orderItem.finalPrice || 0;

  return (
    <div ref={ref} className="bg-white p-8 font-sans text-gray-800 text-sm">
        <style jsx global>{`
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `}</style>
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold">ТЭЭВЭРЛЭЛТИЙН ГЭРЭЭ</h1>
        <p className="text-lg font-semibold mt-1">№{shipment.shipmentNumber}</p>
      </header>

      <div className="flex justify-between items-center mb-8 text-xs">
          <span>Улаанбаатар хот</span>
          <span>{format(contract.createdAt, 'yyyy оны MM сарын dd')}</span>
      </div>

      <section className="mb-6 space-y-2">
         <p>
            Энэхүү гэрээг нэг талаас "Түмэн Тех ТМС" (цаашид "Захиалагч" гэх), нөгөө талаас 
            жолооч <strong>{contract.driverInfo.name}</strong> (Утас: {contract.driverInfo.phone}) 
            (цаашид "Гүйцэтгэгч" гэх) нар дараах нөхцлөөр харилцан тохиролцож байгуулав.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="text-base font-bold mb-2">1. Гэрээний зүйл</h2>
         <p>
            Захиалагч нь дор дурдсан ачааг, заасан чиглэлийн дагуу тээвэрлүүлэх ажлыг Гүйцэтгэгчид даалгаж,
            Гүйцэтгэгч нь уг ажлыг хэлэлцэн тохирсон үнээр, хугацаанд нь чанартай гүйцэтгэх үүргийг хүлээнэ.
        </p>
         <ul className="list-disc list-inside pl-4 space-y-1">
            <li><strong>Чиглэл:</strong> {shipment.route.startWarehouse} &rarr; {shipment.route.endWarehouse}</li>
            <li><strong>Хүргэх хугацаа:</strong> {format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')}</li>
        </ul>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="text-base font-bold mb-2">2. Гэрээний үнэ, төлбөрийн нөхцөл</h2>
        <p>
           Тээвэрлэлтийн нийт хөлс нь <strong>{finalPrice.toLocaleString()}₮</strong> ({orderItem.withVAT ? "НӨАТ орсон" : "НӨАТ ороогүй"}) байна. 
           Төлбөрийг тээвэрлэлт дууссаны дараа ажлын 3 хоногт багтаан Гүйцэтгэгчийн данс руу шилжүүлнэ.
        </p>
      </section>
      
       <section className="mb-6 space-y-2">
        <h2 className="text-base font-bold mb-2">3. Талуудын үүрэг</h2>
        <p>3.1. Гүйцэтгэгч нь ачааг бүрэн бүтэн, аюулгүй тээвэрлэж, тохирсон хугацаанд хүргэх үүрэгтэй.</p>
        <p>3.2. Захиалагч нь тээврийн хөлсийг гэрээнд заасан хугацаанд бүрэн төлөх үүрэгтэй.</p>
        <p>3.3. ... (бусад нөхцлүүд)</p>
      </section>

      {contract.status === 'signed' && contract.signedAt && (
        <section className="mb-8 space-y-2">
            <h2 className="text-base font-bold mb-2">4. Баталгаажилт</h2>
            <p>Гүйцэтгэгч нь дээрх нөхцлүүдийг зөвшөөрч, цахим хэлбэрээр гарын үсэг зурж баталгаажуулав.</p>
            <div className="border p-4 rounded-md bg-gray-50 mt-4 inline-block">
                <p className="font-semibold">Цахим гарын үсэг:</p>
                {contract.signatureDataUrl && <img src={contract.signatureDataUrl} alt="Signature" className="h-20 w-auto bg-white mix-blend-darken" />}
                <p className="text-xs text-gray-500 mt-2">Огноо: {format(contract.signedAt, 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
        </section>
      )}

      <footer className="mt-12 pt-8 border-t-2 border-dashed">
         <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
                <p className="font-bold">ЗАХИАЛАГЧ:</p>
                <p>"Түмэн Тех ТМС"</p>
                <p className="mt-8">........................................</p>
                <p>(Гарын үсэг)</p>
            </div>
             <div>
                <p className="font-bold">ГҮЙЦЭТГЭГЧ:</p>
                <p>{contract.driverInfo.name}</p>
                 <div className="mt-8">
                     {contract.status !== 'signed' ? (
                        <p>........................................</p>
                     ) : (
                        <div className="h-10 w-40">
                             {contract.signatureDataUrl && <img src={contract.signatureDataUrl} alt="Signature" className="h-full w-full object-contain mix-blend-darken" />}
                        </div>
                     )}
                 </div>
                <p>(Гарын үсэг)</p>
            </div>
         </div>
      </footer>
    </div>
  );
});

ContractPrintLayout.displayName = 'ContractPrintLayout';

export default ContractPrintLayout;
