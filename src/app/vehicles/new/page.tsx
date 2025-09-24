

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { VehicleType, TrailerType } from '@/types';
import QuickAddDialog, { type QuickAddDialogProps } from '@/components/quick-add-dialog';

const fuelTypes = ['Diesel', 'Gasoline', 'Electric', 'Hybrid'] as const;

const formSchema = z.object({
  make: z.string().min(2, "Үйлдвэрлэгчийн нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
  model: z.string().min(2, "Загварын нэр дор хаяж 2 тэмдэгттэй байх ёстой."),
  year: z.coerce.number().min(1980, "Оноо зөв оруулна уу.").max(new Date().getFullYear() + 1, "Оноо зөв оруулна уу."),
  licensePlate: z.string().min(4, "Улсын дугаар дор хаяж 4 тэмдэгттэй байх ёстой.").regex(/^[0-9]{4}\s[А-Я|а-я]{3}$/, 'Улсын дугаарыг "0000 УБA" хэлбэрээр оруулна уу.'),
  vin: z.string().length(17, "Арлын дугаар 17 тэмдэгттэй байна."),
  vehicleTypeId: z.string().min(1, "Машины төрөл сонгоно уу."),
  trailerTypeId: z.string().min(1, "Тэвшний төрөл сонгоно уу."),
  capacity: z.string().min(1, "Даацын мэдээллийг оруулна уу."),
  fuelType: z.enum(fuelTypes),
  notes: z.string().optional(),
});


export default function NewVehiclePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
  const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
  const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      vin: '',
      vehicleTypeId: '',
      trailerTypeId: '',
      capacity: '',
      fuelType: 'Diesel',
      notes: '',
    },
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehicleTypeSnap, trailerTypeSnap] = await Promise.all([
          getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
          getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
        ]);
        setVehicleTypes(vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)));
        setTrailerTypes(trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Лавлах сангийн мэдээлэл татахад алдаа гарлаа.'});
      }
    }
    fetchData();
  }, [toast]);
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'vehicles'), {
        ...values,
        status: 'Available',
        driverId: null,
        driverName: null,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Амжилттай!',
        description: `Тээврийн хэрэгслийг системд бүртгэлээ.`,
      });
      router.push('/vehicles');
    } catch(error) {
        console.error("Error adding vehicle:", error)
        toast({
            variant: "destructive",
            title: 'Алдаа',
            description: `Тээврийн хэрэгсэл бүртгэхэд алдаа гарлаа.`,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleQuickAdd = (type: 'vehicle_types' | 'trailer_types', formField: 'vehicleTypeId' | 'trailerTypeId') => {
    setDialogProps({
        open: true,
        collectionName: type,
        title: `Шинэ ${type === 'vehicle_types' ? 'машины төрөл' : 'тэвшний төрөл'} нэмэх`,
        onSuccess: (newItem) => {
            if (type === 'vehicle_types') {
                setVehicleTypes(prev => [...prev, newItem as VehicleType]);
            } else {
                setTrailerTypes(prev => [...prev, newItem as TrailerType]);
            }
            form.setValue(formField, newItem.id);
            setDialogProps(null);
        }
    });
  };

  return (
    <div className="container mx-auto py-6">
       <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/vehicles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
          <h1 className="text-3xl font-headline font-bold">Шинэ тээврийн хэрэгсэл</h1>
          <p className="text-muted-foreground">
            Үндсэн мэдээллийг бөглөж шинээр тээврийн хэрэгсэл бүртгэнэ үү.
          </p>
        </div>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel>Үйлдвэрлэгч</FormLabel><FormControl><Input placeholder="Howo" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel>Загвар</FormLabel><FormControl><Input placeholder="T7H" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="year" render={({ field }) => ( <FormItem><FormLabel>Үйлдвэрлэсэн он</FormLabel><FormControl><Input type="number" placeholder="2023" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="licensePlate" render={({ field }) => ( <FormItem><FormLabel>Улсын дугаар</FormLabel><FormControl><Input placeholder="0000 УБА" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="vin" render={({ field }) => ( <FormItem><FormLabel>Арлын дугаар (VIN)</FormLabel><FormControl><Input placeholder="17 оронтой дугаар" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (<FormItem><FormLabel>Машины төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map((s) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('vehicle_types', 'vehicleTypeId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="trailerTypeId" render={({ field }) => (<FormItem><FormLabel>Тэвшний төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map((s) => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('trailer_types', 'trailerTypeId')}><Plus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="capacity" render={({ field }) => ( <FormItem><FormLabel>Даац / Хэмжээ</FormLabel><FormControl><Input placeholder="25тн, 90м3" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fuelType" render={({ field }) => ( <FormItem><FormLabel>Шатахууны төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{fuelTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                 <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Нэмэлт тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Тээврийн хэрэгслийн талаарх нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                    <Link href="/vehicles">Цуцлах</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Бүртгэх
              </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
    </div>
  );
}
