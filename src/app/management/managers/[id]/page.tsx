
'use client';

import * as React from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, Shipment, OrderItem, SystemUser } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, CheckCircle, DollarSign, Truck, ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
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
                    {description && <Skeleton className="h-4 w-3/4 mt-1" />}
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
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}

export default function ManagerDetailPage() {
    const { id: managerId } = useParams<{ id: string }>();
    const router = useRouter();
    const [manager, setManager] = React.useState<SystemUser | null>(null);
    const [stats, setStats] = React.useState({
        totalRevenue: 0,
        totalOrders: 0,
        inTransitShipments: 0,
    });
    const [activeShipments, setActiveShipments] = React.useState<Shipment[]>([]);
    const [recentOrders, setRecentOrders] = React.useState<Order[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!managerId) return;

        async function fetchManagerData() {
            setIsLoading(true);
            try {
                // Fetch manager details
                const managerDoc = await getDoc(doc(db, 'users', managerId));
                if (!managerDoc.exists()) {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Менежер олдсонгүй.' });
                    router.push('/management');
                    return;
                }
                setManager(managerDoc.data() as SystemUser);

                // Fetch related data
                const ordersQuery = query(collection(db, "orders"), where("transportManagerId", "==", managerId));
                const ordersSnapshot = await getDocs(ordersQuery);
                const managerOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                const orderIds = managerOrders.map(o => o.id);

                let totalRevenue = 0;
                let managerShipments: Shipment[] = [];

                if (orderIds.length > 0) {
                     const itemsQuery = query(collection(db, "order_items"), where('orderId', 'in', orderIds), where('status', 'in', ['Shipped', 'Delivered']));
                     const itemsSnapshot = await getDocs(itemsQuery);
                     totalRevenue = itemsSnapshot.docs.reduce((sum, itemDoc) => sum + (itemDoc.data().finalPrice || 0), 0);

                     const shipmentsQuery = query(collection(db, 'shipments'), where('orderId', 'in', orderIds));
                     const shipmentsSnapshot = await getDocs(shipmentsQuery);
                     managerShipments = shipmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shipment));
                }

                setStats({
                    totalRevenue,
                    totalOrders: managerOrders.length,
                    inTransitShipments: managerShipments.filter(s => s.status === 'In Transit').length
                });

                setRecentOrders(managerOrders.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()).slice(0, 5));
                setActiveShipments(managerShipments.filter(s => s.status === 'In Transit'));

            } catch (error) {
                console.error("Error fetching manager data:", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Менежерийн мэдээлэл татахад алдаа гарлаа.'});
            } finally {
                setIsLoading(false);
            }
        }
        fetchManagerData();
    }, [managerId, toast, router]);

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-1/4 mb-4"/>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div>
                        <Skeleton className="h-7 w-32 mb-2"/>
                        <Skeleton className="h-4 w-48"/>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28 w-full"/>
                    <Skeleton className="h-28 w-full"/>
                    <Skeleton className="h-28 w-full"/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 w-full"/>
                    <Skeleton className="h-64 w-full"/>
                </div>
            </div>
        )
    }

    if (!manager) return null;

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link href="/management">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Буцах
                     </Link>
                </Button>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={manager.avatarUrl} />
                        <AvatarFallback>{manager.lastName?.charAt(0)}{manager.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold">{manager.lastName} {manager.firstName}</h1>
                        <p className="text-muted-foreground">{manager.email}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Нийт борлуулалт"
                    value={`${stats.totalRevenue.toLocaleString()}₮`}
                    icon={DollarSign}
                    isLoading={isLoading}
                />
                <StatCard
                    title="Нийт захиалга"
                    value={stats.totalOrders}
                    icon={Briefcase}
                    isLoading={isLoading}
                />
                <StatCard
                    title="Замд яваа тээвэр"
                    value={stats.inTransitShipments}
                    icon={Truck}
                    isLoading={isLoading}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Сүүлийн захиалгууд</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Захиалгын №</TableHead>
                                    <TableHead>Харилцагч</TableHead>
                                    <TableHead>Статус</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentOrders.length > 0 ? recentOrders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Link href={`/orders/${order.id}`} className="font-medium hover:underline font-mono">
                                                {order.orderNumber}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell><Badge>{order.status}</Badge></TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">Захиалга олдсонгүй.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Идэвхтэй тээвэрлэлтүүд</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
