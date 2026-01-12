'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, RefreshCw, MoreHorizontal, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { MaintenanceRecord, Vehicle } from '@/types';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(amount);
};

// Helper for status colors
const getStatusColor = (status: MaintenanceRecord['status']) => {
    switch (status) {
        case 'Completed': return 'success';
        case 'In Progress': return 'warning';
        case 'Scheduled': return 'default';
        case 'Cancelled': return 'destructive';
        default: return 'secondary';
    }
};

const getStatusLabel = (status: MaintenanceRecord['status']) => {
    switch (status) {
        case 'Completed': return 'Дууссан';
        case 'In Progress': return 'Хийгдэж буй';
        case 'Scheduled': return 'Төлөвлөсөн';
        case 'Cancelled': return 'Цуцлагдсан';
        default: return status;
    }
};

export default function MaintenancesPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [records, setRecords] = React.useState<(MaintenanceRecord & { vehiclePlate?: string, vehicleModel?: string })[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');

    const fetchData = React.useCallback(async () => {
        if (!db) return;
        setIsLoading(true);
        try {
            // Fetch maintenances and vehicles
            const [maintenanceSnap, vehicleSnap] = await Promise.all([
                getDocs(query(collection(db, 'maintenances'), orderBy('date', 'desc'))),
                getDocs(collection(db, 'vehicles'))
            ]);

            const vehiclesMap = new Map<string, Vehicle>();
            vehicleSnap.docs.forEach(doc => {
                vehiclesMap.set(doc.id, { id: doc.id, ...doc.data() } as Vehicle);
            });

            const data = maintenanceSnap.docs.map(doc => {
                const record = { id: doc.id, ...doc.data() } as MaintenanceRecord;
                const vehicle = vehiclesMap.get(record.vehicleId);

                // Timestamp conversion
                if (record.date instanceof Timestamp) record.date = record.date.toDate();
                if (record.createdAt instanceof Timestamp) record.createdAt = record.createdAt.toDate();

                return {
                    ...record,
                    vehiclePlate: vehicle?.licensePlate || 'Unknown',
                    vehicleModel: vehicle?.modelName || 'Unknown'
                };
            });

            setRecords(data);
        } catch (error) {
            console.error("Error fetching maintenances:", error);
            toast({
                variant: "destructive",
                title: "Алдаа",
                description: "Засварын мэдээлэл татахад алдаа гарлаа.",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredRecords = React.useMemo(() => {
        return records.filter(record => {
            const matchesSearch =
                record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.garageName?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [records, searchTerm, statusFilter]);

    if (!db) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Системтэй холбогдоход алдаа гарлаа. (Firestore initialization failed)</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Засвар үйлчилгээ</h1>
                    <p className="text-muted-foreground">
                        Техникийн засвар, үйлчилгээний түүх болон төлөвлөгөө.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Хайх..."
                            className="pl-9 w-40"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Төлөв..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх төлөв</SelectItem>
                            <SelectItem value="Scheduled">Төлөвлөсөн</SelectItem>
                            <SelectItem value="In Progress">Хийгдэж буй</SelectItem>
                            <SelectItem value="Completed">Дууссан</SelectItem>
                            <SelectItem value="Cancelled">Цуцлагдсан</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
                        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                    </Button>
                    <Button asChild>
                        <Link href="/maintenances/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Шинэ засвар
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Засварын түүх</CardTitle>
                    <CardDescription>Нийт: {filteredRecords.length} бүртгэл</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Огноо</TableHead>
                                <TableHead>Тээврийн хэрэгсэл</TableHead>
                                <TableHead>Төрөл</TableHead>
                                <TableHead>Тайлбар</TableHead>
                                <TableHead>Гүйцэтгэгч / Гараж</TableHead>
                                <TableHead>Зардал</TableHead>
                                <TableHead>Төлөв</TableHead>
                                <TableHead className="text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredRecords.length > 0 ? (
                                filteredRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {isValidDate(record.date) ? format(record.date, 'yyyy-MM-dd') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{record.vehiclePlate}</span>
                                                <span className="text-xs text-muted-foreground">{record.vehicleModel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{record.type}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={record.description}>{record.description}</TableCell>
                                        <TableCell>{record.garageName || '-'}</TableCell>
                                        <TableCell>{formatCurrency(record.cost)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(record.status)}>{getStatusLabel(record.status)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Цэс нээх</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Үйлдэл</DropdownMenuLabel>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/maintenances/${record.id}/edit`}>Засах</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/vehicles/${record.vehicleId}`}>Тээврийн хэрэгсэл харах</Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        Одоогоор засварын бүртгэл байхгүй байна.
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

function isValidDate(d: any) {
    return d instanceof Date && !isNaN(d.getTime());
}
