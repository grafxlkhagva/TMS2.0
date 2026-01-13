
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { OrderItem, Shipment, DriverQuote, DriverWithVehicle } from '@/types';
import { ShipmentItem } from './shipment-item';
import { Firestore } from 'firebase/firestore';

interface ShipmentListProps {
    orderItems: OrderItem[];
    shipments: Map<string, Shipment>;
    quotes: Map<string, DriverQuote[]>;
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

export function ShipmentList({
    orderItems,
    shipments,
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
}: ShipmentListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Тээвэрлэлтийн жагсаалт</CardTitle>
                <CardDescription>Энэ захиалгад хамаарах тээвэрлэлтүүд.</CardDescription>
            </CardHeader>
            <CardContent>
                {orderItems.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {orderItems.map((item, index) => (
                            <ShipmentItem
                                key={item.id}
                                item={item}
                                index={index}
                                shipment={shipments.get(item.id)}
                                quotes={quotes.get(item.id) || []}
                                drivers={drivers}
                                setDrivers={setDrivers}
                                onFetchOrderData={onFetchOrderData}
                                db={db}
                                isSubmitting={isSubmitting}
                                sendingToSheet={sendingToSheet}
                                orderId={orderId}
                                onToggleTenderStatus={onToggleTenderStatus}
                                onSetItemToShip={onSetItemToShip}
                                onSetItemToDelete={onSetItemToDelete}
                                onDuplicateItem={onDuplicateItem}
                                onAcceptQuote={onAcceptQuote}
                                onRevertQuote={onRevertQuote}
                                onDeleteQuote={onDeleteQuote}
                                onSendToSheet={onSendToSheet}
                                getRegionName={getRegionName}
                                getWarehouseName={getWarehouseName}
                                getVehicleTypeName={getVehicleTypeName}
                                getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                            />
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Тээвэрлэлт одоогоор алга.</div>
                )}
            </CardContent>
        </Card>
    );
}
