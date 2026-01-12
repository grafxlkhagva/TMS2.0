
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderItem } from '@/types';

interface ShipmentFinancialsProps {
    orderItem: OrderItem | null;
    driverPrice: number;
}

export function ShipmentFinancials({ orderItem, driverPrice }: ShipmentFinancialsProps) {
    if (!orderItem) return null;

    const revenue = orderItem.finalPrice || 0;
    const cost = driverPrice || 0;
    const margin = revenue - cost;
    const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;
    const isProfitable = margin > 0;

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Санхүүгийн мэдээлэл (Margin)
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Нийт орлого</p>
                        <p className="text-lg font-bold">₮{revenue.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Тээврийн зардал</p>
                        <p className="text-lg font-bold text-orange-600">₮{cost.toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Цэвэр ашиг</p>
                        <div className="flex items-center gap-2">
                            <p className={cn("text-2xl font-black", isProfitable ? "text-green-600" : "text-destructive")}>
                                ₮{margin.toLocaleString()}
                            </p>
                            {isProfitable ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge variant={isProfitable ? "success" : "destructive"} className="px-3 py-1 text-sm font-bold">
                            {marginPercentage.toFixed(1)}%
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { Badge } from '@/components/ui/badge';
