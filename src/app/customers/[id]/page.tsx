'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Customer, CustomerEmployee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, User, Building, Phone, Mail, FileText, Briefcase } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function CustomerDetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) {
  return (
    <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'N/A'}</p>
        </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [employees, setEmployees] = React.useState<CustomerEmployee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;

    const fetchCustomerData = async () => {
      setIsLoading(true);
      try {
        // Fetch customer details
        const customerDocRef = doc(db, 'customers', id);
        const customerDocSnap = await getDoc(customerDocRef);

        if (customerDocSnap.exists()) {
          const data = customerDocSnap.data();
          setCustomer({
            id: customerDocSnap.id,
            ...data,
            createdAt: data.createdAt.toDate(),
          } as Customer);
        } else {
          toast({ variant: 'destructive', title: 'Алдаа', description: 'Харилцагч олдсонгүй.' });
          router.push('/customers');
          return;
        }

        // Fetch customer employees
        const employeesQuery = query(collection(db, 'customer_employees'), where('customerId', '==', id));
        const employeesSnapshot = await getDocs(employeesQuery);
        const employeesData = employeesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
            } as CustomerEmployee;
        });
        setEmployees(employeesData);

      } catch (error) {
        console.error("Error fetching customer data:", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Мэдээлэл татахад алдаа гарлаа.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, [id, router, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
            <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null; // or a not found component
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
        </Button>
        <h1 className="text-3xl font-headline font-bold">{customer.name}</h1>
        <p className="text-muted-foreground">
          Харилцагчийн дэлгэрэнгүй мэдээлэл.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Customer Details Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Байгууллагын мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CustomerDetailItem icon={Building} label="Регистрийн дугаар" value={customer.registerNumber} />
            <CustomerDetailItem icon={Briefcase} label="Үйл ажиллагааны чиглэл" value={customer.industry} />
            <CustomerDetailItem icon={Mail} label="Албан ёсны и-мэйл" value={customer.email} />
            <CustomerDetailItem icon={Phone} label="Оффисын утас" value={customer.officePhone} />
            <CustomerDetailItem icon={FileText} label="Албан ёсны хаяг" value={customer.address} />
             <CustomerDetailItem icon={FileText} label="Тэмдэглэл" value={customer.note} />
          </CardContent>
        </Card>

        {/* Employees Card */}
        <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Холбогдох ажилтнууд</CardTitle>
                    <CardDescription>{employees.length} ажилтан бүртгэлтэй байна.</CardDescription>
                </div>
                <Button asChild>
                    <Link href={`/customers/${id}/employees/new`}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Шинэ ажилтан
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Овог, нэр</TableHead>
                            <TableHead>Албан тушаал</TableHead>
                            <TableHead>И-мэйл</TableHead>
                            <TableHead>Утас</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.length > 0 ? (
                           employees.map(employee => (
                             <TableRow key={employee.id}>
                                <TableCell className="font-medium">{`${employee.lastName} ${employee.firstName}`}</TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell>{employee.email}</TableCell>
                                <TableCell>{employee.phone}</TableCell>
                             </TableRow>
                           ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    Бүртгэлтэй ажилтан олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
