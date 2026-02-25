
import * as React from 'react';
import { OrderItem, DriverQuote, DriverWithVehicle } from '@/types';
import { ShipmentItem } from './shipment-item';
import { Firestore } from 'firebase/firestore';

interface ShipmentListProps {
    orderItems: OrderItem[];
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
    getItemStatusBadgeVariant
}: ShipmentListProps) {
    if (orderItems.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
                Тээвэрлэлт одоогоор алга.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orderItems.map((item, index) => (
                <ShipmentItem
                    key={item.id}
                    item={item}
                    index={index}
                    quotes={quotes.get(item.id) || []}
                    drivers={drivers}
                    setDrivers={setDrivers}
                    onFetchOrderData={onFetchOrderData}
                    db={db}
                    isSubmitting={isSubmitting}
                    sendingToSheet={sendingToSheet}
                    orderId={orderId}
                    onToggleTenderStatus={onToggleTenderStatus}
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
        </div>
    );
}
