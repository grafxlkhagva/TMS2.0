
'use client';

import * as React from 'react';
import type { SafetyBriefing, Shipment } from '@/types';
import { format } from 'date-fns';

type SafetyBriefingLayoutProps = {
  briefing: SafetyBriefing | null;
  shipment: Shipment | null;
};

const SafetyBriefingLayout = React.forwardRef<
  HTMLDivElement,
  SafetyBriefingLayoutProps
>(({ briefing, shipment }, ref) => {
  if (!briefing || !shipment) return null;

  return (
    <div ref={ref} className="bg-white p-8 font-sans text-gray-800 text-sm">
      <style jsx global>{`
        @media print {
            body { -webkit-print-color-adjust: exact; }
            .no-break { page-break-inside: avoid; }
        }
    `}</style>
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold">АЮУЛГҮЙ АЖИЛЛАГААНЫ ЗААВАРЧИЛГАА</h1>
        <p className="text-lg font-semibold mt-1">Тээвэрлэлт №{shipment.shipmentNumber}</p>
      </header>

      <div className="flex justify-between items-center mb-8 text-xs">
          <span>Улаанбаатар хот</span>
          <span>{format(briefing.createdAt, 'yyyy оны MM сарын dd')}</span>
      </div>

      <section className="mb-6 space-y-2 text-justify">
         <p>
            Энэхүү зааварчилгааг нэг талаас "Түмэн Тех ТМС" (цаашид "Компани" гэх), нөгөө талаас 
            жолооч <strong>{briefing.driverInfo.name}</strong> (Утас: {briefing.driverInfo.phone}) 
            (цаашид "Жолооч" гэх) нар тээвэрлэлтийн явцад мөрдөх аюулгүй ажиллагааны дүрмийг танилцуулах, баталгаажуулах зорилгоор байгуулав.
        </p>
      </section>

      <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">1. ЕРӨНХИЙ ШААРДЛАГА</h2>
        <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
            <li>Тээврийн хэрэгслийн техникийн бүрэн бүтэн байдлыг тээвэрлэлт эхлэхээс өмнө шалгасан байх.</li>
            <li>Согтууруулах ундаа, мансууруулах бодис хэрэглэсэн үед тээврийн хэрэгсэл жолоодохыг хатуу хориглоно.</li>
            <li>Хөдөлгөөний аюулгүй байдлын дүрэм, замын тэмдэг, тэмдэглэгээг чанд мөрдөж ажиллах.</li>
            <li>Ачааг тээврийн хэрэгсэлд зөв байршуулж, бэхэлгээг найдвартай хийсэн эсэхийг шалгах.</li>
        </ul>
      </section>

       <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">2. АЧИХ, БУУЛГАХ ҮЕИЙН АЮУЛГҮЙ БАЙДАЛ</h2>
        <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
            <li>Ачиж, буулгах үйл ажиллагааг зөвхөн тусгайлан заасан, аюулгүй талбайд гүйцэтгэх.</li>
            <li>Ачаа өргөх, буулгах техник хэрэгслийн дэргэд илүү хүн байлгахгүй байх, аюулгүйн бүсээс гарахгүй байх.</li>
            <li>Хувийн хамгаалах хэрэгсэл (бээлий, каск, хамгаалалтын гутал)-ийг зохих ёсоор хэрэглэх.</li>
        </ul>
      </section>

      <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">3. ЗАМЫН ХӨДӨЛГӨӨНИЙ АЮУЛГҮЙ БАЙДАЛ</h2>
         <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
            <li>Хурдыг зөвшөөрөгдсөн хэмжээнээс хэтрүүлэхгүй байх.</li>
            <li>Цаг агаар, замын нөхцөл байдалд тохируулан хөдөлгөөний хурдыг сонгох.</li>
            <li>Урт хугацааны тээвэрлэлтийн үед тогтмол амрах, нойрны дэглэмийг баримтлах.</li>
        </ul>
      </section>
      
       <section className="mb-6 space-y-2 no-break">
        <h2 className="text-base font-bold mb-2">4. ОНЦГОЙ НӨХЦӨЛ БАЙДАЛ</h2>
        <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
            <li>Зам тээврийн осол, гэмтэл гарсан тохиолдолд нэн даруй компанийн менежерт болон холбогдох байгууллагад мэдэгдэх.</li>
            <li>Тээврийн хэрэгсэлд техникийн гэмтэл гарсан тохиолдолд аюулгүйн арга хэмжээ авч, бусдын хөдөлгөөнд саад учруулахгүйгээр зогсох.</li>
        </ul>
      </section>

      {briefing.status === 'signed' && briefing.signedAt && (
        <section className="mb-8 space-y-2 no-break">
            <h2 className="text-base font-bold mb-2">5. БАТАЛГААЖУУЛАЛТ</h2>
            <p>Жолооч нь дээрх зааварчилгаатай бүрэн танилцаж, мөрдөж ажиллахаа хүлээн зөвшөөрч, цахим хэлбэрээр гарын үсэг зурж баталгаажуулав.</p>
            <div className="border p-4 rounded-md bg-gray-50 mt-4 inline-block">
                <p className="font-semibold">Цахим гарын үсэг:</p>
                {briefing.signatureDataUrl && <img src={briefing.signatureDataUrl} alt="Signature" className="h-20 w-auto bg-white mix-blend-darken" />}
                <p className="text-xs text-gray-500 mt-2">Огноо: {format(briefing.signedAt, 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
        </section>
      )}

      <footer className="mt-12 pt-8 border-t-2 border-dashed no-break">
         <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
                <p className="font-bold">ЗААВАРЧИЛГАА ӨГСӨН:</p>
                <p>"Түмэн Тех ТМС"</p>
                <p className="mt-8">........................................</p>
                <p>(Гарын үсэг)</p>
            </div>
             <div>
                <p className="font-bold">ЗААВАРЧИЛГААТАЙ ТАНИЛЦСАН:</p>
                <p>{briefing.driverInfo.name}</p>
                 <div className="mt-8">
                     {briefing.status !== 'signed' ? (
                        <p>........................................</p>
                     ) : (
                        <div className="h-10 w-40">
                             {briefing.signatureDataUrl && <img src={briefing.signatureDataUrl} alt="Signature" className="h-full w-full object-contain mix-blend-darken" />}
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

SafetyBriefingLayout.displayName = 'SafetyBriefingLayout';

export default SafetyBriefingLayout;
