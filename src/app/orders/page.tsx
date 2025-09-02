

'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, doc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, RefreshCw, Eye, Edit, Trash2, Search, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function OrdersPage() {
    const [orders, setOrders] = React.useState<Order[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { toast } = useToast();

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
            toast({ title: 'Амжилттай', description: `${orderToDelete.orderNumber} дугаартай захиалгыг устгалаа.`});
        } catch (error) {
            console.error("Error deleting order and related data:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга устгахад алдаа гарлаа.'});
        } finally {
            setIsDeleting(false);
            setOrderToDelete(null);
        }
    };
    
    const filteredOrders = orders.filter(order =>
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Захиалгууд</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй захиалгуудын жагсаалт.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Захиалагч эсвэл дугаараар хайх..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <Button variant="outline" size="icon" onClick={fetchOrders} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/orders/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ захиалга
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Захиалгын жагсаалт</CardTitle>
          <CardDescription>Нийт {filteredOrders.length} захиалга байна.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Захиалгын дугаар</TableHead>
                        <TableHead>Харилцагч</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Бүртгэсэн ажилтан</TableHead>
                        <TableHead>Бүртгүүлсэн</TableHead>
                        <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                    ))
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                        <TableCell className="font-mono">
                            <Link href={`/orders/${order.id}`} className="hover:underline">
                            {order.orderNumber}
                            </Link>
                        </TableCell>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell><Badge>{order.status}</Badge></TableCell>
                        <TableCell>{order.createdBy?.name || 'N/A'}</TableCell>
                        <TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Цэс нээх</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
                                    <DropdownMenuItem asChild>
                                    <Link href={`/orders/${order.id}`}>
                                        <Eye className="mr-2 h-4 w-4"/>
                                        Дэлгэрэнгүй
                                    </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                    <Link href={`/orders/${order.id}/edit`}>
                                        <Edit className="mr-2 h-4 w-4"/>
                                        Засах
                                    </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setOrderToDelete(order)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Устгах
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            {searchTerm ? "Хайлтад тохирох үр дүн олдсонгүй." : "Бүртгэлтэй захиалга олдсонгүй."}
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                <AlertDialogDescription>
                    "{orderToDelete?.orderNumber}" дугаартай захиалгыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй. Энэ захиалгатай холбоотой бүх тээвэрлэлт, үнийн санал, ачаа болон тээврийн мэдээлэл хамт устгагдана.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Цуцлах</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteOrder} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? "Устгаж байна..." : "Устгах"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
