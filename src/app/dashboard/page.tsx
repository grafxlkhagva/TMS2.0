
'use client';

import * as React from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KpiCard, KpiGrid, LoadingState, PageContainer, PageHeader } from '@/components/patterns';

export default function DashboardPage() {
    const [stats, setStats] = React.useState({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
    });
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [recentOrders, setRecentOrders] = React.useState<Order[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        async function fetchDashboardData() {
            setIsLoading(true);
             if (!db) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Firebase-тэй холбогдож чадсангүй. Тохиргоогоо шалгана уу.',
                });
                setIsLoading(false);
                return;
            }
            try {
                // Fetch all orders for stats and charts
                const ordersQuery = query(collection(db, "orders"));
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersData = ordersSnapshot.docs.map(doc => doc.data() as Order);

                // Calculate stats
                const totalOrders = ordersData.length;
                const completedOrders = ordersData.filter(o => o.status === 'Completed').length;
                const pendingOrders = ordersData.filter(o => o.status === 'Pending').length;
                
                // Prepare data for status chart
                const statusCounts = ordersData.reduce((acc, order) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const formattedChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, Захиалга: value }));
                setChartData(formattedChartData);

                // Fetch recent orders
                const recentOrdersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(5));
                const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
                const recentOrdersData = recentOrdersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, ...data, createdAt: data.createdAt.toDate() } as Order;
                });
                setRecentOrders(recentOrdersData);

                 // Fetch all order items with finalPrice to calculate revenue
                const itemsQuery = query(collection(db, "order_items"), where("finalPrice", ">", 0));
                const itemsSnapshot = await getDocs(itemsQuery);
                const totalRevenue = itemsSnapshot.docs.reduce((acc, doc) => {
                    const item = doc.data() as OrderItem;
                    return acc + (item.finalPrice || 0);
                }, 0);

                setStats({ totalOrders, completedOrders, pendingOrders, totalRevenue });

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
    }, [toast]);

    return (
        <PageContainer>
            <PageHeader
                title="Удирдах самбар"
                description="Системийн ерөнхий статистик мэдээлэл."
            />

            <KpiGrid>
                <KpiCard
                    title="Нийт захиалга"
                    value={stats.totalOrders}
                    icon={Briefcase}
                    description="Системд бүртгэгдсэн нийт захиалгын тоо"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Амжилттай"
                    value={stats.completedOrders}
                    icon={CheckCircle}
                    description="Амжилттай дууссан захиалгын тоо"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Хүлээгдэж буй"
                    value={stats.pendingOrders}
                    icon={Clock}
                    description="Шинээр орж ирсэн, хүлээгдэж буй захиалга"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Нийт орлого"
                    value={`${stats.totalRevenue.toLocaleString()}₮`}
                    icon={DollarSign}
                    description="Батлагдсан нийт тээвэрлэлтийн орлого"
                    isLoading={isLoading}
                />
            </KpiGrid>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Захиалгын статусын хуваарилалт</CardTitle>
                        <CardDescription>Захиалгын төлөв байдлын ерөнхий харагдац.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? (
                           <LoadingState variant="chart" />
                       ) : (
                         <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                                    <Tooltip
                                        contentStyle={{
                                            background: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "var(--radius)"
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Захиалга" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                       )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Сүүлийн захиалгууд</CardTitle>
                         <CardDescription>Хамгийн сүүлд бүртгэгдсэн 5 захиалга.</CardDescription>
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
                                        <TableHead>Захиалагч</TableHead>
                                        <TableHead>Статус</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                                                    {order.customerName}
                                                </Link>
                                                <div className="text-xs text-muted-foreground font-mono">{order.orderNumber}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge>{order.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
