
'use client';

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, CheckCircle, DollarSign, Truck, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SystemUser, Order, Shipment, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description: string;
    isLoading: boolean;
};

type ManagerStats = {
    user: SystemUser;
    totalOrders: number;
    completedOrders: number;
    inTransitShipments: number;
    totalValue: number;
}

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

// Dummy data - replace with real data fetching
const chartData = [
  { name: '1 сар', Revenue: 4000, Shipments: 24 },
  { name: '2 сар', Revenue: 3000, Shipments: 13 },
  { name: '3 сар', Revenue: 5000, Shipments: 98 },
  { name: '4 сар', Revenue: 2780, Shipments: 39 },
  { name: '5 сар', Revenue: 1890, Shipments: 48 },
  { name: '6 сар', Revenue: 2390, Shipments: 38 },
];

export default function ManagementDashboardPage() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [managerStats, setManagerStats] = React.useState<ManagerStats[]>([]);
    const { toast } = useToast();

    React.useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [managersSnap, ordersSnap, shipmentsSnap, itemsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('role', '==', 'transport_manager'))),
                    getDocs(collection(db, 'orders')),
                    getDocs(collection(db, 'shipments')),
                    getDocs(query(collection(db, 'order_items'), where('status', 'in', ['Shipped', 'Delivered']))),
                ]);

                const managers = managersSnap.docs.map(doc => doc.data() as SystemUser);
                const allOrders = ordersSnap.docs.map(doc => doc.data() as Order);
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Нийт орлого"
                    value="₮12,450,000"
                    icon={DollarSign}
                    description="Энэ сарын нийт орлогын дүн"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Идэвхтэй тээвэрлэлт"
                    value="125"
                    icon={Truck}
                    description="Одоогоор замд яваа тээврийн тоо"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Нийт харилцагч"
                    value="89"
                    icon={Users}
                    description="Системд бүртгэлтэй нийт харилцагч"
                    isLoading={isLoading}
                />
                 <StatCard
                    title="Ашигт ажиллагаа"
                    value="14.5%"
                    icon={Briefcase}
                    description="Дундаж ашгийн хувь"
                    isLoading={isLoading}
                />
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
            
            <Card>
                <CardHeader>
                    <CardTitle>Сар тутмын орлого ба тээвэрлэлт</CardTitle>
                    <CardDescription>Сүүлийн 6 сарын гүйцэтгэлийн харьцуулалт.</CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoading ? (
                       <Skeleton className="h-[350px] w-full" />
                   ) : (
                     <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₮${Number(value)/1000}K`}/>
                                <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)"
                                    }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="Revenue" name="Орлого" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="Shipments" name="Тээвэрлэлт" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}
