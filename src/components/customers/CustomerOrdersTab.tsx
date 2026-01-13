'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Order } from '@/types';
import { customerService } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CustomerOrdersTabProps {
    customerId: string;
}

export function CustomerOrdersTab({ customerId }: CustomerOrdersTabProps) {
    const [orders, setOrders] = React.useState<Order[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        loadOrders();
    }, [customerId]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await customerService.getCustomerOrders(customerId);
            setOrders(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалгын түүх авахад алдаа гарлаа.' });
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Completed': return 'success'; // Assuming Badge supports variants like success, or default
            case 'Cancelled': return 'destructive';
            case 'Processing': return 'default';
            default: return 'secondary';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Захиалгын Түүх</CardTitle>
                <CardDescription>Нийт {orders.length} захиалга байна.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Захиалгын №</TableHead>
                            <TableHead>Огноо</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Үүсгэсэн</TableHead>
                            <TableHead className="text-right">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Уншиж байна...
                                </TableCell>
                            </TableRow>
                        ) : orders.length > 0 ? (
                            orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                    <TableCell>{order.createdAt ? format(order.createdAt, 'yyyy-MM-dd') : '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={order.status === 'Cancelled' ? 'destructive' : 'default'}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{order.createdBy?.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/orders/${order.id}`} className="text-blue-500 hover:underline text-sm">
                                            Харах
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Захиалга олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
