
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, Camera, Upload } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Driver, DriverStatus } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';

const driverStatuses: DriverStatus[] = ['Active', 'Inactive', 'On Leave'];

const formSchema = z.object({
  display_name: z.string().min(2, { message: 'Нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone_number: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  status: z.custom<DriverStatus>(val => driverStatuses.includes(val as DriverStatus)),
});

type FormValues = z.infer<typeof formSchema>;

const toDateSafe = (date: any): Date => {
  if (date instanceof Timestamp) return date.toDate();
  if (date instanceof Date) return date;
  if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
          return parsed;
      }
  }
  return new Date(); 
};


export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
    if (!id) return;
    const fetchDriver = async () => {
        try {
            const docRef = doc(db, 'Drivers', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Driver;
                form.reset({
                  display_name: data.display_name,
                  phone_number: data.phone_number,
                  status: data.status || 'Active',
                });
                setAvatarPreview(data.photo_url || null);
            } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолооч олдсонгүй.' });
                router.push(`/drivers`);
            }
        } catch (error) {
            console.error("Error fetching driver:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Жолоочийн мэдээлэл татахад алдаа гарлаа.'});
        } finally {
            setIsLoading(false);
        }
    };
    fetchDriver();
  }, [id, router, toast, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: FormValues) {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const driverRef = doc(db, 'Drivers', id);
      let dataToUpdate: any = { 
        ...values,
        edited_time: serverTimestamp(),
      };

      if (avatarFile) {
        const storageRef = ref(storage, `driver_avatars/${id}/${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        dataToUpdate.photo_url = await getDownloadURL(snapshot.ref);
      }
      
      await updateDoc(driverRef, dataToUpdate);
      
      toast({
        title: 'Амжилттай шинэчиллээ',
        description: `${values.display_name} жолоочийн мэдээллийг шинэчиллээ.`,
      });
      
      router.push(`/drivers`);

    } catch (error) {
      console.error('Error updating driver:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Жолооч шинэчлэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isLoading) {
      return (
        <div className="container mx-auto py-6">
             <div className="mb-6"><Skeleton className="h-8 w-1/4 mb-4" /><Skeleton className="h-4 w-1/2" /></div>
            <Card>
                <CardContent className="pt-6 space-y-8">
                    <div className="space-y-2"><Skeleton className="h-24 w-24 rounded-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="flex justify-end gap-2"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-24" /></div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href={`/drivers`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Жолоочийн мэдээлэл засах</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-24 w-24 border">
                            <AvatarImage src={avatarPreview ?? undefined} />
                            <AvatarFallback className="text-3xl">
                                {form.getValues('display_name')?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <Input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange} 
                            accept="image/*"
                        />
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="absolute bottom-0 right-0 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                        <FormField
                        control={form.control}
                        name="display_name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Нэр</FormLabel>
                            <FormControl>
                                <Input placeholder="Бат Болд" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Утасны дугаар</FormLabel>
                        <FormControl>
                            <Input placeholder="8811-XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Статус</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Статус сонгоно уу..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Active">Идэвхтэй</SelectItem>
                                <SelectItem value="Inactive">Идэвхгүй</SelectItem>
                                <SelectItem value="On Leave">Чөлөөнд</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                    <Link href={`/drivers`}>Цуцлах</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Хадгалах
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
