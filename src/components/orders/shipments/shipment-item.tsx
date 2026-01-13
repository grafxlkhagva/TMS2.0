
import * as React from 'react';
import Link from 'next/link';
import { format } from "date-fns";
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Truck, Package, Megaphone, MegaphoneOff, ExternalLink, Edit, Trash2, User } from 'lucide-react';
import { OrderItem, Shipment, DriverQuote, DriverWithVehicle } from '@/types';
import { QuoteManager } from './quote-manager';
import { StatusTracker } from './status-tracker';
import { Firestore } from 'firebase/firestore';

interface ShipmentItemProps {
    item: OrderItem;
    index: number;
    shipment?: Shipment;
    quotes: DriverQuote[];
    drivers: DriverWithVehicle[];
    setDrivers: React.Dispatch<React.SetStateAction<DriverWithVehicle[]>>;
    onFetchOrderData: () => void;
    db: Firestore | null;
    isSubmitting: boolean;
    sendingToSheet: string | null;
    orderId: string;

    // Actions
    onToggleTenderStatus: (item: OrderItem) => void;
    onSetItemToShip: (item: OrderItem) => void;
    onSetItemToDelete: (item: OrderItem) => void;
    onDuplicateItem: (item: OrderItem) => void;

    onAcceptQuote: (item: OrderItem, quote: DriverQuote) => void;
    onRevertQuote: (item: OrderItem) => void;
    onDeleteQuote: (quoteId: string) => void;
    onSendToSheet: (item: OrderItem, quote: DriverQuote) => void;

    // Lookups
    getRegionName: (id: string) => string;
    getWarehouseName: (id: string) => string;
    getVehicleTypeName: (id: string) => string;
    getItemStatusBadgeVariant: (status: any) => any;
}

export function ShipmentItem({
    item,
    index,
    shipment,
    quotes,
    drivers,
    setDrivers,
    onFetchOrderData,
    db,
    isSubmitting,
    sendingToSheet,
    orderId,
    onToggleTenderStatus,
    onSetItemToShip,
    onSetItemToDelete,
    onDuplicateItem,
    onAcceptQuote,
    onRevertQuote,
    onDeleteQuote,
    onSendToSheet,
    getRegionName,
    getWarehouseName,
    getVehicleTypeName,
    getItemStatusBadgeVariant
}: ShipmentItemProps) {
    const acceptedQuote = quotes.find(q => q.id === item.acceptedQuoteId);

    return (
        <AccordionItem value={`item-${index}`} key={item.id}>
            <div className="flex items-center gap-4 w-full pr-4 border-b">
                <AccordionTrigger className="flex-1 py-4 pr-0 border-b-0 text-left">
                    <div className="flex justify-between items-start w-full gap-4">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-base">Тээвэрлэлт #{index + 1}</p>
                                {acceptedQuote && (
                                    <Badge variant="outline" className="ml-2">
                                        <User className="w-3 h-3 mr-1" />
                                        {acceptedQuote.driverName}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                    <span>{getRegionName(item.startRegionId)} ({getWarehouseName(item.startWarehouseId)}) &rarr; {getRegionName(item.endRegionId)} ({getWarehouseName(item.endWarehouseId)})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                    <span>{format(new Date(item.loadingStartDate), "MM/dd")} - {format(new Date(item.unloadingEndDate), "MM/dd")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 flex-shrink-0" />
                                    <span>{getVehicleTypeName(item.vehicleTypeId)}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Package className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                                        {(item.cargoItems || []).map((cargo, idx) => (
                                            <span key={idx} className="text-xs bg-muted px-1.5 py-0.5 rounded">{cargo.name} ({cargo.quantity} {cargo.unit})</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                {item.finalPrice != null && (
                                    <p className="font-semibold text-primary">{Math.round(item.finalPrice).toLocaleString()}₮</p>
                                )}

                                <Badge variant={getItemStatusBadgeVariant(item.status)}>{item.status}</Badge>
                            </div>
                            <Badge variant={item.tenderStatus === 'Open' ? 'success' : 'secondary'}>{item.tenderStatus === 'Open' ? 'Нээлттэй' : 'Хаалттай'}</Badge>
                        </div>
                    </div>
                </AccordionTrigger>
            </div>
            <AccordionContent className="space-y-4">
                <div className="px-4 py-2 border-b">
                    <StatusTracker status={item.status} />
                </div>
                <div className="flex items-center justify-end gap-2 px-4 pb-4 border-b">
                    <Button variant="outline" size="sm" onClick={() => onToggleTenderStatus(item)}>
                        {item.tenderStatus === 'Open' ? <MegaphoneOff className="mr-2 h-4 w-4" /> : <Megaphone className="mr-2 h-4 w-4" />}
                        {item.tenderStatus === 'Open' ? 'Тендер хаах' : 'Тендер нээх'}
                    </Button>
                    {shipment ? (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/shipments/${shipment.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Тээвэрлэлт рүү
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="default" size="sm" onClick={() => onSetItemToShip(item)} disabled={!item.acceptedQuoteId || item.status === 'Shipped'}>
                            <Truck className="mr-2 h-4 w-4" />
                            Тээвэр үүсгэх
                        </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/orders/${orderId}/items/${item.id}/edit`}>
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
                <div className="px-4 space-y-4">
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
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
