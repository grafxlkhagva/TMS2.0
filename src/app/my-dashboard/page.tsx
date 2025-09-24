
'use client';

import * as React from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, CheckCircle, Clock, DollarSign, Truck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description: string;
    isLoading: boolean;
};

function StatCard({ title, value, icon: Icon, description, isLoading }: StatCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-1" />
                </CardContent>
            </Card>
        )
    }
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

export default function MyDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = React.useState({
        totalShipmentValue: 0,
        activeOrders: 0,
        inTransitShipments: 0,
    });
    const [activeShipments, setActiveShipments] = React.useState<Shipment[]>([]);
    const [pendingOrders, setPendingOrders] = React.useState<Order[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        async function fetchDashboardData() {
            if (!user) return;
            setIsLoading(true);

            try {
                const ordersQuery = query(collection(db, "orders"), where("transportManagerId", "==", user.uid));
                const shipmentsQuery = query(collection(db, "shipments"), where("driverInfo.phone", "in", (await getDocs(query(collection(db, "Drivers"), where("authUid", "==", user.uid)))).docs.map(d => d.data().phone_number))));

                const [ordersSnapshot, shipmentsSnapshot] = await Promise.all([
                    getDocs(ordersQuery),
                    getDocs(shipmentsQuery)
                ]);

                const managerOrders = ordersSnapshot.docs.map(doc => doc.data() as Order);
                const managerShipments = shipmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shipment));
                
                const activeOrdersCount = managerOrders.filter(o => o.status === 'Pending' || o.status === 'Processing').length;
                const inTransitShipments = managerShipments.filter(s => s.status === 'In Transit');
                
                const activeShipmentItemsQuery = query(collection(db, 'order_items'), where('orderId', 'in', managerOrders.map(o => o.id)));
                const orderItemsSnapshot = await getDocs(activeShipmentItemsQuery);
                const totalValue = orderItemsSnapshot.docs.reduce((acc, doc) => {
                    const item = doc.data() as OrderItem;
                    if (item.status === 'Shipped' || item.status === 'Delivered') {
                        return acc + (item.finalPrice || 0);
                    }
                    return acc;
                }, 0);


                setStats({
                    totalShipmentValue: totalValue,
                    activeOrders: activeOrdersCount,
                    inTransitShipments: inTransitShipments.length,
                });
                
                setActiveShipments(inTransitShipments);
                setPendingOrders(managerOrders.filter(o => o.status === 'Pending'));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Удирдах самбарын мэдээлэл татахад алдаа гарлаа.'
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchDashboardData();
    }, [user, toast]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-bold">Миний самбар</h1>
                <p className="text-muted-foreground">
                    Танд хамаарах захиалга, тээвэрлэлтийн нэгдсэн мэдээлэл.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Нийт тээвэрлэлтийн дүн"
                    value={`${stats.totalShipmentValue.toLocaleString()}₮`}
                    icon={DollarSign}
                    description="Таны хариуцсан баталгаажсан тээврийн дүн"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Идэвхтэй захиалга"
                    value={stats.activeOrders}
                    icon={Briefcase}
                    description="Танд оноогдсон шинэ захиалгын тоо"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Замд яваа тээвэр"
                    value={stats.inTransitShipments}
                    icon={Truck}
                    description="Одоогоор тээвэрлэлт хийгдэж буй"
                    isLoading={isLoading}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Идэвхтэй тээвэрлэлтүүд</CardTitle>
                         <CardDescription>Одоогоор замд яваа таны тээвэрлэлтүүд.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Тээврийн №</TableHead>
                                        <TableHead>Чиглэл</TableHead>
                                        <TableHead>Жолооч</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeShipments.length > 0 ? activeShipments.map(shipment => (
                                        <TableRow key={shipment.id}>
                                            <TableCell>
                                                <Link href={`/shipments/${shipment.id}`} className="font-medium hover:underline font-mono">
                                                    {shipment.shipmentNumber}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {shipment.route.startRegion} &rarr; {shipment.route.endRegion}
                                            </TableCell>
                                            <TableCell>{shipment.driverInfo.name}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">Идэвхтэй тээвэрлэлт алга.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Хүлээгдэж буй захиалгууд</CardTitle>
                         <CardDescription>Танд шинээр оноогдсон захиалгууд.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Захиалгын №</TableHead>
                                        <TableHead>Харилцагч</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingOrders.length > 0 ? pendingOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <Link href={`/orders/${order.id}`} className="font-medium hover:underline font-mono">
                                                    {order.orderNumber}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {order.customerName}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">Хүлээгдэж буй захиалга алга.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
