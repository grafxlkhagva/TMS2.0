

'use client';

import * as React from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vehicle, VehicleMake, VehicleType, TrailerType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Car, Check, Wrench, Calendar, Truck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

export default function VehiclesDashboardPage() {
    const [stats, setStats] = React.useState({
        total: 0,
        available: 0,
        inUse: 0,
        maintenance: 0,
    });
    const [makeChartData, setMakeChartData] = React.useState<any[]>([]);
    const [typeChartData, setTypeChartData] = React.useState<any[]>([]);
    const [trailerChartData, setTrailerChartData] = React.useState<any[]>([]);
    const [recentVehicles, setRecentVehicles] = React.useState<Vehicle[]>([]);
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
                const [vehiclesSnap, vehicleTypesSnap, trailerTypesSnap] = await Promise.all([
                    getDocs(query(collection(db, "vehicles"), orderBy("createdAt", "desc"))),
                    getDocs(collection(db, "vehicle_types")),
                    getDocs(collection(db, "trailer_types"))
                ]);
                
                const vehiclesData = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
                const vehicleTypesMap = new Map(vehicleTypesSnap.docs.map(doc => [doc.id, doc.data().name]));
                const trailerTypesMap = new Map(trailerTypesSnap.docs.map(doc => [doc.id, doc.data().name]));
                
                // Calculate stats
                setStats({
                    total: vehiclesData.length,
                    available: vehiclesData.filter(v => v.status === 'Available').length,
                    inUse: vehiclesData.filter(v => v.status === 'In Use').length,
                    maintenance: vehiclesData.filter(v => v.status === 'Maintenance').length,
                });
                
                // Prepare data for make chart
                const makeCounts = vehiclesData.reduce((acc, vehicle) => {
                    const make = vehicle.makeName || 'Тодорхойгүй';
                    acc[make] = (acc[make] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                setMakeChartData(Object.entries(makeCounts).map(([name, count]) => ({ name, тоо: count })));

                // Prepare data for vehicle type chart
                const typeCounts = vehiclesData.reduce((acc, vehicle) => {
                    const typeName = vehicleTypesMap.get(vehicle.vehicleTypeId) || 'Тодорхойгүй';
                    acc[typeName] = (acc[typeName] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                setTypeChartData(Object.entries(typeCounts).map(([name, count]) => ({ name, тоо: count })));

                // Prepare data for trailer type chart
                const trailerCounts = vehiclesData.reduce((acc, vehicle) => {
                    const trailerName = trailerTypesMap.get(vehicle.trailerTypeId) || 'Тодорхойгүй';
                    acc[trailerName] = (acc[trailerName] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                setTrailerChartData(Object.entries(trailerCounts).map(([name, count]) => ({ name, тоо: count })));
                
                setRecentVehicles(vehiclesData.slice(0, 5));

            } catch (error) {
                console.error("Error fetching vehicles dashboard data:", error);
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
                <h1 className="text-3xl font-headline font-bold">Тээврийн хэрэгслийн хянах самбар</h1>
                <p className="text-muted-foreground">
                    Системийн тээврийн хэрэгслийн паркийн нэгдсэн мэдээлэл.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Нийт" value={stats.total} icon={Car} isLoading={isLoading}/>
                <StatCard title="Сул" value={stats.available} icon={Check} isLoading={isLoading}/>
                <StatCard title="Ашиглаж буй" value={stats.inUse} icon={Truck} isLoading={isLoading}/>
                <StatCard title="Засварт" value={stats.maintenance} icon={Wrench} isLoading={isLoading}/>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Үйлдвэрлэгчээр</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : (
                         <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={makeChartData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}/>
                                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                       )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Машины төрлөөр</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : (
                         <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={typeChartData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}/>
                                    <Bar dataKey="тоо" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                       )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Тэвшний төрлөөр</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? ( <Skeleton className="h-[250px] w-full" /> ) : (
                         <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trailerChartData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
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
                     <CardDescription>Хамгийн сүүлд бүртгэгдсэн 5 тээврийн хэрэгсэл.</CardDescription>
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
                                    <TableHead>Улсын дугаар</TableHead>
                                    <TableHead>Загвар</TableHead>
                                    <TableHead>Бүртгэсэн</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentVehicles.map(vehicle => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell>
                                            <Link href={`/vehicles/${vehicle.id}`} className="font-medium hover:underline font-mono">
                                                {vehicle.licensePlate}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{vehicle.makeName} {vehicle.modelName}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground"/>
                                                <span>{(vehicle.createdAt as any).toDate().toLocaleDateString()}</span>
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
