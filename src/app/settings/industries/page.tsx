
'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Industry } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
});

export default function IndustriesPage() {
  const [industries, setIndustries] = React.useState<Industry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<Industry | null>(null);
  const [itemToEdit, setItemToEdit] = React.useState<Industry | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const fetchIndustries = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "industries"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      } as Industry));
      setIndustries(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);
  
  React.useEffect(() => {
    if (itemToEdit) {
      editForm.reset({ name: itemToEdit.name });
    }
  }, [itemToEdit, editForm]);

  const handleAddNew = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'industries'), {
        name: values.name,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Амжилттай', description: 'Шинэ чиглэл нэмэгдлээ.' });
      form.reset({ name: '' });
      fetchIndustries();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэмэхэд алдаа гарлаа.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdate = async (values: z.infer<typeof formSchema>) => {
    if (!itemToEdit) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'industries', itemToEdit.id);
      await updateDoc(docRef, { name: values.name });
      toast({ title: 'Амжилттай', description: 'Чиглэлийн нэр засагдлаа.' });
      setItemToEdit(null);
      fetchIndustries();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Засварлахад алдаа гарлаа.' });
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'industries', itemToDelete.id));
      toast({ title: 'Амжилттай', description: 'Чиглэл устгагдлаа.' });
      fetchIndustries();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.' });
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
       <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Тохиргоо
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Үйл ажиллагааны чиглэл</h1>
        <p className="text-muted-foreground">
          Харилцагчийн үйл ажиллагааны чиглэлийн лавлах санг удирдах.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шинэ чиглэл нэмэх</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddNew)} className="flex items-start gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Жишээ нь: Худалдаа" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Нэмэх
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Чиглэлүүдийн жагсаалт</CardTitle>
          <CardDescription>Нийт {industries.length} чиглэл байна.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Бүртгэсэн огноо</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : industries.length > 0 ? (
                industries.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setItemToEdit(item)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">Бүртгэлтэй чиглэл олдсонгүй.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
        <DialogContent>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)}>
              <DialogHeader>
                <DialogTitle>Чиглэл засах</DialogTitle>
                <DialogDescription>
                  Үйл ажиллагааны чиглэлийн нэрийг өөрчлөх.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                 <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Чиглэлийн нэр" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Цуцлах</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Хадгалах
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Alert */}
       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        "{itemToDelete?.name}" чиглэлийг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Устгах
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
