
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Industry, SystemUser } from '@/types';

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

export default function NewCustomerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [industries, setIndustries] = React.useState<Industry[]>([]);
  const [systemUsers, setSystemUsers] = React.useState<SystemUser[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      registerNumber: '',
      industry: '',
      address: '',
      officePhone: '',
      email: '',
      assignedToUid: '',
      note: '',
    },
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
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.'});
      }
    };
    fetchData();
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
      const assignedUser = values.assignedToUid ? systemUsers.find(u => u.uid === values.assignedToUid) : undefined;
      const assignedToRef = assignedUser ? doc(db, 'users', assignedUser.uid) : undefined;

      const nameVal = values.name ?? '';
      const payload: Record<string, unknown> = {
        name: nameVal,
        nameLower: nameVal.toLowerCase(),
        registerNumber: values.registerNumber ?? '',
        industry: values.industry ?? '',
        address: values.address ?? '',
        officePhone: values.officePhone ?? '',
        email: values.email ?? '',
        note: values.note ?? '',
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
        createdAt: serverTimestamp(),
      };

      if (values.assignedToUid && assignedUser) {
        payload.assignedTo = {
          uid: assignedUser.uid,
          name: `${assignedUser.lastName} ${assignedUser.firstName}`,
        };
        payload.assignedToRef = assignedToRef;
      }

      await addDoc(collection(db, 'customers'), payload);

      const displayName = values.name?.trim() || values.officePhone || values.email || values.registerNumber || 'Харилцагч';
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${displayName}-ийг системд бүртгэлээ. Дэлгэрэнгүйг дараа нь нэмж болно.`,
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
                name="assignedToUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хариуцсан ажилтан</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Хариуцсан ажилтан сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {systemUsers.map(user => (
                          <SelectItem key={user.uid} value={user.uid}>
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
