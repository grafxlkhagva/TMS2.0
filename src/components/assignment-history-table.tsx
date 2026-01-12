'use client';

import * as React from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VehicleAssignment } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface AssignmentHistoryTableProps {
    driverId?: string;
    vehicleId?: string;
}

const toDateSafe = (date: any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string' || typeof date === 'number') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
};

export function AssignmentHistoryTable({ driverId, vehicleId }: AssignmentHistoryTableProps) {
    const [history, setHistory] = React.useState<VehicleAssignment[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchHistory = async () => {
            if (!db) return;
            setLoading(true);
            try {
                let q;
                if (driverId) {
                    q = query(
                        collection(db, 'AssignmentHistory'),
                        where('driverId', '==', driverId),
                        orderBy('assignedAt', 'desc')
                    );
                } else if (vehicleId) {
                    q = query(
                        collection(db, 'AssignmentHistory'),
                        where('vehicleId', '==', vehicleId),
                        orderBy('assignedAt', 'desc')
                    );
                } else {
                    return;
                }

                const snap = await getDocs(q);
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleAssignment));
                setHistory(data);
            } catch (error) {
                console.error('Error fetching assignment history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [driverId, vehicleId]);

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{driverId ? 'Тээврийн хэрэгсэл' : 'Жолооч'}</TableHead>
                        <TableHead>Оноосон огноо</TableHead>
                        <TableHead>Дууссан огноо</TableHead>
                        <TableHead>Одометр</TableHead>
                        <TableHead>Статус</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.length > 0 ? (
                        history.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                    {driverId ? record.vehiclePlate : record.driverName}
                                </TableCell>
                                <TableCell>
                                    {format(toDateSafe(record.assignedAt), 'yyyy-MM-dd HH:mm')}
                                </TableCell>
                                <TableCell>
                                    {record.endedAt ? format(toDateSafe(record.endedAt), 'yyyy-MM-dd HH:mm') : '-'}
                                </TableCell>
                                <TableCell>
                                    {record.startOdometer} {record.endOdometer ? `-> ${record.endOdometer}` : ''}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={record.status === 'Active' ? 'success' : 'secondary'}>
                                        {record.status === 'Active' ? 'Идэвхтэй' : 'Дууссан'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                Түүх олдсонгүй.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
