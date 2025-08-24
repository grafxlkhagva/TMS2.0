
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

  return (
    <div ref={ref} className="bg-white p-8 font-sans text-gray-800 text-sm">
        <style jsx global>{`
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .no-break { page-break-inside: avoid; }
            }
        `}</style>
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold">ТЭЭВЭР ГҮЙЦЭТГЭХ ГЭРЭЭ</h1>
        <p className="text-lg font-semibold mt-1">№{shipment.shipmentNumber}</p>
      </header>

      <div className="flex justify-between items-center mb-8 text-xs">
          <span>Улаанбаатар хот</span>
          <span>{format(contract.createdAt, 'yyyy оны MM сарын dd')}</span>
      </div>

      <section className="mb-6 space-y-2 text-justify">
         <p>
            Энэхүү гэрээг нэг талаас "Түмэн Тех ТМС" (цаашид "Захиалагч" гэх), нөгөө талаас 
            иргэн <strong>{contract.driverInfo.name}</strong> (Утас: {contract.driverInfo.phone}) 
            (цаашид "Гүйцэтгэгч" гэх) нар Монгол Улсын Иргэний хууль болон бусад холбогдох хууль тогтоомжийг удирдлага болгон дараах нөхцлөөр харилцан тохиролцож байгуулав.
        </p>
      </section>

      <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">1. НИЙТЛЭГ ҮНДЭСЛЭЛ</h2>
        <p>1.1. Энэхүү гэрээний зорилго нь Захиалагчийн захиалгын дагуу тодорхой чиглэлд, тодорхой хугацаанд ачаа тээвэрлэхтэй холбогдон үүсэх харилцааг зохицуулахад оршино.</p>
        <p>1.2. Гүйцэтгэгч нь Захиалагчийн өмнө гэрээгээр хүлээсэн үүргээ биелүүлэхдээ Захиалагчийн нэр хүнд, ашиг сонирхолд харшлах үйлдэл гаргахгүй байх үүрэгтэй.</p>
      </section>

       <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">2. ТЭЭВЭРЛЭЛТИЙН МЭДЭЭЛЭЛ</h2>
        <ul className="list-disc list-inside pl-4 space-y-1">
            <li><strong>Чиглэл:</strong> {contract.routeInfo.start} &rarr; {contract.routeInfo.end}</li>
            <li><strong>Тээврийн хэрэгсэл:</strong> {contract.vehicleInfo.type}</li>
            <li><strong>Хүргэх хугацаа:</strong> {format(contract.estimatedDeliveryDate, 'yyyy-MM-dd')}</li>
        </ul>
      </section>

      <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">3. ГЭРЭЭНИЙ ҮНЭ, ТӨЛБӨРИЙН НӨХЦӨЛ</h2>
        <p>3.1. Тээвэрлэлтийн нийт хөлс нь <strong>{contract.price.toLocaleString()}₮</strong> ({contract.priceWithVAT ? "НӨАТ орсон" : "НӨАТ ороогүй"}) байна.</p>
        <p>3.2. Захиалагч нь тээвэрлэлт амжилттай хийгдэж, ачааг хүлээлгэн өгсөн баримтыг үндэслэн ажлын 3 хоногт багтаан Гүйцэтгэгчийн данс руу шилжүүлнэ.</p>
      </section>
      
       <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">4. ТАЛУУДЫН ЭРХ, ҮҮРЭГ</h2>
        <p><strong>4.1. Гүйцэтгэгчийн үүрэг:</strong></p>
        <ul className="list-decimal list-inside pl-4 text-xs">
            <li>Ачааг бүрэн бүтэн, аюулгүй байдлыг хангаж, тохирсон хугацаанд заасан цэгт хүргэх.</li>
            <li>Тээвэрлэлтийн явцад гарсан аливаа асуудлыг Захиалагчид нэн даруй мэдэгдэх.</li>
            <li>Тээврийн хэрэгслийн бүрэн бүтэн, техникийн аюулгүй байдлыг хангах.</li>
        </ul>
        <p className="mt-2"><strong>4.2. Захиалагчийн үүрэг:</strong></p>
        <ul className="list-decimal list-inside pl-4 text-xs">
            <li>Тээврийн хөлсийг гэрээнд заасан хугацаанд бүрэн төлөх.</li>
            <li>Ачааг ачих, буулгахад шаардлагатай нөхцөлийг хангах.</li>
        </ul>
      </section>

      <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">5. ХАРИУЦЛАГА</h2>
        <p>5.1. Гүйцэтгэгчийн буруутай үйл ажиллагааны улмаас ачаа устаж, гэмтсэн тохиолдолд учирсан хохирлыг Гүйцэтгэгч бүрэн хариуцна.</p>
        <p>5.2. Захиалагч тээврийн хөлсийг хугацаандаа төлөөгүй тохиолдолд хугацаа хэтэрсэн хоног тутамд гүйцэтгээгүй үүргийн үнийн дүнгийн 0.5 хувиар алданги тооцно.</p>
      </section>

      {contract.status === 'signed' && contract.signedAt && (
        <section className="mb-8 space-y-2 no-break">
            <h2 className="text-base font-bold mb-2">6. БАТАЛГААЖУУЛАЛТ</h2>
            <p>Гүйцэтгэгч нь дээрх нөхцлүүдийг зөвшөөрч, цахим хэлбэрээр гарын үсэг зурж баталгаажуулав.</p>
            <div className="border p-4 rounded-md bg-gray-50 mt-4 inline-block">
                <p className="font-semibold">Цахим гарын үсэг:</p>
                {contract.signatureDataUrl && <img src={contract.signatureDataUrl} alt="Signature" className="h-20 w-auto bg-white mix-blend-darken" />}
                <p className="text-xs text-gray-500 mt-2">Огноо: {format(contract.signedAt, 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
        </section>
      )}

      <footer className="mt-12 pt-8 border-t-2 border-dashed no-break">
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
