
'use client';

import * as React from 'react';
import type { Shipment, OrderItemCargo, PackagingType, ShipmentUpdate } from '@/types';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';

type ShipmentReportLayoutProps = {
  shipment: Shipment | null;
  cargo: OrderItemCargo[];
  packagingTypes: PackagingType[];
  shipmentUpdates: ShipmentUpdate[];
};

const ChecklistItem = ({ label, checked }: { label: string; checked: boolean }) => (
    <div className="flex items-center justify-between text-xs py-1.5 border-b">
        <span>{label}</span>
        {checked ? (
            <span className="flex items-center text-green-600 font-semibold"><Check className="h-4 w-4 mr-1"/> Тийм</span>
        ) : (
            <span className="flex items-center text-red-600 font-semibold"><X className="h-4 w-4 mr-1"/> Үгүй</span>
        )}
    </div>
);


const ShipmentReportLayout = React.forwardRef<
  HTMLDivElement,
  ShipmentReportLayoutProps
>(({ shipment, cargo, packagingTypes, shipmentUpdates }, ref) => {
  if (!shipment) return null;

  const getPackagingTypeName = (id: string) => {
    return packagingTypes.find(p => p.id === id)?.name || id;
  }
  
  const checklist = shipment.checklist;

  return (
    <div ref={ref} className="bg-white p-8 font-sans text-gray-800 text-sm">
        <style jsx global>{`
            @media print {
                body { -webkit-print-color-adjust: exact; }
                .no-break { page-break-inside: avoid; }
            }
        `}</style>
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold">ТЭЭВЭРЛЭЛТИЙН ТАЙЛАН</h1>
        <p className="text-lg font-semibold mt-1">№{shipment.shipmentNumber}</p>
      </header>

      <div className="flex justify-between items-center mb-8 text-xs">
          <span>Улаанбаатар хот</span>
          <span>{format(shipment.createdAt, 'yyyy оны MM сарын dd')}</span>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-x-8 gap-y-4 no-break">
        <div>
            <h2 className="text-base font-bold mb-2 border-b">Ерөнхий мэдээлэл</h2>
            <p><strong>Захиалгын №:</strong> {shipment.orderNumber}</p>
            <p><strong>Харилцагч:</strong> {shipment.customerName}</p>
            <p><strong>Жолооч:</strong> {shipment.driverInfo.name}</p>
            <p><strong>Утас:</strong> {shipment.driverInfo.phone}</p>
            <p><strong>Тээврийн хэрэгсэл:</strong> {shipment.vehicleInfo.vehicleType}, {shipment.vehicleInfo.trailerType}</p>
        </div>
        <div>
            <h2 className="text-base font-bold mb-2 border-b">Чиглэл ба Огноо</h2>
            <p><strong>Ачих цэг:</strong> {shipment.route.startWarehouse}, {shipment.route.startRegion}</p>
            <p><strong>Буулгах цэг:</strong> {shipment.route.endWarehouse}, {shipment.route.endRegion}</p>
            <p><strong>Гарсан огноо:</strong> {format(shipment.createdAt, 'yyyy-MM-dd HH:mm')}</p>
            <p><strong>Хүргэсэн огноо:</strong> {shipment.status === 'Delivered' ? format(new Date(), 'yyyy-MM-dd HH:mm') : 'Хүргэгдээгүй'}</p>
        </div>
      </section>

      <section className="mb-6 no-break">
        <h2 className="text-base font-bold mb-2 border-b">Ачааны дэлгэрэнгүй</h2>
        <table className="w-full text-left text-xs">
            <thead className="bg-gray-100">
                <tr>
                    <th className="p-1 border">№</th>
                    <th className="p-1 border">Ачааны нэр</th>
                    <th className="p-1 border">Тоо хэмжээ</th>
                    <th className="p-1 border">Баглаа боодол</th>
                    <th className="p-1 border">Тэмдэглэл</th>
                </tr>
            </thead>
            <tbody>
                {cargo.map((item, index) => (
                    <tr key={index}>
                        <td className="p-1 border">{index + 1}</td>
                        <td className="p-1 border">{item.name}</td>
                        <td className="p-1 border">{item.quantity} {item.unit}</td>
                        <td className="p-1 border">{getPackagingTypeName(item.packagingTypeId)}</td>
                        <td className="p-1 border">{item.notes || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </section>

      <section className="mb-6 no-break">
        <h2 className="text-base font-bold mb-2 border-b">Тээврийн явцын түүх</h2>
        <table className="w-full text-left text-xs">
             <thead className="bg-gray-100">
                <tr>
                    <th className="p-1 border">Огноо</th>
                    <th className="p-1 border">Байршил</th>
                    <th className="p-1 border">Туулсан зам (км)</th>
                    <th className="p-1 border">Төлөв</th>
                    <th className="p-1 border">Замын нөхцөл</th>
                </tr>
            </thead>
            <tbody>
                {[...shipmentUpdates].sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()).map((update) => (
                    <tr key={update.id}>
                        <td className="p-1 border">{format(update.createdAt, 'yy-MM-dd HH:mm')}</td>
                        <td className="p-1 border">{update.location}</td>
                        <td className="p-1 border">{update.distanceCovered}</td>
                        <td className="p-1 border">{update.status === 'Delayed' ? 'Саатсан' : 'Хэвийн'}</td>
                        <td className="p-1 border">{update.roadConditions}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </section>

       <section className="mb-6 no-break">
        <h2 className="text-base font-bold mb-2 border-b">Процессын чеклист</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
                <h3 className="font-semibold text-sm mb-1">Бэлтгэл үе шат</h3>
                <ChecklistItem label="Гэрээ баталгаажсан" checked={checklist.contractSigned} />
                <ChecklistItem label="АА-ны заавартай танилцсан" checked={checklist.safetyBriefingCompleted} />
                <ChecklistItem label="Жолоочийн мэдээллийг захиалагчид өгсөн" checked={checklist.sentDriverInfoToCustomer} />
                <ChecklistItem label="Ачилтын мэдээллийг захиалагчид өгсөн" checked={checklist.sentLoadingInfoToCustomer} />
                <ChecklistItem label="Ибаримт-н данс авсан" checked={checklist.receivedEbarimtAccount} />
                <ChecklistItem label="Санхүүд данс өгсөн" checked={checklist.providedAccountToFinance} />
            </div>
             <div>
                <h3 className="font-semibold text-sm mb-1">Ачилт ба Буулгалтын шат</h3>
                <ChecklistItem label="Ачилтын AI чеклист хийгдсэн" checked={checklist.loadingChecklistCompleted} />
                <ChecklistItem label="Ачсан байдлын зураг авсан" checked={checklist.loadingPhotoTaken} />
                <ChecklistItem label="Ачааны дагалдах бичиг авсан" checked={checklist.cargoDocumentsReceived} />
                <ChecklistItem label="Захиалагчид ачсан тухай мэдэгдсэн" checked={checklist.informedCustomerOnLoad} />
                <ChecklistItem label="Буулгалтын AI чеклист хийгдсэн" checked={checklist.unloadingChecklistCompleted} />
                <ChecklistItem label="Буулгасан байдлын зураг авсан" checked={checklist.unloadingPhotoTaken} />
                <ChecklistItem label="Буулгасан тухай мэдэгдсэн" checked={checklist.informedCustomerOnUnload} />
                <ChecklistItem label="Буулгалтын баримт хавсаргасан" checked={checklist.unloadingDocumentsAttached} />
                 <ChecklistItem label="Хүргэлтийн баримт баталгаажсан" checked={checklist.deliveryDocumentsSigned} />
            </div>
        </div>
      </section>

      <footer className="mt-12 pt-8 border-t-2 border-dashed no-break">
         <div className="grid grid-cols-3 gap-8 text-sm">
            <div>
                <p className="font-bold">Хүлээлгэн өгсөн:</p>
                <p className="mt-1">{shipment.driverInfo.name}</p>
                <p className="mt-16 border-b"></p>
                <p className="text-xs">(Гарын үсэг)</p>
            </div>
             <div>
                <p className="font-bold">Хүлээн авсан:</p>
                <p className="mt-1">........................................</p>
                <p className="mt-16 border-b"></p>
                <p className="text-xs">(Гарын үсэг)</p>
            </div>
            <div>
                <p className="font-bold">Компанийг төлөөлж:</p>
                <p className="mt-1">........................................</p>
                <p className="mt-16 border-b"></p>
                <p className="text-xs">(Гарын үсэг, тэмдэг)</p>
            </div>
         </div>
      </footer>
    </div>
  );
});

ShipmentReportLayout.displayName = 'ShipmentReportLayout';

export default ShipmentReportLayout;
