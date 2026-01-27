
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Customer, Industry, SystemUser } from '@/types';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().optional(),
  registerNumber: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  officePhone: z.string().optional(),
  email: z.string().optional(),
  assignedToUid: z.string().optional(),
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
  const [industries, setIndustries] = React.useState<Industry[]>([]);
  const [systemUsers, setSystemUsers] = React.useState<SystemUser[]>([]);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const industriesQuery = query(collection(db, "industries"), orderBy("name"));
        const usersQuery = query(collection(db, "users"), orderBy("firstName"));
        
        const [industriesSnapshot, usersSnapshot] = await Promise.all([
            getDocs(industriesQuery),
            getDocs(usersQuery),
        ]);

        const industriesData = industriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Industry));
        setIndustries(industriesData);
        
        const usersData = usersSnapshot.docs.map(doc => doc.data() as SystemUser);
        setSystemUsers(usersData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Хамааралтай мэдээлэл татахад алдаа гарлаа.'});
      }
    };
    fetchData();
  }, [toast]);

  React.useEffect(() => {
    if (!id) return;
    const fetchCustomer = async () => {
        try {
            const docRef = doc(db, 'customers', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Customer;
                form.reset({ ...data, assignedToUid: data.assignedTo?.uid });
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
      const assignedUser = systemUsers.find(u => u.uid === values.assignedToUid);
      const assignedToRef = assignedUser ? doc(db, 'users', assignedUser.uid) : undefined;
      
      const { assignedToUid, ...restOfValues } = values;
      const nameVal = restOfValues.name ?? '';

      await updateDoc(customerRef, {
        ...restOfValues,
        nameLower: nameVal.toLowerCase(),
        assignedTo: {
            uid: assignedUser?.uid,
            name: `${assignedUser?.lastName} ${assignedUser?.firstName}`,
        },
        assignedToRef: assignedToRef,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Амжилттай шинэчиллээ',
        description: `${values.name || 'Харилцагчийн'} мэдээллийг шинэчиллээ.`,
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
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
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
                       <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Чиглэл сонгоно уу..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((industry, index) => (
                            <SelectItem key={industry.id || `industry-${index}`} value={industry.name}>
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
                name="assignedToUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хариуцсан ажилтан</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Хариуцсан ажилтан сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {systemUsers.map((user, index) => (
                          <SelectItem key={user.uid || `user-${index}`} value={user.uid}>
                            {user.lastName} {user.firstName}
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
