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
import type { CustomerEmployee } from '@/types';

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
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  lastName: z.string().min(2, { message: 'Овог дор хаяж 2 үсэгтэй байх ёстой.' }),
  firstName: z.string().min(2, { message: 'Нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  position: z.string().min(2, { message: 'Албан тушаал дор хаяж 2 үсэгтэй байх ёстой.' }),
  phone: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  email: z.string().email({ message: 'Хүчинтэй и-мэйл хаяг оруулна уу.' }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditEmployeePage() {
  const { id: customerId, employeeId } = useParams<{ id: string, employeeId: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
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

  React.useEffect(() => {
    if (!employeeId) return;
    const fetchEmployee = async () => {
        try {
            const docRef = doc(db, 'customer_employees', employeeId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as CustomerEmployee;
                form.reset(data);
            } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтан олдсонгүй.' });
                router.push(`/customers/${customerId}`);
            }
        } catch (error) {
            console.error("Error fetching employee:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтны мэдээлэл татахад алдаа гарлаа.'});
        } finally {
            setIsLoading(false);
        }
    };
    fetchEmployee();
  }, [employeeId, customerId, router, toast, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const employeeRef = doc(db, 'customer_employees', employeeId);
      await updateDoc(employeeRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Амжилттай шинэчиллээ',
        description: `${values.firstName} нэртэй ажилтны мэдээллийг шинэчиллээ.`,
      });
      
      router.push(`/customers/${customerId}`);

    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Ажилтан шинэчлэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
        <div className="container mx-auto py-6">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-6" />
            <Card>
                <CardContent className="pt-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
                </CardContent>
            </Card>
        </div>
    )
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
        <h1 className="text-3xl font-headline font-bold">Ажилтны мэдээлэл засах</h1>
        <p className="text-muted-foreground">
          Харилцагчийн ажилтны мэдээллийг засах.
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

    