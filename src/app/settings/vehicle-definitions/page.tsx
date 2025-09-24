

'use client';

import * as React from 'react';
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VehicleMake, VehicleModel } from '@/types';
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
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// Makes Schemas
const makeFormSchema = z.object({
  name: z.string().min(1, { message: 'Нэр дор хаяж 1 тэмдэгттэй байх ёстой.' }),
});

// Models Schemas
const modelFormSchema = z.object({
  name: z.string().min(1, { message: 'Нэр дор хаяж 1 тэмдэгттэй байх ёстой.' }),
  makeId: z.string().min(1, { message: 'Үйлдвэрлэгч сонгоно уу.' }),
});


function MakesTab() {
  const [items, setItems] = React.useState<VehicleMake[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<VehicleMake | null>(null);
  const [itemToEdit, setItemToEdit] = React.useState<VehicleMake | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof makeFormSchema>>({
    resolver: zodResolver(makeFormSchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<z.infer<typeof makeFormSchema>>({
    resolver: zodResolver(makeFormSchema),
  });

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "vehicle_makes"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as VehicleMake));
      setItems(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  React.useEffect(() => {
    if (itemToEdit) {
      editForm.reset({ name: itemToEdit.name });
    }
  }, [itemToEdit, editForm]);

  const handleAddNew = async (values: z.infer<typeof makeFormSchema>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'vehicle_makes'), {
        name: values.name,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Амжилттай', description: 'Шинэ үйлдвэрлэгч нэмэгдлээ.' });
      form.reset({ name: '' });
      fetchItems();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэмэхэд алдаа гарлаа.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdate = async (values: z.infer<typeof makeFormSchema>) => {
    if (!itemToEdit) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'vehicle_makes', itemToEdit.id);
      await updateDoc(docRef, { name: values.name });
      toast({ title: 'Амжилттай', description: 'Үйлдвэрлэгчийн нэр засагдлаа.' });
      setItemToEdit(null);
      fetchItems();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Засварлахад алдаа гарлаа.' });
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const batch = writeBatch(db);
      // First, delete all models associated with this make
      const modelsQuery = query(collection(db, 'vehicle_models'), where('makeId', '==', itemToDelete.id));
      const modelsSnapshot = await getDocs(modelsQuery);
      modelsSnapshot.forEach(doc => batch.delete(doc.ref));
      
      // Then, delete the make itself
      const makeRef = doc(db, 'vehicle_makes', itemToDelete.id);
      batch.delete(makeRef);

      await batch.commit();
      
      toast({ title: 'Амжилттай', description: 'Үйлдвэрлэгч болон холбогдох загварууд устгагдлаа.' });
      fetchItems();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.' });
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div>
        <Card>
            <CardHeader>
            <CardTitle>Шинэ үйлдвэрлэгч нэмэх</CardTitle>
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
                        <Input placeholder="Жишээ нь: Toyota" {...field} />
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
            <CardTitle>Үйлдвэрлэгчдийн жагсаалт</CardTitle>
            <CardDescription>Нийт {items.length} үйлдвэрлэгч байна.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Нэр</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                    ))
                ) : items.length > 0 ? (
                    items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
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
                    <TableCell colSpan={2} className="text-center h-24">Бүртгэлтэй үйлдвэрлэгч олдсонгүй.</TableCell>
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
                    <DialogTitle>Үйлдвэрлэгч засах</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <Input placeholder="Үйлдвэрлэгчийн нэр" {...field} />
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
                            "{itemToDelete?.name}" үйлдвэрлэгчийг устгах гэж байна. Үүнтэй холбоотой бүх загварууд мөн устгагдана.
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
  )
}

function ModelsTab() {
  const [models, setModels] = React.useState<VehicleModel[]>([]);
  const [makes, setMakes] = React.useState<VehicleMake[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<VehicleModel | null>(null);
  const [itemToEdit, setItemToEdit] = React.useState<VehicleModel | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof modelFormSchema>>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { name: '', makeId: '' },
  });

  const editForm = useForm<z.infer<typeof modelFormSchema>>({
    resolver: zodResolver(modelFormSchema),
  });

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [modelsSnapshot, makesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "vehicle_models"), orderBy("name"))),
          getDocs(query(collection(db, "vehicle_makes"), orderBy("name")))
      ]);
      const modelsData = modelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleModel));
      const makesData = makesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleMake));
      setModels(modelsData);
      setMakes(makesData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  React.useEffect(() => {
    if (itemToEdit) {
      editForm.reset({ name: itemToEdit.name, makeId: itemToEdit.makeId });
    }
  }, [itemToEdit, editForm]);

  const handleAddNew = async (values: z.infer<typeof modelFormSchema>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'vehicle_models'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Амжилттай', description: 'Шинэ загвар нэмэгдлээ.' });
      form.reset({ name: '', makeId: '' });
      fetchItems();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэмэхэд алдаа гарлаа.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdate = async (values: z.infer<typeof modelFormSchema>) => {
    if (!itemToEdit) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'vehicle_models', itemToEdit.id);
      await updateDoc(docRef, values);
      toast({ title: 'Амжилттай', description: 'Загварын нэр засагдлаа.' });
      setItemToEdit(null);
      fetchItems();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Засварлахад алдаа гарлаа.' });
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'vehicle_models', itemToDelete.id));
      toast({ title: 'Амжилттай', description: 'Загвар устгагдлаа.' });
      fetchItems();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Устгахад алдаа гарлаа.' });
    } finally {
      setItemToDelete(null);
    }
  };
  
  const getMakeName = (makeId: string) => {
    return makes.find(m => m.id === makeId)?.name || 'Тодорхойгүй';
  }

  return (
    <div>
        <Card>
            <CardHeader>
            <CardTitle>Шинэ загвар нэмэх</CardTitle>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddNew)} className="flex items-start gap-4">
                <FormField
                    control={form.control}
                    name="makeId"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Үйлдвэрлэгч сонгох..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {makes.map((make) => <SelectItem key={make.id} value={make.id}>{make.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormControl>
                        <Input placeholder="Жишээ нь: Prius" {...field} />
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
            <CardTitle>Загваруудын жагсаалт</CardTitle>
            <CardDescription>Нийт {models.length} загвар байна.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Үйлдвэрлэгч</TableHead>
                    <TableHead>Загвар</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                    ))
                ) : models.length > 0 ? (
                    models.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>{getMakeName(item.makeId)}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
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
                    <TableCell colSpan={3} className="text-center h-24">Бүртгэлтэй загвар олдсонгүй.</TableCell>
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
                    <DialogTitle>Загвар засах</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <FormField
                        control={editForm.control}
                        name="makeId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Үйлдвэрлэгч</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Үйлдвэрлэгч сонгох..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {makes.map((make) => <SelectItem key={make.id} value={make.id}>{make.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Загварын нэр</FormLabel>
                        <FormControl>
                            <Input placeholder="Загварын нэр" {...field} />
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
                            "{itemToDelete?.name}" загварыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
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
  )
}

export default function VehicleDefinitionsPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="outline" size="sm" asChild className="mb-4">
                    <Link href="/settings">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Тохиргоо
                    </Link>
                </Button>
                <h1 className="text-3xl font-headline font-bold">Үйлдвэрлэгч ба Загвар</h1>
                <p className="text-muted-foreground">
                    Машины үйлдвэрлэгч, загваруудын лавлах санг удирдах.
                </p>
            </div>

             <Tabs defaultValue="makes" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="makes">Үйлдвэрлэгчид</TabsTrigger>
                    <TabsTrigger value="models">Загварууд</TabsTrigger>
                </TabsList>
                <TabsContent value="makes">
                    <MakesTab />
                </TabsContent>
                <TabsContent value="models">
                    <ModelsTab />
                </TabsContent>
            </Tabs>

        </div>
    )
}
