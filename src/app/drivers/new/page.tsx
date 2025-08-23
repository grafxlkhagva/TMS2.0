
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft, Camera, Upload } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DriverStatus } from '@/types';

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


const driverStatuses: DriverStatus[] = ['Active', 'Inactive', 'On Leave'];

const formSchema = z.object({
  display_name: z.string().min(2, { message: 'Нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone_number: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  status: z.custom<DriverStatus>(val => driverStatuses.includes(val as DriverStatus)),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewDriverPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: '',
      phone_number: '',
      status: 'Active',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      let photo_url = '';
      const docRef = await addDoc(collection(db, 'Drivers'), {
        ...values,
        photo_url: '',
        created_time: serverTimestamp(),
        edited_time: serverTimestamp(),
      });

      if (avatarFile) {
        const storageRef = ref(storage, `driver_avatars/${docRef.id}/${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        photo_url = await getDownloadURL(snapshot.ref);
        await db.doc(`Drivers/${docRef.id}`).update({ photo_url });
      }
      
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${values.display_name} нэртэй жолоочийг системд бүртгэлээ.`,
      });
      
      router.push('/drivers');

    } catch (error) {
      console.error('Error creating driver:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Жолооч бүртгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
         <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href="/drivers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Шинэ жолооч бүртгэх</h1>
        <p className="text-muted-foreground">
          Жолоочийн дэлгэрэнгүй мэдээллийг оруулна уу.
        </p>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Link href="/drivers">Цуцлах</Link>
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
