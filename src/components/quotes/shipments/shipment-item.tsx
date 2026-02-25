
import * as React from 'react';
import Link from 'next/link';
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Truck, Package, Megaphone, MegaphoneOff, ExternalLink, Edit, Trash2, User, ChevronDown } from 'lucide-react';
import { OrderItem, DriverQuote, DriverWithVehicle } from '@/types';
import { QuoteManager } from './quote-manager';
import { Firestore } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface ShipmentItemProps {
    item: OrderItem;
    index: number;
    quotes: DriverQuote[];
    drivers: DriverWithVehicle[];
    setDrivers: React.Dispatch<React.SetStateAction<DriverWithVehicle[]>>;
    onFetchOrderData: () => void;
    db: Firestore | null;
    isSubmitting: boolean;
    sendingToSheet: string | null;
    orderId: string;

    onToggleTenderStatus: (item: OrderItem) => void;
    onSetItemToDelete: (item: OrderItem) => void;
    onDuplicateItem: (item: OrderItem) => void;
    onAcceptQuote: (item: OrderItem, quote: DriverQuote) => void;
    onRevertQuote: (item: OrderItem) => void;
    onDeleteQuote: (quoteId: string) => void;
    onSendToSheet: (item: OrderItem, quote: DriverQuote) => void;

    getRegionName: (id: string) => string;
    getWarehouseName: (id: string) => string;
    getVehicleTypeName: (id: string) => string;
    getItemStatusBadgeVariant: (status: any) => any;
}

export function ShipmentItem({
    item,
    index,
    quotes,
    drivers,
    setDrivers,
    onFetchOrderData,
    db,
    isSubmitting,
    sendingToSheet,
    orderId,
    onToggleTenderStatus,
    onSetItemToDelete,
    onDuplicateItem,
    onAcceptQuote,
    onRevertQuote,
    onDeleteQuote,
    onSendToSheet,
    getRegionName,
    getWarehouseName,
    getVehicleTypeName,
}: ShipmentItemProps) {
    const [open, setOpen] = React.useState(false);
    const acceptedQuote = quotes.find(q => q.id === item.acceptedQuoteId);
    const isDraft = Boolean((item as any)?.isDraft);

    const hasRoute =
        Boolean(item.startRegionId) ||
        Boolean(item.startWarehouseId) ||
        Boolean(item.endRegionId) ||
        Boolean(item.endWarehouseId);

    const hasDates = Boolean((item as any).loadingStartDate) || Boolean((item as any).unloadingEndDate);

    return (
        <Card>
            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                        <div className="flex justify-between items-start w-full gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-base">Тээвэрлэлт #{index + 1}</p>
                                    {isDraft && <Badge variant="secondary">Draft</Badge>}
                                    {acceptedQuote && (
                                        <Badge variant="outline" className="ml-1">
                                            <User className="w-3 h-3 mr-1" />
                                            {acceptedQuote.driverName}
                                        </Badge>
                                    )}
                                </div>
                                <div className="space-y-1.5 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            {hasRoute ? (
                                                <>
                                                    {getRegionName(item.startRegionId || '')} ({getWarehouseName(item.startWarehouseId || '')}) &rarr;{' '}
                                                    {getRegionName(item.endRegionId || '')} ({getWarehouseName(item.endWarehouseId || '')})
                                                </>
                                            ) : 'Чиглэл оруулаагүй'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                {hasDates && (item as any).loadingStartDate && (item as any).unloadingEndDate
                                                    ? `${format(new Date((item as any).loadingStartDate), "MM/dd")} - ${format(new Date((item as any).unloadingEndDate), "MM/dd")}`
                                                    : 'Огноо сонгоогүй'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 flex-shrink-0" />
                                            <span>{item.vehicleTypeId ? getVehicleTypeName(item.vehicleTypeId) : 'Машин сонгоогүй'}</span>
                                        </div>
                                    </div>
                                    {(item.cargoItems || []).length > 0 && (
                                        <div className="flex items-start gap-2">
                                            <Package className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                                                {(item.cargoItems || []).map((cargo, idx) => (
                                                    <span key={idx} className="text-xs bg-muted px-1.5 py-0.5 rounded">{cargo.name} ({cargo.quantity} {cargo.unit})</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {item.finalPrice != null && (
                                    <p className="font-semibold text-primary text-lg">{Math.round(item.finalPrice).toLocaleString()}₮</p>
                                )}
                                <Badge variant={item.tenderStatus === 'Open' ? 'success' : 'secondary'}>
                                    {item.tenderStatus === 'Open' ? 'Нээлттэй' : 'Хаалттай'}
                                </Badge>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                        <div className="flex items-center justify-end gap-2 pb-4 border-b">
                            <Button variant="outline" size="sm" onClick={() => onToggleTenderStatus(item)}>
                                {item.tenderStatus === 'Open' ? <MegaphoneOff className="mr-2 h-4 w-4" /> : <Megaphone className="mr-2 h-4 w-4" />}
                                {item.tenderStatus === 'Open' ? 'Тендер хаах' : 'Тендер нээх'}
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/quotes/${orderId}/items/${item.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Засах
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onDuplicateItem(item)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Хувилах
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onSetItemToDelete(item)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Устгах
                            </Button>
                        </div>
                        <QuoteManager
                            orderItemId={item.id}
                            item={item}
                            quotes={quotes}
                            drivers={drivers}
                            setDrivers={setDrivers}
                            onFetchOrderData={onFetchOrderData}
                            db={db}
                            isSubmitting={isSubmitting}
                            sendingToSheet={sendingToSheet}
                            onAcceptQuote={onAcceptQuote}
                            onRevertQuote={onRevertQuote}
                            onDeleteQuote={onDeleteQuote}
                            onSendToSheet={onSendToSheet}
                        />
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
