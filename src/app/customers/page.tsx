
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { CustomerStats } from '@/components/customers/CustomerStats';
import { CustomerListTable } from '@/components/customers/CustomerListTable';
import { customerService } from '@/services/customerService';
import type { Customer } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();

  const fetchCustomers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { customers: data } = await customerService.getCustomers(null, 50, searchTerm);
      setCustomers(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Харилцагчдын мэдээллийг татахад алдаа гарлаа.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, toast]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(customerToDelete.id);
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
      toast({ title: 'Амжилттай', description: `${customerToDelete.name} харилцагчийг устгалаа.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагч устгахад алдаа гарлаа.' });
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Харилцагчид</h1>
          <p className="text-muted-foreground">
            Бүртгэлтэй харилцагчдын жагсаалт.
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

      <div className="space-y-6">
        <CustomerStats customers={customers} isLoading={isLoading} />

        <Card>
          <CardHeader>
            <CardTitle>Харилцагчдын жагсаалт</CardTitle>
            <CardDescription>Нийт {customers.length} харилцагч байна.</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerListTable
              customers={customers}
              isLoading={isLoading}
              onDelete={setCustomerToDelete}
            />
          </CardContent>
        </Card>

        <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
              <AlertDialogDescription>
                "{customerToDelete?.name}" нэртэй харилцагчийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй. Энэ харилцагчтай холбоотой бүх ажилтны мэдээлэл мөн устгагдана.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Цуцлах</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCustomer} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Устгаж байна..." : "Устгах"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

