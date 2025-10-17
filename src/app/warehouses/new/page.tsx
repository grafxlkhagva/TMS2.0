

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Customer, Region } from '@/types';

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

const defaultGeolocation = { lat: 47.91976, lng: 106.91763 };

export default function NewWarehousePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [regions, setRegions] = React.useState<Region[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      regionId: '',
      location: '',
      geolocation: defaultGeolocation,
      conditions: '',
      contactInfo: '',
      contactName: '',
      contactPosition: '',
      customerId: '',
      note: '',
    },
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

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const customerId = values.customerId === 'no-owner' ? null : values.customerId;
      const selectedCustomer = customers.find(c => c.id === customerId);
      const customerRef = customerId ? doc(db, 'customers', customerId) : null;
      const regionRef = doc(db, 'regions', values.regionId);


      await addDoc(collection(db, 'warehouses'), {
        ...values,
        customerId: customerId,
        customerName: selectedCustomer ? selectedCustomer.name : 'Эзэмшигчгүй',
        customerRef: customerRef,
        regionRef: regionRef,
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${values.name} нэртэй агуулахыг системд бүртгэлээ.`,
      });
      
      router.push('/warehouses');

    } catch (error) {
      console.error('Error creating warehouse:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Агуулах бүртгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Шинэ агуулах бүртгэх</h1>
        <p className="text-muted-foreground">
          Агуулахын дэлгэрэнгүй мэдээллийг оруулна уу.
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            render={({ field: { onChange } }) => (
                                <LocationPicker
                                    initialCoordinates={defaultGeolocation}
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
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Link href="/warehouses">Цуцлах</Link>
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

    
