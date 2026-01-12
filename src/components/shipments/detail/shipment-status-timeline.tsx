
'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ShipmentStatusType } from '@/types';

const shipmentStatuses: ShipmentStatusType[] = ['Preparing', 'Ready For Loading', 'Loading', 'In Transit', 'Unloading', 'Delivered'];

interface ShipmentStatusTimelineProps {
    currentStatus: ShipmentStatusType;
    statusTranslations: Record<ShipmentStatusType, string>;
    onStatusClick: (newStatus: ShipmentStatusType) => void;
}

export function ShipmentStatusTimeline({ currentStatus, statusTranslations, onStatusClick }: ShipmentStatusTimelineProps) {
    const currentIndex = shipmentStatuses.indexOf(currentStatus);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Тээврийн явц</CardTitle>
                <CardDescription>Статус дээр дарж явцыг урагшлуулах эсвэл буцаах боломжтой.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-start px-4 pt-2">
                    {shipmentStatuses.map((status, index) => (
                        <React.Fragment key={status}>
                            <div
                                className={cn("flex flex-col items-center cursor-pointer group")}
                                onClick={() => {
                                    if (index !== currentIndex) {
                                        onStatusClick(status);
                                    }
                                }}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                                    index <= currentIndex ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border group-hover:border-primary"
                                )}>
                                    {index < currentIndex ? <Check className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                                </div>
                                <p className={cn(
                                    "text-xs mt-2 text-center w-20 transition-colors",
                                    index <= currentIndex ? "font-semibold text-primary" : "text-muted-foreground group-hover:text-primary"
                                )}>
                                    {statusTranslations[status]}
                                </p>
                            </div>
                            {index < shipmentStatuses.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-1 mt-4 transition-colors",
                                    index < currentIndex ? "bg-primary" : "bg-border",
                                    index === currentIndex && "bg-gradient-to-r from-primary to-border",
                                )}></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
