
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleMap, Marker } from '@react-google-maps/api';
import type { Warehouse } from '@/types';

const mapContainerStyle = {
    height: '400px',
    width: '100%',
    borderRadius: 'var(--radius)',
};

interface ShipmentMapProps {
    isMapLoaded: boolean;
    loadError: Error | undefined;
    hasApiKey: boolean;
    startWarehouse: Warehouse | null;
    endWarehouse: Warehouse | null;
}

export function ShipmentMap({ isMapLoaded, loadError, hasApiKey, startWarehouse, endWarehouse }: ShipmentMapProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Маршрутын зураглал</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                    {!hasApiKey ? (
                        <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground p-4 text-center">
                            Google Maps API түлхүүр тохируулагдаагүй байна. Газрын зургийг харуулах боломжгүй.
                        </div>
                    ) : loadError ? (
                        <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive-foreground">
                            Газрын зураг ачаалахад алдаа гарлаа.
                        </div>
                    ) : !isMapLoaded ? (
                        <Skeleton className="h-full w-full" />
                    ) : (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={startWarehouse?.geolocation || { lat: 47.91976, lng: 106.91763 }}
                            zoom={5}
                            options={{ streetViewControl: false, mapTypeControl: false }}
                        >
                            {startWarehouse?.geolocation && <Marker position={startWarehouse.geolocation} label="A" />}
                            {endWarehouse?.geolocation && <Marker position={endWarehouse.geolocation} label="B" />}
                        </GoogleMap>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
