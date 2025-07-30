
'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Warehouse, Region } from '@/types';
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
import { MoreHorizontal, PlusCircle, RefreshCw, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
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

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [regions, setRegions] = React.useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [itemToDelete, setItemToDelete] = React.useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  const fetchWarehouses = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const warehousesQuery = query(collection(db, "warehouses"), orderBy("createdAt", "desc"));
        const regionsQuery = query(collection(db, "regions"));
        
        const [warehousesSnapshot, regionsSnapshot] = await Promise.all([
            getDocs(warehousesQuery),
            getDocs(regionsQuery)
        ]);
        
        const regionsMap = new Map(regionsSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        setRegions(regionsMap);

        const data = warehousesSnapshot.docs.map(doc => {
            const docData = doc.data();
            return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt.toDate(),
            } as Warehouse;
        });
        setWarehouses(data);

    } catch (error) {
      console.error("Error fetching warehouses: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Агуулахын мэдээллийг татахад алдаа гарлаа.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'warehouses', itemToDelete.id));
      setWarehouses(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast({ title: 'Амжилттай', description: `${itemToDelete.name} агуулахыг устгалаа.`});
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Агуулах устгахад алдаа гарлаа.'});
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Агуулах</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй агуулахын жагсаалт.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Нэрээр хайх..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <Button variant="outline" size="icon" onClick={fetchWarehouses} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/warehouses/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ агуулах
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Агуулахын жагсаалт</CardTitle>
          <CardDescription>Нийт {filteredWarehouses.length} агуулах байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Бүс нутаг</TableHead>
                <TableHead>Байршил</TableHead>
                <TableHead>Эзэмшигч</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">
                         <Link href={`/warehouses/${warehouse.id}`} className="hover:underline">
                          {warehouse.name}
                        </Link>
                      </TableCell>
                      <TableCell>{regions.get(warehouse.regionId) || 'Тодорхойгүй'}</TableCell>
                      <TableCell>{warehouse.location}</TableCell>
                      <TableCell>{warehouse.customerName || 'Тодорхойгүй'}</TableCell>
                      <TableCell>{warehouse.createdAt.toLocaleDateString()}</TableCell>
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
                                  <Link href={`/warehouses/${warehouse.id}`}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Дэлгэрэнгүй
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/warehouses/${warehouse.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Засах
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setItemToDelete(warehouse)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
                        {searchTerm ? "Хайлтад тохирох үр дүн олдсонгүй." : "Бүртгэлтэй агуулах олдсонгүй."}
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        "{itemToDelete?.name}" нэртэй агуулахыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? "Устгаж байна..." : "Устгах"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
