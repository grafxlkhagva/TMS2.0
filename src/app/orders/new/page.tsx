
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import type { Customer, CustomerEmployee, Warehouse, ServiceType } from '@/types';
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
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const orderItemSchema = z.object({
  startWarehouseId: z.string().min(1, { message: "Ачих агуулах сонгоно уу." }),
  endWarehouseId: z.string().min(1, { message: "Хүргэх агуулах сонгоно уу." }),
  serviceTypeId: z.string().min(1, { message: "Үйлчилгээний төрөл сонгоно уу." }),
  cargoInfo: z.string().min(3, { message: "Ачааны мэдээлэл оруулна уу." }),
  deliveryDate: z.date({ required_error: "Хүргэх огноо сонгоно уу." }),
});

const formSchema = z.object({
  customerId: z.string().min(1, { message: 'Харилцагч байгууллага сонгоно уу.' }),
  employeeId: z.string().min(1, { message: 'Хариуцсан ажилтан сонгоно уу.' }),
  orderItems: z.array(orderItemSchema).min(1, { message: 'Дор хаяж нэг тээврийн зүйл нэмнэ үү.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewOrderPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data states
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [employees, setEmployees] = React.useState<CustomerEmployee[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      employeeId: '',
      orderItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems"
  });
  
  const watchedCustomerId = form.watch('customerId');

  React.useEffect(() => {
    async function fetchInitialData() {
      try {
        const [customerSnap, warehouseSnap, serviceTypeSnap] = await Promise.all([
          getDocs(query(collection(db, "customers"), orderBy("name"))),
          getDocs(query(collection(db, "warehouses"), orderBy("name"))),
          getDocs(query(collection(db, "service_types"), orderBy("name"))),
        ]);
        setCustomers(customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        setWarehouses(warehouseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse)));
        setServiceTypes(serviceTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType)));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Лавлах мэдээлэл татахад алдаа гарлаа.'});
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchInitialData();
  }, [toast]);
  
  React.useEffect(() => {
    if (watchedCustomerId) {
      async function fetchEmployees() {
        try {
          const q = query(collection(db, "customer_employees"), where("customerId", "==", watchedCustomerId));
          const querySnapshot = await getDocs(q);
          setEmployees(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerEmployee)));
          form.setValue('employeeId', '');
        } catch (error) {
           console.error("Error fetching employees:", error);
           toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтны мэдээлэл татахад алдаа гарлаа.'});
        }
      }
      fetchEmployees();
    } else {
      setEmployees([]);
    }
  }, [watchedCustomerId, form, toast]);


  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Нэвтэрч орсоны дараа захиалга бүртгэнэ үү.'});
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCustomer = customers.find(c => c.id === values.customerId);
      const selectedEmployee = employees.find(e => e.id === values.employeeId);
      
      const batch = writeBatch(db);

      // 1. Create the main order document
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, {
        customerId: values.customerId,
        customerName: selectedCustomer?.name,
        employeeId: values.employeeId,
        employeeName: `${selectedEmployee?.lastName} ${selectedEmployee?.firstName}`,
        status: 'Pending',
        createdAt: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          name: `${user.lastName} ${user.firstName}`,
        },
      });

      // 2. Create order item documents
      values.orderItems.forEach(item => {
        const orderItemRef = doc(collection(db, 'order_items'));
        batch.set(orderItemRef, {
          ...item,
          orderId: orderRef.id,
          status: 'Pending',
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
      
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `Шинэ захиалгыг системд бүртгэлээ.`,
      });
      
      router.push('/orders'); // Redirect to orders list page (to be created)

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Захиалга бүртгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">Шинэ захиалга бүртгэх</h1>
        <p className="text-muted-foreground">
          Захиалгын дэлгэрэнгүй мэдээллийг оруулна уу.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>Захиалагчийн мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Харилцагч байгууллага</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingData}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Байгууллага сонгоно уу..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Хариуцсан ажилтан</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value} disabled={!watchedCustomerId || employees.length === 0}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Ажилтан сонгоно уу..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map(employee => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.lastName} {employee.firstName} ({employee.position})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Тээврийн захиалгын зүйлс</CardTitle>
                <CardDescription>Нэг захиалгад олон тээвэрлэлтийн мэдээлэл нэмэх боломжтой.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Тээвэрлэлт #{index + 1}</h4>
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <Separator/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField
                              control={form.control}
                              name={`orderItems.${index}.startWarehouseId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ачих агуулах</FormLabel>
                                   <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingData}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Ачих агуулах сонгоно уу..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {warehouses.map(w => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`orderItems.${index}.endWarehouseId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Хүргэх агуулах</FormLabel>
                                   <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingData}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Хүргэх агуулах сонгоно уу..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {warehouses.map(w => ( <SelectItem key={w.id} value={w.id}> {w.name} </SelectItem> ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name={`orderItems.${index}.serviceTypeId`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Үйлчилгээний төрөл</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingData}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Үйлчилгээний төрөл сонгоно уу..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {serviceTypes.map(s => ( <SelectItem key={s.id} value={s.id}> {s.name} </SelectItem> ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                         <FormField
                            control={form.control}
                            name={`orderItems.${index}.deliveryDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Хүргэх огноо</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          'w-[240px] pl-3 text-left font-normal',
                                          !field.value && 'text-muted-foreground'
                                        )}
                                      >
                                        {field.value ? format(field.value, 'PPP') : ( <span>Огноо сонгох</span> )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date('1900-01-01')} initialFocus/>
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        <FormField
                            control={form.control}
                            name={`orderItems.${index}.cargoInfo`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ачааны мэдээлэл</FormLabel>
                                <FormControl>
                                <Textarea placeholder="Ачааны онцлог, хэмжээ, тоо ширхэг..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ startWarehouseId: '', endWarehouseId: '', serviceTypeId: '', cargoInfo: '', deliveryDate: new Date() })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Шинэ зүйл нэмэх
                </Button>
                {form.formState.errors.orderItems && !form.formState.errors.orderItems.root && (
                   <p className="text-sm font-medium text-destructive">{form.formState.errors.orderItems.message}</p>
                )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Цуцлах</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingData}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Захиалга үүсгэх
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
