'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer } from '@/types';
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
import { MoreHorizontal, PlusCircle, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchCustomers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
        } as Customer;
      });
      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Харилцагчдын мэдээллийг татахад алдаа гарлаа.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Харилцагчид</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй харилцагчдын жагсаалт.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" onClick={fetchCustomers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/customers/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ харилцагч
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Харилцагчдын жагсаалт</CardTitle>
          <CardDescription>Системд бүртгэлтэй нийт {customers.length} харилцагч байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Регистрийн дугаар</TableHead>
                <TableHead>И-мэйл</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Бүртгүүлсэн</TableHead>
                <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length > 0 ? (
                customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <Link href={`/customers/${customer.id}`} className="hover:underline">
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.registerNumber}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.officePhone}</TableCell>
                      <TableCell>{customer.createdAt.toLocaleDateString()}</TableCell>
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
                                  <Link href={`/customers/${customer.id}`}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Дэлгэрэнгүй
                                  </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        Бүртгэлтэй харилцагч олдсонгүй.
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
