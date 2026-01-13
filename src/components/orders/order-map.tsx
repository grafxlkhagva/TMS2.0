
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order, OrderItem, Warehouse } from "@/types";
import { MapPin, AlertCircle } from "lucide-react";
import { GoogleMap, useLoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderMapProps {
    order: Order;
    orderItems: OrderItem[];
    warehouses: Warehouse[];
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '350px',
    borderRadius: '0.5rem'
};

const defaultCenter = {
    lat: 47.9188,
    lng: 106.9176 // Ulaanbaatar center
};

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

export function OrderMap({ order, orderItems, warehouses }: OrderMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const [map, setMap] = React.useState<google.maps.Map | null>(null);
    const [selectedMarker, setSelectedMarker] = React.useState<Warehouse | null>(null);

    // Calculate markers and lines based on orderItems and warehouses
    const mapData = React.useMemo(() => {
        if (!isLoaded) return null;
        const uniqueWarehouseIds = new Set<string>();
        const markers: Warehouse[] = [];
        const lines: { path: google.maps.LatLngLiteral[], color?: string }[] = [];
        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        if (!warehouses || warehouses.length === 0) {
            return { markers: [], lines: [], bounds: null };
        }

        // Helper to calculate Quadratic Bezier Curve points
        const getCurvePoints = (start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral) => {
            const curvature = 0.2; // Adjust for more/less curve
            const points: google.maps.LatLngLiteral[] = [];

            // Calculate a control point
            // This is a simple approximation. For true geographical perpendicularity, we'd use spherical geometry.
            // But for visual flair on standard maps, offsetting perpendicular to the delta vector works.

            const latDiff = end.lat - start.lat;
            const lngDiff = end.lng - start.lng;

            // Midpoint
            const midLat = (start.lat + end.lat) / 2;
            const midLng = (start.lng + end.lng) / 2;

            // Perpendicular Vector (-dy, dx) or (dy, -dx)
            // Offset the midpoint by a fraction of the distance perpendicular to the path
            const controlLat = midLat - curvature * lngDiff;
            const controlLng = midLng + curvature * latDiff;

            for (let t = 0; t <= 1; t += 0.01) {
                const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlLat + t * t * end.lat;
                const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlLng + t * t * end.lng;
                points.push({ lat, lng });
            }
            return points;
        };

        orderItems.forEach(item => {
            const startWh = warehouses.find(w => w.id === item.startWarehouseId);
            const endWh = warehouses.find(w => w.id === item.endWarehouseId);

            if (startWh && startWh.geolocation && startWh.geolocation.lat) {
                if (!uniqueWarehouseIds.has(startWh.id)) {
                    uniqueWarehouseIds.add(startWh.id);
                    markers.push(startWh);
                    bounds.extend({ lat: startWh.geolocation.lat, lng: startWh.geolocation.lng });
                    hasPoints = true;
                }
            }

            if (endWh && endWh.geolocation && endWh.geolocation.lat) {
                if (!uniqueWarehouseIds.has(endWh.id)) {
                    uniqueWarehouseIds.add(endWh.id);
                    markers.push(endWh);
                    bounds.extend({ lat: endWh.geolocation.lat, lng: endWh.geolocation.lng });
                    hasPoints = true;
                }
            }

            if (startWh?.geolocation?.lat && endWh?.geolocation?.lat) {
                const start = { lat: startWh.geolocation.lat, lng: startWh.geolocation.lng };
                const end = { lat: endWh.geolocation.lat, lng: endWh.geolocation.lng };
                const curvedPath = getCurvePoints(start, end);

                lines.push({
                    path: curvedPath,
                    // Simple color cycling or status based color could be added here
                    color: item.status === 'Delivered' ? '#10b981' : '#3b82f6'
                });
            }
        });

        return { markers, lines, bounds: hasPoints ? bounds : null };
    }, [isLoaded, orderItems, warehouses]);

    const { markers, lines, bounds } = mapData || { markers: [], lines: [], bounds: null };

    const onLoad = React.useCallback(function callback(map: google.maps.Map) {
        if (bounds) {
            map.fitBounds(bounds);
        } else {
            map.setCenter(defaultCenter);
            map.setZoom(12);
        }
        setMap(map);
    }, [bounds]);

    React.useEffect(() => {
        if (map && bounds) {
            map.fitBounds(bounds);
        }
    }, [map, bounds]);

    if (loadError) {
        return (
            <Card className="h-full min-h-[400px]">
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Маршрутын тойм
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center bg-muted/20 text-muted-foreground">
                    <div className="text-center space-y-2">
                        <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
                        <p>Газрын зураг ачааллахад алдаа гарлаа.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!isLoaded) {
        return (
            <Card className="h-full min-h-[400px]">
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Маршрутын тойм
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] p-0">
                    <Skeleton className="w-full h-full rounded-b-lg" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full min-h-[400px] flex flex-col">
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Маршрутын тойм
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative min-h-[350px]">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={defaultCenter}
                    zoom={12}
                    onLoad={onLoad}
                    options={{
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: true,
                    }}
                >
                    {markers.map(wh => (
                        <Marker
                            key={wh.id}
                            position={{ lat: wh.geolocation.lat, lng: wh.geolocation.lng }}
                            onClick={() => setSelectedMarker(wh)}
                        />
                    ))}

                    {lines.map((line, idx) => (
                        <Polyline
                            key={idx}
                            path={line.path}
                            options={{
                                strokeColor: line.color,
                                strokeOpacity: 0.8,
                                strokeWeight: 4,
                                geodesic: true, // Smoother rendering
                                icons: [{
                                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                                    offset: '100%'
                                }]
                            }}
                        />
                    ))}

                    {selectedMarker && (
                        <InfoWindow
                            position={{ lat: selectedMarker.geolocation.lat, lng: selectedMarker.geolocation.lng }}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <div className="p-2 min-w-[150px]">
                                <h3 className="font-semibold text-sm">{selectedMarker.name}</h3>
                                <p className="text-xs text-muted-foreground">{selectedMarker.location}</p>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </CardContent>
        </Card>
    );
}
