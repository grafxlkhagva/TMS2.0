
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, getDocs, orderBy, query, writeBatch, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ContractedTransport, ContractedTransportFrequency } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/alert-dialog";


const frequencyTranslations: Record<ContractedTransportFrequency, string> = {
    Daily: 'Өдөр бүр',
    Weekly: '7 хоног тутам',
    Monthly: 'Сар тутам',
    Custom: 'Бусад'
};

export default function ContractedTransportPage() {
  const [contracts, setContracts] = React.useState<ContractedTransport[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [itemToDelete, setItemToDelete] = React.useState<ContractedTransport | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  const fetchContracts = React.useCallback(async () => {
    setIsLoading(true);
    try {
        if (!db) return;
        const q = query(collection(db, "contracted_transports"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            return {
                id: doc.id,
                ...docData,
                createdAt: docData.createdAt.toDate(),
                startDate: docData.startDate.toDate(),
                endDate: docData.endDate.toDate(),
            } as ContractedTransport;
        });
        setContracts(data);
    } catch (error) {
        console.error("Error fetching contracted transports:", error);
        toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Гэрээт тээврийн мэдээллийг татахад алдаа гарлаа.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete all executions associated with the contract
      const executionsQuery = query(collection(db, 'contracted_transport_executions'), where('contractId', '==', itemToDelete.id));
      const executionsSnapshot = await getDocs(executionsQuery);
      executionsSnapshot.forEach(doc => {
          batch.delete(doc.ref);
      });

      // Delete the contract itself
      const contractRef = doc(db, 'contracted_transports', itemToDelete.id);
      batch.delete(contractRef);

      await batch.commit();

      setContracts(prev => prev.filter(c => c.id !== itemToDelete.id));
      toast({ title: 'Амжилттай', description: `"${itemToDelete.title}" гэрээг устгалаа.`});
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ устгахад алдаа гарлаа.'});
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };


  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Гэрээт тээвэр</h1>
          <p className="text-muted-foreground">
            Урт хугацааны, давтагдах тээвэрлэлтийн гэрээнүүд.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/contracted-transport/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Шинэ гэрээт тээвэр
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Гэрээт тээврийн жагсаалт</CardTitle>
          <CardDescription>Нийт {contracts.length} гэрээ байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Гэрээний №</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Харилцагч</TableHead>
                <TableHead>Давтамж</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : contracts.length > 0 ? (
                contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono">
                        <Link href={`/contracted-transport/${contract.id}`} className="hover:underline">
                            {contract.contractNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{contract.title}</TableCell>
                      <TableCell>{contract.customerName}</TableCell>
                      <TableCell>{frequencyTranslations[contract.frequency]}</TableCell>
                      <TableCell><Badge variant={contract.status === 'Active' ? 'success' : 'secondary'}>{contract.status}</Badge></TableCell>
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
                                  <Link href={`/contracted-transport/${contract.id}`}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    Дэлгэрэнгүй
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setItemToDelete(contract)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
                        Бүртгэлтэй гэрээт тээвэр олдсонгүй.
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
                        "{itemToDelete?.title}" гэрээг устгах гэж байна. Энэ үйлдэл нь тухайн гэрээтэй холбоотой бүх гүйцэтгэлийн мэдээллийг хамт устгах болно.
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
