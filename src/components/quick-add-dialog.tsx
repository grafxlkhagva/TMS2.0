
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
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
import { Textarea } from './ui/textarea';
import LocationPicker from './location-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Region } from '@/types';

const defaultGeolocation = { lat: 47.91976, lng: 106.91763 };

const warehouseSchema = z.object({
  name: z.string().min(2, { message: 'Агуулахын нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  regionId: z.string().min(1, { message: 'Бүс нутаг сонгоно уу.' }),
  location: z.string().min(5, { message: 'Байршил сонгоно уу.' }),
  geolocation: z.object({
      lat: z.number(),
      lng: z.number(),
  }),
  conditions: z.string().min(5, { message: 'Нөхцөлийн мэдээлэл дор хаяж 5 тэмдэгттэй байх ёстой.' }),
  contactInfo: z.string().min(5, { message: 'Холбоо барих мэдээлэл дор хаяж 5 тэмдэгттэй байх ёстой.' }),
});

const defaultSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
});

export type QuickAddDialogProps = {
  open: boolean;
  onClose: () => void;
  collectionName: string;
  title: string;
  onSuccess: (newItem: any) => void;
  isWarehouse?: boolean;
};

export default function QuickAddDialog({ open, onClose, collectionName, title, onSuccess, isWarehouse = false }: QuickAddDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [regions, setRegions] = React.useState<Region[]>([]);
  
  const form = useForm({
    resolver: zodResolver(isWarehouse ? warehouseSchema : defaultSchema),
    defaultValues: isWarehouse 
        ? { name: '', regionId: '', location: '', geolocation: defaultGeolocation, conditions: '', contactInfo: '' }
        : { name: '' },
  });

  React.useEffect(() => {
    if (isWarehouse) {
      const fetchRegions = async () => {
        try {
          const q = query(collection(db, "regions"), orderBy("name"));
          const snapshot = await getDocs(q);
          setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region)))
        } catch (error) {
          console.error("Could not fetch regions for quick add warehouse", error);
        }
      }
      fetchRegions();
    }
  }, [isWarehouse]);


  const handleAddNew = async (values: any) => {
    setIsSubmitting(true);
    try {
      const dataToAdd = {
        ...values,
        createdAt: serverTimestamp(),
      };
      
      if (isWarehouse) {
        dataToAdd.customerName = 'Эзэмшигчгүй';
      }

      const docRef = await addDoc(collection(db, collectionName), dataToAdd);
      toast({ title: 'Амжилттай', description: 'Шинэ мэдээлэл нэмэгдлээ.' });
      
      const newItem = { id: docRef.id, ...dataToAdd, createdAt: new Date() };
      onSuccess(newItem);
      
      form.reset();
      onClose();

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэмэхэд алдаа гарлаа.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddNew)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isWarehouse ? (
                <div className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Агуулахын нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="regionId" render={({ field }) => ( <FormItem><FormLabel>Бүс нутаг</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Бүс..." /></SelectTrigger></FormControl><SelectContent>{regions.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel>Байршил</FormLabel><FormControl><Controller control={form.control} name="location" render={({ field: { onChange } }) => (<LocationPicker initialCoordinates={defaultGeolocation} onLocationSelect={(address, latLng) => { onChange(address); form.setValue('geolocation', latLng); form.clearErrors('location'); }} /> )}/></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="conditions" render={({ field }) => ( <FormItem><FormLabel>Ачих буулгах нөхцөл</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="contactInfo" render={({ field }) => ( <FormItem><FormLabel>Холбоо барих мэдээлэл</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
              ) : (
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              )}
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

    