
'use client';

import * as React from 'react';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer, SystemUser } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Users, Building, CalendarPlus } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ElementType;
    isLoading: boolean;
};

function StatCard({ title, value, icon: Icon, isLoading }: StatCardProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/2" />
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
            </CardContent>
        </Card>
    );
}

export default function CustomersDashboardPage() {
    const [stats, setStats] = React.useState({
        total: 0,
        newThisMonth: 0,
    });
    const [industryChartData, setIndustryChartData] = React.useState<any[]>([]);
    const [managerChartData, setManagerChartData] = React.useState<any[]>([]);
    const [recentCustomers, setRecentCustomers] = React.useState<Customer[]>([]);
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
                const customersSnap = await getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc")));
                const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as Customer));
                
                // Calculate stats
                const now = new Date();
                const startOfThisMonth = startOfMonth(now);
                const endOfThisMonth = endOfMonth(now);

                const newThisMonth = customersData.filter(c => 
                    c.createdAt >= startOfThisMonth && c.createdAt <= endOfThisMonth
                ).length;

                setStats({
                    total: customersData.length,
                    newThisMonth: newThisMonth,
                });
                
                // Prepare data for industry chart
                const industryCounts = customersData.reduce((acc, customer) => {
                    const industry = customer.industry || 'Тодорхойгүй';
                    acc[industry] = (acc[industry] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                setIndustryChartData(Object.entries(industryCounts).map(([name, count]) => ({ name, тоо: count })));

                // Prepare data for manager chart
                const managerCounts = customersData.reduce((acc, customer) => {
                    const managerName = customer.assignedTo?.name || 'Оноогоогүй';
                    acc[managerName] = (acc[managerName] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                setManagerChartData(Object.entries(managerCounts).map(([name, count]) => ({ name, тоо: count })));
                
                setRecentCustomers(customersData.slice(0, 5));

            } catch (error) {
                console.error("Error fetching customers dashboard data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Хянах самбарын мэдээлэл татахад алдаа гарлаа.'
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchDashboardData();
    }, [toast]);

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                 <Button variant="outline" size="sm" asChild className="mb-4">
                     <Link href="/management">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Удирдлагын самбар
                     </Link>
                </Button>
                <h1 className="text-3xl font-headline font-bold">Харилцагчийн хянах самбар</h1>
                <p className="text-muted-foreground">
                    Системийн харилцагчийн баазын нэгдсэн мэдээлэл.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Нийт харилцагч" value={stats.total} icon={Users} isLoading={isLoading}/>
                <StatCard title="Энэ сард нэмэгдсэн" value={stats.newThisMonth} icon={CalendarPlus} isLoading={isLoading}/>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Үйл ажиллагааны чиглэлээр</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : (
                         <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={industryChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}/>
                                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                       )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Хариуцсан менежерээр</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : (
                         <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={managerChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}/>
                                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                       )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Сүүлд нэмэгдсэн</CardTitle>
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
                                    <TableHead>Нэр</TableHead>
                                    <TableHead>Бүртгэсэн</TableHead>
                                    <TableHead>Огноо</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentCustomers.map(customer => (
                                    <TableRow key={customer.id}>
                                        <TableCell>
                                            <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                                                {customer.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{customer.createdBy.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{customer.createdAt.toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
