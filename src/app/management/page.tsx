
'use client';

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, CheckCircle, Clock, DollarSign, Truck, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

    React.useEffect(() => {
        // Simulate data loading
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

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
