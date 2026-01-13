import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Truck, CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";

interface OrderStatsProps {
    totalOrders: number;
    pendingOrders: number;
    activeOrders: number;
    completedOrders: number;
}

export function OrderStats({ totalOrders, pendingOrders, activeOrders, completedOrders }: OrderStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Нийт захиалга</CardTitle>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalOrders}</div>
                    <p className="text-xs text-muted-foreground">Системд бүртгэгдсэн бүх захиалга</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Хүлээгдэж буй</CardTitle>
                    <CircleDashed className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingOrders}</div>
                    <p className="text-xs text-muted-foreground">Тээвэрлэлт хуваарилагдаагүй</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Идэвхтэй</CardTitle>
                    <Truck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeOrders}</div>
                    <p className="text-xs text-muted-foreground">Замд яваа болон ачиж буй</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Дууссан</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedOrders}</div>
                    <p className="text-xs text-muted-foreground">Амжилттай хүргэгдсэн</p>
                </CardContent>
            </Card>
        </div>
    );
}
