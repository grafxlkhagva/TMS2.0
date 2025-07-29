
'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Warehouse } from '@/types';
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
import { PlusCircle, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();

  const fetchWarehouses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "warehouses"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
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
                <TableHead>Байршил</TableHead>
                <TableHead>Эзэмшигч</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>{warehouse.location}</TableCell>
                      <TableCell>{warehouse.customerName || 'Тодорхойгүй'}</TableCell>
                      <TableCell>{warehouse.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                         {/* Action Menu will be added here later */}
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        {searchTerm ? "Хайлтад тохирох үр дүн олдсонгүй." : "Бүртгэлтэй агуулах олдсонгүй."}
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
