import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Truck, CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";

interface OrderStatsProps {
    totalOrders: number;
    pendingOrders: number;
    activeOrders: number;
    completedOrders: number;
}

export function OrderStats({ totalOrders, pendingOrders, activeOrders, completedOrders }: OrderStatsProps) {
    const safeTotal = Math.max(totalOrders, 1);
    const pendingPercent = Math.round((pendingOrders / safeTotal) * 100);
    const activePercent = Math.round((activeOrders / safeTotal) * 100);
    const completedPercent = Math.round((completedOrders / safeTotal) * 100);

    return (
        <Card className="mb-6 border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">Захиалгын Dashboard</CardTitle>
                        <p className="text-xs text-muted-foreground">Нийт захиалгын төлөвийн нэгтгэсэн харагдац</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Нийт захиалга</p>
                            <p className="text-xl font-bold leading-none">{totalOrders}</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full w-full">
                        <div className="bg-warning/90" style={{ width: `${pendingPercent}%` }} />
                        <div className="bg-primary/90" style={{ width: `${activePercent}%` }} />
                        <div className="bg-success/90" style={{ width: `${completedPercent}%` }} />
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border bg-warning/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">Хүлээгдэж буй</span>
                            <CircleDashed className="h-4 w-4 text-warning" />
                        </div>
                        <p className="text-2xl font-bold leading-none">{pendingOrders}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{pendingPercent}%</p>
                    </div>

                    <div className="rounded-lg border bg-primary/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">Идэвхтэй</span>
                            <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold leading-none">{activeOrders}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{activePercent}%</p>
                    </div>

                    <div className="rounded-lg border bg-success/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">Дууссан</span>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                        </div>
                        <p className="text-2xl font-bold leading-none">{completedOrders}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{completedPercent}%</p>
                    </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-amber-200/50 bg-amber-50/40 px-3 py-2 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <p>Харьцаа нь нийт захиалгад суурилсан бөгөөд статус бүрийн ачааллыг түргэн харуулна.</p>
                </div>
            </CardContent>
        </Card>
    );
}
