
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Warehouse, Customer, Region } from '@/types';

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
import LocationPicker from '@/components/location-picker';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Агуулахын нэр дор хаяж 2 үсэгтэй байх ёстой.' }),
  regionId: z.string().min(1, { message: 'Бүс нутаг сонгоно уу.' }),
  location: z.string().min(5, { message: 'Байршил сонгоно уу.' }),
   geolocation: z.object({
      lat: z.number(),
      lng: z.number(),
  }),
  conditions: z.string().min(5, { message: 'Нөхцөлийн мэдээлэл дор хаяж 5 тэмдэгттэй байх ёстой.' }),
  contactInfo: z.string().min(5, { message: 'Холбоо барих мэдээлэл дор хаяж 5 тэмдэгттэй байх ёстой.' }),
  contactName: z.string().optional(),
  contactPosition: z.string().optional(),
  customerId: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditWarehousePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [warehouseName, setWarehouseName] = React.useState('');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [regions, setRegions] = React.useState<Region[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  React.useEffect(() => {
     const fetchRelatedData = async () => {
      try {
        const customersQuery = query(collection(db, "customers"), orderBy("name"));
        const regionsQuery = query(collection(db, "regions"), orderBy("name"));

        const [customersSnapshot, regionsSnapshot] = await Promise.all([
            getDocs(customersQuery),
            getDocs(regionsQuery)
        ]);

        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);

        const regionsData = regionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Region));
        setRegions(regionsData);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Хамааралтай мэдээлэл татахад алдаа гарлаа.'});
      }
    };
    fetchRelatedData();
  }, [toast]);

  React.useEffect(() => {
    if (!id) return;
    const fetchWarehouse = async () => {
        try {
            const docRef = doc(db, 'warehouses', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Warehouse;
                form.reset({
                  ...data,
                  contactName: data.contactName || '',
                  contactPosition: data.contactPosition || '',
                  customerId: data.customerId || 'no-owner',
                  note: data.note || '',
                });
                setWarehouseName(data.name);
            } else {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Агуулах олдсонгүй.' });
                router.push(`/warehouses`);
            }
        } catch (error) {
            console.error("Error fetching warehouse:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Агуулахын мэдээлэл татахад алдаа гарлаа.'});
        } finally {
            setIsLoading(false);
        }
    };
    fetchWarehouse();
  }, [id, router, toast, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const warehouseRef = doc(db, 'warehouses', id);
      const customerId = values.customerId === 'no-owner' ? undefined : values.customerId;
      const selectedCustomer = customers.find(c => c.id === customerId);
      
      await updateDoc(warehouseRef, {
        ...values,
        customerId: customerId,
        customerName: selectedCustomer ? selectedCustomer.name : 'Эзэмшигчгүй',
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'Амжилттай шинэчиллээ',
        description: `${values.name} нэртэй агуулахын мэдээллийг шинэчиллээ.`,
      });
      
      router.push(`/warehouses/${id}`);

    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Агуулах шинэчлэхэд алдаа гарлаа. Та дахин оролдоно уу.',
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
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-40 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
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
             <Link href={`/warehouses/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Буцах
             </Link>
        </Button>
        <h1 className="text-3xl font-headline font-bold">Мэдээлэл засах: {warehouseName}</h1>
        <p className="text-muted-foreground">
          Агуулахын мэдээллийг эндээс засаж шинэчилнэ үү.
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
                      <FormLabel>Агуулахын нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Нарны агуулах" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Бүс нутаг</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Бүс нутаг сонгоно уу..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions.map(region => (
                            <SelectItem key={region.id} value={region.id}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Агуулахын байршил</FormLabel>
                      <FormControl>
                        <Controller
                            control={form.control}
                            name="location"
                            render={({ field: { onChange, value } }) => (
                                <LocationPicker
                                    initialValue={value}
                                    initialCoordinates={form.getValues('geolocation')}
                                    onLocationSelect={(address, latLng) => {
                                        onChange(address);
                                        form.setValue('geolocation', latLng);
                                        form.clearErrors('location');
                                    }}
                                />
                            )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
               <FormField
                control={form.control}
                name="conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ачих буулгах нөхцөл</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ачааг зөвхөн ажлын цагаар хүлээн авна..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Холбоо барих хүний нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Д.Дорж" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="contactPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Албан тушаал</FormLabel>
                      <FormControl>
                        <Input placeholder="Ахлах менежер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Холбоо барих мэдээлэл (Утас, и-мэйл)</FormLabel>
                    <FormControl>
                      <Input placeholder="Утас: 88XXXXXX, Мэйл: info@warehouse.mn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эзэмшигч байгууллага (Сонголттой)</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Эзэмшигч сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-owner">Эзэмшигчгүй</SelectItem>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
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
                    <FormLabel>Нэмэлт тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Нэмэлт тэмдэглэл..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                    <Link href={`/warehouses/${id}`}>Цуцлах</Link>
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
