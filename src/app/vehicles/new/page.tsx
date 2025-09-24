
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import Link from 'next/link';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  model: z.string().min(2, {
    message: 'Загвар дор хаяж 2 тэмдэгттэй байх ёстой.',
  }),
  licensePlate: z.string().min(4, {
    message: 'Улсын дугаар дор хаяж 4 тэмдэгттэй байх ёстой.',
  }),
});

export default function NewVehiclePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: '',
      licensePlate: '',
    },
  });

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
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Загвар</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ нь: Howo T7H" {...field} />
                    </FormControl>
                    <FormDescription>
                      Тээврийн хэрэгслийн үйлдвэрлэгч, загварын нэр.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Улсын дугаар</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ нь: 0000 УБA" {...field} />
                    </FormControl>
                    <FormDescription>Тээврийн хэрэгслийн улсын дугаар.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
    </div>
  );
}
