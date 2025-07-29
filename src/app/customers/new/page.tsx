
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Industry } from '@/types';

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
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Харилцагчийн нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  registerNumber: z.string().min(7, { message: 'Регистрийн дугаар буруу байна.' }),
  industry: z.string().min(1, { message: 'Үйл ажиллагааны чиглэл сонгоно уу.' }),
  address: z.string().min(5, { message: 'Хаяг дор хаяж 5 тэмдэгттэй байх ёстой.' }),
  officePhone: z.string().min(8, { message: 'Утасны дугаар буруу байна.' }),
  email: z.string().email({ message: 'Хүчинтэй и-мэйл хаяг оруулна уу.' }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewCustomerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [industries, setIndustries] = React.useState<Industry[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      registerNumber: '',
      industry: '',
      address: '',
      officePhone: '',
      email: '',
      note: '',
    },
  });

  React.useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const q = query(collection(db, "industries"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        const industriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Industry));
        setIndustries(industriesData);
      } catch (error) {
        console.error("Error fetching industries:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Үйл ажиллагааны чиглэл татахад алдаа гарлаа.'});
      }
    };
    fetchIndustries();
  }, [toast]);

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Нэвтэрч орсоны дараа харилцагч бүртгэнэ үү.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'customers'), {
        ...values,
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${values.name} нэртэй харилцагчийг системд бүртгэлээ.`,
      });
      
      router.push('/customers');

    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Харилцагч бүртгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Шинэ харилцагч бүртгэх</h1>
        <p className="text-muted-foreground">
          Харилцагчийн дэлгэрэнгүй мэдээллийг оруулна уу.
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
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Чиглэл сонгоно уу..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map(industry => (
                            <SelectItem key={industry.id} value={industry.name}>
                              {industry.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Link href="/customers">Цуцлах</Link>
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
