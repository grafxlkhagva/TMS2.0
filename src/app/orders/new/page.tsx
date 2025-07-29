
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { collection, getDocs, query, addDoc, serverTimestamp, where, runTransaction, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import type { Customer, CustomerEmployee } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  customerId: z.string().min(1, { message: 'Харилцагч байгууллага сонгоно уу.' }),
  employeeId: z.string().min(1, { message: 'Хариуцсан ажилтан сонгоно уу.' }),
});

type FormValues = z.infer<typeof formSchema>;

async function generateOrderNumber() {
    const counterRef = doc(db, 'counters', 'orderCounter');

    const newCount = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
            transaction.set(counterRef, { current: 1 });
            return 1;
        }
        const newCurrent = counterDoc.data().current + 1;
        transaction.update(counterRef, { current: newCurrent });
        return newCurrent;
    });

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `ORD-${year}${month}${day}-${String(newCount).padStart(4, '0')}`;
}

export default function NewOrderPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data states
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [employees, setEmployees] = React.useState<CustomerEmployee[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      employeeId: '',
    },
  });

  const watchedCustomerId = form.watch('customerId');

  React.useEffect(() => {
    async function fetchCustomers() {
      try {
        const customerSnap = await getDocs(query(collection(db, "customers")));
        setCustomers(customerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагчдын мэдээлэл татахад алдаа гарлаа.'});
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchCustomers();
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
      
      const orderNumber = await generateOrderNumber();

      const docRef = await addDoc(collection(db, 'orders'), {
        orderNumber: orderNumber,
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
      
      toast({
        title: 'Амжилттай бүртгэлээ',
        description: `${orderNumber} дугаартай шинэ захиалгыг системд бүртгэлээ.`,
      });
      
      router.push(`/orders/${docRef.id}`);

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
          Захиалагч байгууллага болон хариуцсан ажилтныг сонгоно уу.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>Захиалагчийн мэдээлэл</CardTitle>
                <CardDescription>Захиалгын дэлгэрэнгүй тээвэрлэлтийн мэдээллийг дараагийн алхамд оруулна.</CardDescription>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
                <Link href="/orders">Цуцлах</Link>
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
