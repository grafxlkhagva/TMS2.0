'use client';

import * as React from 'react';
import { collection, query, orderBy, onSnapshot, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FuelLog, Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from 'date-fns';
import { PlusCircle, Search, Fuel, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(amount);
};

export default function FuelLogsPage() {
    const [logs, setLogs] = React.useState<FuelLog[]>([]);
    const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [vehicleFilter, setVehicleFilter] = React.useState<string>('all');

    React.useEffect(() => {
        setIsLoading(true);

        // Fetch vehicles for filter
        const fetchVehicles = async () => {
            const snap = await getDocs(query(collection(db, 'vehicles'), orderBy('licensePlate')));
            setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
        };
        fetchVehicles();

        const q = query(collection(db, 'fuel_logs'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const d = doc.data();
                // Timestamp conversion
                if (d.date instanceof Timestamp) d.date = d.date.toDate();
                if (d.createdAt instanceof Timestamp) d.createdAt = d.createdAt.toDate();
                return {
                    id: doc.id,
                    ...d,
                } as FuelLog;
            });
            setLogs(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching fuel logs:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.stationName?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesVehicle = vehicleFilter === 'all' || log.vehicleId === vehicleFilter;
            return matchesSearch && matchesVehicle;
        });
    }, [logs, searchTerm, vehicleFilter]);

    const getVehiclePlate = (id: string) => {
        return vehicles.find(v => v.id === id)?.licensePlate || 'Unknown';
    };

    // Stats calculation
    const totalCost = filteredLogs.reduce((acc, log) => acc + (log.totalCost || 0), 0);
    const totalLiters = filteredLogs.reduce((acc, log) => acc + (log.liters || 0), 0);

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Түлшний хяналт</h1>
                    <p className="text-muted-foreground">Шатахуун зарцуулалт болон зардлын түүх.</p>
                </div>
                <Button asChild>
                    <Link href="/fuel/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Түлш нэмэх
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Нийт зардал</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
                        <p className="text-xs text-muted-foreground">Сонгосон хугацаанд</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Нийт литр</CardTitle>
                        <DropletIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLiters.toLocaleString()} л</div>
                        <p className="text-xs text-muted-foreground">Сонгосон хугацаанд</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Тэмдэглэл, колонкын нэрээр хайх..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Тээврийн хэрэгсэл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүгд</SelectItem>
                        {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Огноо</TableHead>
                                <TableHead>Тээврийн хэрэгсэл</TableHead>
                                <TableHead>Колонк</TableHead>
                                <TableHead>Литр</TableHead>
                                <TableHead>Үнэ / Литр</TableHead>
                                <TableHead>Нийт дүн</TableHead>
                                <TableHead>Гүйлт</TableHead>
                                <TableHead>Үр ашиг</TableHead>
                                <TableHead className="text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(log.date, 'yyyy-MM-dd HH:mm')}</TableCell>
                                        <TableCell className="font-medium">{getVehiclePlate(log.vehicleId)}</TableCell>
                                        <TableCell>{log.stationName || '-'}</TableCell>
                                        <TableCell>{log.liters} л</TableCell>
                                        <TableCell>{formatCurrency(log.pricePerLiter)}</TableCell>
                                        <TableCell>{formatCurrency(log.totalCost)}</TableCell>
                                        <TableCell>{log.odometer?.toLocaleString()} км</TableCell>
                                        <TableCell>
                                            {log.efficiency ? (
                                                <Badge variant={log.efficiency > 35 ? 'destructive' : 'secondary'}>
                                                    {log.efficiency.toFixed(1)} L/100km
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/fuel/${log.id}/edit`}>Засах</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        Түлшний бүртгэл олдсонгүй.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function DropletIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22a7 7 0 0 0 7-7c0-2-2-3-2-3a13.3 13.3 0 0 0-5-12 13.3 13.3 0 0 0-5 12c0 2 2 3-2 3a7 7 0 0 0 7 7z" />
        </svg>
    )
}
