
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
});

export type QuickAddDialogProps = {
  open: boolean;
  onClose: () => void;
  collectionName: string;
  title: string;
  onSuccess: (newItem: any) => void;
};

export default function QuickAddDialog({ open, onClose, collectionName, title, onSuccess }: QuickAddDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const handleAddNew = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        name: values.name,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Амжилттай', description: 'Шинэ мэдээлэл нэмэгдлээ.' });
      
      const newItem = { id: docRef.id, name: values.name, createdAt: new Date() };
      onSuccess(newItem);
      
      form.reset();
      onClose();

    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэмэхэд алдаа гарлаа.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddNew)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Шинэ мэдээллийн нэрийг оруулна уу.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name" className="text-right">Нэр</FormLabel>
                    <FormControl>
                      <Input id="name" {...field} />
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
  );
}
