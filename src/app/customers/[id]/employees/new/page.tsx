
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewEmployeePage() {
  const { id: customerId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      position: '',
      phone: '',
      email: '',
      note: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'customer_employees'), {
        lastName: values.lastName ?? '',
        firstName: values.firstName ?? '',
        position: values.position ?? '',
        phone: values.phone ?? '',
        email: values.email ?? '',
        note: values.note ?? '',
        customerId: customerId,
        customerRef: doc(db, 'customers', customerId),
        createdAt: serverTimestamp(),
      });

      const displayName = [values.firstName, values.lastName].filter(Boolean).join(' ') || values.phone || values.email || 'Ажилтан';
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${displayName}-ийг системд бүртгэлээ. Дэлгэрэнгүйг дараа нь нэмж болно.`,
      });

      router.push(`/customers/${customerId}`);

    } catch (error) {
      console.error('Error creating employee:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Ажилтан бүртгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href={`/customers/${customerId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Шинэ ажилтан бүртгэх</h1>
        <p className="text-muted-foreground">
          Бүх талбар заавал бөглөхгүй. Ганц нэг талбар (жишээ нь нэр эсвэл утас) бөглөөд хурдан нэмж, дэлгэрэнгүйг дараа нь засвар хэсгээс нэмж болно.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Овог</FormLabel>
                      <FormControl>
                        <Input placeholder="Боржигон" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Хулан" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Албан тушаал</FormLabel>
                    <FormControl>
                      <Input placeholder="Нягтлан бодогч" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="phone"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>И-мэйл</FormLabel>
                      <FormControl>
                        <Input placeholder="khulan@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Нэмэлт тэмдэглэл..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                    <Link href={`/customers/${customerId}`}>Цуцлах</Link>
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
