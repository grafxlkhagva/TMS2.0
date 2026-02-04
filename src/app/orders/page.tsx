

'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, doc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order } from '@/types';
import { useRouter } from 'next/navigation';
import {
    TableCell,
    TableHead,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, RefreshCw, Eye, Edit, Trash2, Search, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { OrderStats } from '@/components/orders/order-stats';
import { OrderFilters } from '@/components/orders/order-filters';
import { DateRange } from 'react-day-picker';
import { isWithinInterval } from 'date-fns';
import {
    ConfirmDialog,
    DataTable,
    EmptyState,
    FilterBar,
    PageContainer,
    PageHeader,
} from '@/components/patterns';

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = React.useState<Order[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
    const [statusFilter, setStatusFilter] = React.useState<string[]>([]);

    const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { toast } = useToast();

    // Stats calculations
    const stats = React.useMemo(() => {
        return {
            total: orders.length,
            pending: orders.filter(o => o.status === 'Pending').length,
            active: orders.filter(o => o.status === 'Processing').length,
            completed: orders.filter(o => o.status === 'Completed').length,
        };
    }, [orders]);

    const fetchOrders = React.useCallback(async () => {
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
            const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt.toDate(),
                } as Order;
            });
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders: ", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Захиалгын мэдээллийг татахад алдаа гарлаа.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDeleteOrder = async () => {
        if (!orderToDelete || !db) return;
        setIsDeleting(true);
        
        // Blur active element to prevent aria-hidden focus conflict
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        
        try {
            const batch = writeBatch(db);
            const orderRef = doc(db, 'orders', orderToDelete.id);

            // 1. Find and delete all related order_items, quotes, and cargoes
            const itemsQuery = query(collection(db, 'order_items'), where('orderId', '==', orderToDelete.id));
            const itemsSnapshot = await getDocs(itemsQuery);

            for (const itemDoc of itemsSnapshot.docs) {
                const itemRef = itemDoc.ref;
                // Delete related quotes
                const quotesQuery = query(collection(db, 'driver_quotes'), where('orderItemRef', '==', itemRef));
                const quotesSnapshot = await getDocs(quotesQuery);
                quotesSnapshot.forEach(quoteDoc => batch.delete(quoteDoc.ref));

                // Delete related cargoes
                const cargoQuery = query(collection(db, 'order_item_cargoes'), where('orderItemRef', '==', itemRef));
                const cargoSnapshot = await getDocs(cargoQuery);
                cargoSnapshot.forEach(cargoDoc => batch.delete(cargoDoc.ref));

                // Delete the item itself
                batch.delete(itemRef);
            }

            // 2. Delete the order itself
            batch.delete(orderRef);

            await batch.commit();

            setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
            toast({ title: 'Амжилттай', description: `${orderToDelete.orderNumber} дугаартай захиалгыг устгалаа.` });
        } catch (error) {
            console.error("Error deleting order and related data:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга устгахад алдаа гарлаа.' });
        } finally {
            setIsDeleting(false);
            setOrderToDelete(null);
        }
    };

    const filteredOrders = React.useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status);

            let matchesDate = true;
            if (dateRange?.from) {
                // If only 'from' is selected, match that day. If 'to' is selected, match range.
                const end = dateRange.to || dateRange.from;
                // Add 1 day to end date to include the full day
                const endDateInclusive = new Date(end);
                endDateInclusive.setHours(23, 59, 59, 999);

                matchesDate = isWithinInterval(order.createdAt, { start: dateRange.from, end: endDateInclusive });
            }

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [orders, searchTerm, statusFilter, dateRange]);

    const handleRowNavigate = React.useCallback(
        (e: React.MouseEvent | React.KeyboardEvent, orderId: string) => {
            // Don't navigate when interacting with controls inside the row.
            const target = e.target as HTMLElement | null;
            if (target?.closest('a,button,input,select,textarea,[role="menuitem"],[data-no-row-nav="true"]')) {
                return;
            }
            router.push(`/orders/${orderId}`);
        },
        [router]
    );

    return (
        <PageContainer size="comfortable">
            <PageHeader
                title="Захиалгын удирдлага"
                description="Бүх захиалгуудыг хянах, удирдах хэсэг"
                actions={
                    <Button asChild>
                        <Link href="/orders/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Шинэ захиалга
                        </Link>
                    </Button>
                }
            />

            <OrderStats
                totalOrders={stats.total}
                pendingOrders={stats.pending}
                activeOrders={stats.active}
                completedOrders={stats.completed}
            />

            <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-3">
                    <FilterBar
                        right={
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={fetchOrders}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        }
                    >
                        <div className="flex flex-col gap-1">
                            <CardTitle>Захиалгууд</CardTitle>
                            <CardDescription>
                                Нийт {filteredOrders.length} захиалга илэрцээс харж байна.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
                            <OrderFilters
                                dateRange={dateRange}
                                setDateRange={setDateRange}
                                statusFilter={statusFilter}
                                setStatusFilter={setStatusFilter}
                            />
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Захиалагч, дугаараар хайх..."
                                    className="pl-9 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </FilterBar>
                </CardHeader>
                <CardContent>
                    <DataTable
                        header={
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[180px]">Захиалгын дугаар</TableHead>
                                <TableHead>Харилцагч</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Бүртгэсэн ажилтан</TableHead>
                                <TableHead>Бүртгүүлсэн</TableHead>
                                <TableHead className="w-[70px]">
                                    <span className="sr-only">Үйлдэл</span>
                                </TableHead>
                            </TableRow>
                        }
                        colSpan={6}
                        isLoading={isLoading}
                        isEmpty={!isLoading && filteredOrders.length === 0}
                        empty={
                            <EmptyState
                                icon={Search}
                                title="Захиалга олдсонгүй"
                                description={
                                    searchTerm
                                        ? `"${searchTerm}" хайлтад тохирох захиалга байхгүй байна.`
                                        : "Одоогоор системд ямар ч захиалга бүртгэгдээгүй байна."
                                }
                                action={
                                    searchTerm ? (
                                        <Button variant="link" onClick={() => setSearchTerm('')}>
                                            Хайлт цэвэрлэх
                                        </Button>
                                    ) : null
                                }
                            />
                        }
                    >
                        {filteredOrders.map((order) => (
                            <TableRow
                                key={order.id}
                                className="group cursor-pointer hover:bg-muted/50 transition-colors"
                                tabIndex={0}
                                onClick={(e) => handleRowNavigate(e, order.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleRowNavigate(e, order.id);
                                    }
                                }}
                            >
                                <TableCell className="font-mono font-medium text-primary">
                                    <Link
                                        href={`/orders/${order.id}`}
                                        className="hover:underline flex items-center gap-2"
                                    >
                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                        {order.orderNumber}
                                    </Link>
                                </TableCell>
                                <TableCell className="font-medium">{order.customerName}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            order.status === 'Completed'
                                                ? 'success'
                                                : order.status === 'Cancelled'
                                                    ? 'destructive'
                                                    : order.status === 'Processing'
                                                        ? 'default'
                                                        : 'secondary'
                                        }
                                        className="shadow-none"
                                    >
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {order.createdBy?.name || 'N/A'}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {order.createdAt.toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition-opacity"
                                                data-no-row-nav="true"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Үйлдэл</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/orders/${order.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Дэлгэрэнгүй
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/orders/${order.id}/edit`}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Засах
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setOrderToDelete(order)}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Устгах
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </DataTable>
                </CardContent>
            </Card>
            <ConfirmDialog
                open={!!orderToDelete}
                onOpenChange={(open) => {
                    if (!open) setOrderToDelete(null);
                }}
                title="Захиалга устгах"
                description={
                    <>
                        Та "{orderToDelete?.orderNumber}" дугаартай захиалгыг устгахдаа итгэлтэй байна уу?
                        <br />
                        <br />
                        <span className="text-destructive font-medium">Анхааруулга:</span> Энэ үйлдэл нь захиалгатай
                        холбоотой бүх тээвэрлэлт, үнийн санал болон бусад мэдээллийг бүрмөсөн устгана. Буцаах боломжгүй.
                    </>
                }
                confirmLabel={isDeleting ? "Устгаж байна..." : "Устгах"}
                isConfirming={isDeleting}
                onConfirm={handleDeleteOrder}
            />
        </PageContainer>
    );
}
