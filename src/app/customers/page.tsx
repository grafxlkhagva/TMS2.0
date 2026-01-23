
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, RefreshCw, Search, X } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Client-side хайлт: нэр, утас, и-мэйл, регистрээр хайна
function filterCustomers(customers: Customer[], term: string): Customer[] {
  if (!term.trim()) return customers;
  const lower = term.toLowerCase().trim();
  return customers.filter(c =>
    c.name?.toLowerCase().includes(lower) ||
    c.officePhone?.includes(term) ||
    c.email?.toLowerCase().includes(lower) ||
    c.registerNumber?.toLowerCase().includes(lower)
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function CustomersPage() {
  // Бүх харилцагчид (stats тооцоход)
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();

  // Хуудаслалт
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // Client-side дээр шүүсэн харилцагчид
  const filteredCustomers = React.useMemo(
    () => filterCustomers(allCustomers, searchTerm),
    [allCustomers, searchTerm]
  );

  // Хуудаслалтын тооцоо
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Хайлт өөрчлөгдөхөд эхний хуудас руу буцах
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const isSearching = searchTerm.trim().length > 0;

  // Бүх харилцагчийг татах (хайлтгүй)
  const fetchCustomers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Бүх харилцагчийг татна (200 хүртэл) — client-side хайлтанд
      const { customers: data } = await customerService.getCustomers(null, 200, '');
      setAllCustomers(data);
    } catch (error) {
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

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(customerToDelete.id);
      setAllCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
      toast({ title: 'Амжилттай', description: `${customerToDelete.name} харилцагчийг устгалаа.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагч устгахад алдаа гарлаа.' });
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  };

  const clearSearch = () => setSearchTerm('');

  // Empty state-ийн мессеж
  const getEmptyMessage = () => {
    if (isSearching && filteredCustomers.length === 0) {
      return `"${searchTerm}" хайлтад тохирох харилцагч олдсонгүй`;
    }
    if (allCustomers.length === 0) {
      return 'Бүртгэлтэй харилцагч одоогоор байхгүй байна. Шинэ харилцагч нэмнэ үү.';
    }
    return 'Бүртгэлтэй харилцагч олдсонгүй.';
  };

  // Хайлтын үр дүнгийн мессеж
  const getResultsMessage = () => {
    if (isSearching) {
      return `${filteredCustomers.length} харилцагч олдлоо (нийт ${allCustomers.length})`;
    }
    if (totalPages > 1) {
      return `Нийт ${allCustomers.length} харилцагч (${currentPage}/${totalPages} хуудас)`;
    }
    return `Нийт ${allCustomers.length} харилцагч`;
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
        {/* Stats нь бүх харилцагчаар тооцогдоно (хайлтаас хамааралгүй) */}
        <CustomerStats customers={allCustomers} isLoading={isLoading} />

        <Card>
          <CardHeader>
            <CardTitle>Харилцагчдын жагсаалт</CardTitle>
            <CardDescription>
              {getResultsMessage()}
            </CardDescription>
            <div className="mt-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Нэр, утас, и-мэйл, регистрээр хайх..."
                  className="pl-10 pr-10 h-10 rounded-lg border-input bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Хайлт арилгах</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CustomerListTable
              customers={paginatedCustomers}
              isLoading={isLoading}
              onDelete={setCustomerToDelete}
              emptyMessage={getEmptyMessage()}
            />
          </CardContent>

          {/* Хуудаслалт */}
          {filteredCustomers.length > 0 && (
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Хуудсанд:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="hidden sm:inline">
                  | {startIndex + 1}–{Math.min(endIndex, filteredCustomers.length)} / {filteredCustomers.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Эхний хуудас</span>
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Өмнөх</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 mx-2">
                  {/* Хуудасны дугаарууд */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Дараах</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Сүүлийн хуудас</span>
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </CardFooter>
          )}
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
              <AlertDialogCancel disabled={isDeleting}>Цуцлах</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteCustomer();
                }} 
                disabled={isDeleting} 
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Устгаж байна..." : "Устгах"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

