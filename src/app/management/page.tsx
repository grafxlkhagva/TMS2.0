

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, CheckCircle, DollarSign, Truck, Users, Warehouse, Car, Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SystemUser, Order, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
    isLoading: boolean;
    href?: string;
};

type ManagerStats = {
    user: SystemUser;
    totalOrders: number;
    completedOrders: number;
    inTransitShipments: number;
    totalValue: number;
}

type SystemStats = {
    totalVehicles: number;
    totalDrivers: number;
    totalCustomers: number;
    totalWarehouses: number;
}

function StatCard({ title, value, icon: Icon, description, isLoading, href }: StatCardProps) {
    const cardContent = (
      <Card className={cn(href && "hover:border-primary transition-colors")}>
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

    if (href) {
        return <Link href={href}>{cardContent}</Link>;
    }

    return cardContent;
}

export default function ManagementDashboardPage() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [managerStats, setManagerStats] = React.useState<ManagerStats[]>([]);
    const [systemStats, setSystemStats] = React.useState<SystemStats>({
        totalVehicles: 0,
        totalDrivers: 0,
        totalCustomers: 0,
        totalWarehouses: 0,
    });
    const { toast } = useToast();

    React.useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [
                    managersSnap, 
                    ordersSnap, 
                    shipmentsSnap, 
                    itemsSnap,
                    vehiclesSnap,
                    driversSnap,
                    customersSnap,
                    warehousesSnap
                ] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('role', '==', 'transport_manager'))),
                    getDocs(collection(db, 'orders')),
                    getDocs(collection(db, 'shipments')),
                    getDocs(query(collection(db, 'order_items'), where('status', 'in', ['Shipped', 'Delivered']))),
                    getDocs(collection(db, 'vehicles')),
                    getDocs(collection(db, 'Drivers')),
                    getDocs(collection(db, 'customers')),
                    getDocs(collection(db, 'warehouses')),
                ]);

                // Calculate System-wide Stats
                setSystemStats({
                    totalVehicles: vehiclesSnap.size,
                    totalDrivers: driversSnap.size,
                    totalCustomers: customersSnap.size,
                    totalWarehouses: warehousesSnap.size,
                });

                // Calculate Manager-specific Stats
                const managers = managersSnap.docs.map(doc => doc.data() as SystemUser);
                const allOrders = ordersSnap.docs.map(doc => ({id: doc.id, ...doc.data()} as Order));
                const allShipments = shipmentsSnap.docs.map(doc => doc.data() as Shipment);
                const allOrderItems = itemsSnap.docs.map(doc => doc.data() as OrderItem);

                const stats: ManagerStats[] = managers.map(manager => {
                    const managerOrders = allOrders.filter(o => o.transportManagerId === manager.uid);
                    const managerOrderIds = managerOrders.map(o => o.id);
                    
                    const managerShipments = allShipments.filter(s => managerOrderIds.includes(s.orderId));
                    const inTransitShipments = managerShipments.filter(s => s.status === 'In Transit').length;

                    const totalValue = allOrderItems
                        .filter(item => managerOrderIds.includes(item.orderId))
                        .reduce((sum, item) => sum + (item.finalPrice || 0), 0);

                    return {
                        user: manager,
                        totalOrders: managerOrders.length,
                        completedOrders: managerOrders.filter(o => o.status === 'Completed').length,
                        inTransitShipments,
                        totalValue,
                    }
                });

                setManagerStats(stats);
            } catch (error) {
                console.error("Error fetching management data:", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Удирдлагын мэдээлэл татахад алдаа гарлаа.'});
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [toast]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-bold">Удирдлагын хянах самбар</h1>
                <p className="text-muted-foreground">
                    Компанийн үйл ажиллагааны нэгдсэн статистик мэдээлэл.
                </p>
            </div>
            
            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">Системийн нэгдсэн бүртгэл</h2>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Нийт тээврийн хэрэгсэл"
                        value={systemStats.totalVehicles}
                        icon={Car}
                        isLoading={isLoading}
                        href="/vehicles/dashboard"
                    />
                    <StatCard
                        title="Нийт жолооч"
                        value={systemStats.totalDrivers}
                        icon={Users}
                        isLoading={isLoading}
                    />
                    <StatCard
                        title="Нийт харилцагч"
                        value={systemStats.totalCustomers}
                        icon={Building}
                        isLoading={isLoading}
                    />
                    <StatCard
                        title="Нийт агуулах"
                        value={systemStats.totalWarehouses}
                        icon={Warehouse}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Менежерүүдийн гүйцэтгэл</CardTitle>
                    <CardDescription>Тээврийн менежерүүдийн захиалга, тээвэрлэлтийн гүйцэтгэл.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                           {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Менежер</TableHead>
                                    <TableHead>Нийт захиалга</TableHead>
                                    <TableHead>Амжилттай</TableHead>
                                    <TableHead>Замд яваа</TableHead>
                                    <TableHead className="text-right">Нийт борлуулалт</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {managerStats.length > 0 ? managerStats.map(stat => (
                                    <TableRow key={stat.user.uid}>
                                        <TableCell>
                                            <Link href={`/management/managers/${stat.user.uid}`} className="flex items-center gap-3 hover:underline">
                                                <Avatar>
                                                    <AvatarImage src={stat.user.avatarUrl} />
                                                    <AvatarFallback>{stat.user.lastName?.charAt(0)}{stat.user.firstName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{stat.user.lastName} {stat.user.firstName}</p>
                                                    <p className="text-xs text-muted-foreground">{stat.user.email}</p>
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell>{stat.totalOrders}</TableCell>
                                        <TableCell>{stat.completedOrders}</TableCell>
                                        <TableCell>{stat.inTransitShipments}</TableCell>
                                        <TableCell className="text-right font-mono">{stat.totalValue.toLocaleString()}₮</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Гүйцэтгэлийн мэдээлэл олдсонгүй.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            
        </div>
    );
}
