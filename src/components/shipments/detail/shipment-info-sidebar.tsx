
'use client';

import * as React from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { mn } from 'date-fns/locale';
import { FileText, User, Info, Calendar, MapPin, Truck, Phone, Cuboid, Package, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Shipment, OrderItemCargo, ShipmentStatusType, PackagingType } from '@/types';

interface ShipmentInfoSidebarProps {
    shipment: Shipment;
    cargo: OrderItemCargo[];
    packagingTypes: PackagingType[];
    statusTranslations: Record<ShipmentStatusType, string>;
    getStatusBadgeVariant: (status: ShipmentStatusType) => "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function DetailItem({ icon: Icon, label, value, subValue }: { icon: React.ElementType, label: string, value?: string | React.ReactNode, subValue?: string }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="font-medium whitespace-pre-wrap">{value}</div>
                {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
            </div>
        </div>
    );
}

export function ShipmentInfoSidebar({ shipment, cargo, packagingTypes, statusTranslations, getStatusBadgeVariant }: ShipmentInfoSidebarProps) {
    const getPackagingTypeName = (id: string) => {
        return packagingTypes.find(p => p.id === id)?.name || id;
    };

    return (
        <div className="space-y-6 lg:sticky top-6">
            <Card>
                <CardHeader>
                    <CardTitle>Дэлгэрэнгүй</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                            <Clock className={cn("h-5 w-5", isAfter(new Date(), shipment.estimatedDeliveryDate) ? "text-destructive" : "text-primary")} />
                            <div>
                                <p className="text-xs text-muted-foreground">{isAfter(new Date(), shipment.estimatedDeliveryDate) ? "Саатсан хугацаа" : "Хүргэхэд үлдсэн"}</p>
                                <p className="text-sm font-bold">{formatDistanceToNow(shipment.estimatedDeliveryDate, { locale: mn, addSuffix: true })}</p>
                            </div>
                        </div>
                        {isAfter(new Date(), shipment.estimatedDeliveryDate) && <Badge variant="destructive" className="animate-pulse">Delayed</Badge>}
                    </div>
                    <DetailItem icon={FileText} label="Захиалгын дугаар" value={<Link href={`/orders/${shipment.orderId}`} className="text-primary hover:underline">{shipment.orderNumber}</Link>} />
                    <DetailItem icon={User} label="Харилцагч" value={shipment.customerName} />
                    <DetailItem icon={Info} label="Статус" value={<Badge variant={getStatusBadgeVariant(shipment.status)}>{statusTranslations[shipment.status]}</Badge>} />
                    <DetailItem icon={Calendar} label="Үүсгэсэн огноо" value={format(shipment.createdAt, 'yyyy-MM-dd HH:mm')} />
                    <DetailItem icon={Calendar} label="Хүргэх огноо (төлөвлөсөн)" value={format(shipment.estimatedDeliveryDate, 'yyyy-MM-dd')} />
                    <Separator />
                    <DetailItem icon={MapPin} label="Ачих цэг" value={shipment.route.startRegion} subValue={shipment.route.startWarehouse} />
                    <DetailItem icon={MapPin} label="Буулгах цэг" value={shipment.route.endRegion} subValue={shipment.route.endWarehouse} />
                    <Separator />
                    <DetailItem icon={Truck} label="Тээврийн хэрэгсэл" value={shipment.vehicleInfo.vehicleType} subValue={shipment.vehicleInfo.trailerType} />
                    <Separator />
                    <DetailItem icon={User} label="Жолоочийн нэр" value={shipment.driverInfo.name} />
                    <DetailItem icon={Phone} label="Жолоочийн утас" value={shipment.driverInfo.phone} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ачааны мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cargo.map((c, i) => (
                        <div key={i} className="p-3 border rounded-md grid grid-cols-1 gap-4">
                            <DetailItem icon={Cuboid} label="Ачааны нэр" value={c.name} />
                            <DetailItem icon={Package} label="Тоо хэмжээ" value={`${c.quantity} ${c.unit}`} />
                            <DetailItem icon={Info} label="Баглаа боодол" value={getPackagingTypeName(c.packagingTypeId)} />
                            {c.notes && <DetailItem icon={FileText} label="Тэмдэглэл" value={c.notes} />}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
