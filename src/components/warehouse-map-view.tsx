'use client';

import * as React from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import type { Warehouse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, Eye } from 'lucide-react';
import Link from 'next/link';

const libraries: ('places')[] = ['places'];

interface MapViewProps {
    warehouses: Warehouse[];
    regions: Map<string, string>;
    selectedWarehouse: Warehouse | null;
    onSelectWarehouse: (warehouse: Warehouse | null) => void;
    getStatusBadge: (status: string) => JSX.Element;
    getTypeName: (type: string) => string;
    isLoading: boolean;
}

export function WarehouseMapView({
    warehouses,
    regions,
    selectedWarehouse,
    onSelectWarehouse,
    getStatusBadge,
    getTypeName,
    isLoading,
}: MapViewProps) {
    const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });

    const center = React.useMemo(() => {
        // Center of Mongolia
        return { lat: 46.8625, lng: 103.8467 };
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-0">
                    <Skeleton className="h-[600px] w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    if (!hasApiKey) {
        return (
            <Card>
                <CardContent className="h-[600px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Google Maps API түлхүүр тохируулагдаагүй байна.</p>
                        <p className="text-sm mt-2">Газрын зургийг харуулах боломжгүй.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loadError) {
        return (
            <Card>
                <CardContent className="h-[600px] flex items-center justify-center">
                    <p className="text-destructive">Газрын зураг ачаалахад алдаа гарлаа.</p>
                </CardContent>
            </Card>
        );
    }

    if (!isLoaded) {
        return (
            <Card>
                <CardContent className="p-0">
                    <Skeleton className="h-[600px] w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="h-[600px] w-full relative">
                    <GoogleMap
                        mapContainerClassName="w-full h-full"
                        center={center}
                        zoom={6}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: true,
                            fullscreenControl: true,
                        }}
                    >
                        {warehouses.map((warehouse) => {
                            if (!warehouse.geolocation) return null;

                            return (
                                <Marker
                                    key={warehouse.id}
                                    position={warehouse.geolocation}
                                    onClick={() => onSelectWarehouse(warehouse)}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: 12,
                                        fillColor:
                                            warehouse.status === 'active'
                                                ? '#2563eb'
                                                : warehouse.status === 'full'
                                                    ? '#0c4a6e'
                                                    : warehouse.status === 'maintenance'
                                                        ? '#0ea5e9'
                                                        : '#7dd3fc',
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 3,
                                    }}
                                />
                            );
                        })}

                        {selectedWarehouse && selectedWarehouse.geolocation && (
                            <InfoWindow
                                position={selectedWarehouse.geolocation}
                                onCloseClick={() => onSelectWarehouse(null)}
                            >
                                <div className="p-2 min-w-[250px]">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-base">{selectedWarehouse.name}</h3>
                                        {getStatusBadge(selectedWarehouse.status || 'active')}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {getTypeName(selectedWarehouse.type || 'General')}
                                    </p>
                                    <div className="space-y-1 text-sm mb-3">
                                        <p>
                                            <span className="font-medium">Бүс:</span>{' '}
                                            {regions.get(selectedWarehouse.regionId) || 'Тодорхойгүй'}
                                        </p>
                                        <p>
                                            <span className="font-medium">Хаяг:</span> {selectedWarehouse.location}
                                        </p>
                                        {selectedWarehouse.customerName && (
                                            <p>
                                                <span className="font-medium">Эзэмшигч:</span>{' '}
                                                {selectedWarehouse.customerName}
                                            </p>
                                        )}
                                        {selectedWarehouse.capacity && (
                                            <p>
                                                <span className="font-medium">Багтаамж:</span>{' '}
                                                {selectedWarehouse.capacity.value}{' '}
                                                {selectedWarehouse.capacity.unit === 'sqm'
                                                    ? 'м.кв'
                                                    : selectedWarehouse.capacity.unit === 'pallets'
                                                        ? 'палет'
                                                        : 'тонн'}
                                            </p>
                                        )}
                                    </div>
                                    <Link href={`/warehouses/${selectedWarehouse.id}`}>
                                        <Button size="sm" className="w-full">
                                            <Eye className="mr-2 h-3 w-3" />
                                            Дэлгэрэнгүй
                                        </Button>
                                    </Link>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                </div>
            </CardContent>
        </Card>
    );
}
