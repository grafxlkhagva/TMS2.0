
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Customer } from '@/types';

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
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Харилцагчийн нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  registerNumber: z.string().min(7, { message: 'Регистрийн дугаар буруу байна.' }),
  industry: z.string().min(2, { message: 'Үйл ажиллагааны чиглэл дор хаяж 2 үсэгтэй байх ёстой.' }),
  address: z.string().min(5, { message: 'Хаяг дор хаяж 5 тэмдэгттэй байх ёстой.' }),
  officePhone: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  email: z.string().email({ message: 'Хүчинтэй и-мэйл хаяг оруулна уу.' }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [customerName, setCustomerName] = React.useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (!id) return;
    const fetchCustomer = async () => {
        try {
            const docRef = doc(db, 'customers', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Customer;
                form.reset(data);
                setCustomerName(data.name);
            } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагч олдсонгүй.' });
                router.push(`/customers`);
            }
        } catch (error) {
            console.error("Error fetching customer:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагчийн мэдээлэл татахад алдаа гарлаа.'});
        } finally {
            setIsLoading(false);
        }
    };
    fetchCustomer();
  }, [id, router, toast, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Амжилттай шинэчиллээ',
        description: `${values.name} нэртэй харилцагчийн мэдээллийг шинэчиллээ.`,
      });
      
      router.push(`/customers/${id}`);

    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Харилцагч шинэчлэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
        <div className="container mx-auto py-6">
             <div className="mb-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Skeleton className="h-4 w-1/2" />
             </div>
            <Card>
                <CardContent className="pt-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                     <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
                    <div className="flex justify-end gap-2">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
             <Link href={`/customers/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Мэдээлэл засах: {customerName}</h1>
        <p className="text-muted-foreground">
          Харилцагчийн мэдээллийг эндээс засаж шинэчилнэ үү.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Харилцагчийн нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Түмэн Тех" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="registerNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Регистрийн дугаар</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Үйл ажиллагааны чиглэл</FormLabel>
                    <FormControl>
                      <Input placeholder="Програм хангамж" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Албан ёсны хаяг</FormLabel>
                    <FormControl>
                      <Input placeholder="Улаанбаатар, Сүхбаатар дүүрэг, 1-р хороо..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="officePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Оффисын утас</FormLabel>
                      <FormControl>
                        <Input placeholder="7711-XXXX" {...field} />
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
                      <FormLabel>Албан ёсны и-мэйл</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@company.com" {...field} />
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
                    <Link href={`/customers/${id}`}>Цуцлах</Link>
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
