
'use client';

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CalendarPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer } from '@/types';
import { startOfMonth, endOfMonth } from 'date-fns';

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

interface CustomerDashboardProps {
    customers: Customer[];
    isLoading: boolean;
}

export function CustomerDashboard({ customers, isLoading }: CustomerDashboardProps) {
    // Calculate stats
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);

    const newThisMonth = customers.filter(c =>
        c.createdAt >= startOfThisMonth && c.createdAt <= endOfThisMonth
    ).length;

    // Prepare data for industry chart
    const industryCounts = customers.reduce((acc, customer) => {
        const industry = customer.industry || 'Тодорхойгүй';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const industryChartData = Object.entries(industryCounts)
        .map(([name, count]) => ({ name, тоо: count }))
        .sort((a, b) => b.тоо - a.тоо)
        .slice(0, 5);

    // Prepare data for manager chart
    const managerCounts = customers.reduce((acc, customer) => {
        const managerName = customer.assignedTo?.name || 'Оноогоогүй';
        acc[managerName] = (acc[managerName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const managerChartData = Object.entries(managerCounts)
        .map(([name, count]) => ({ name, тоо: count }))
        .sort((a, b) => b.тоо - a.тоо)
        .slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Нийт харилцагч" value={customers.length} icon={Users} isLoading={isLoading} />
                <StatCard title="Энэ сард нэмэгдсэн" value={newThisMonth} icon={CalendarPlus} isLoading={isLoading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Үйл ажиллагааны чиглэлээр (Top 5)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (<Skeleton className="h-[200px] w-full" />) : (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={industryChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                                        <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Хариуцсан менежерээр (Top 5)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (<Skeleton className="h-[200px] w-full" />) : (
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={managerChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                                        <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
