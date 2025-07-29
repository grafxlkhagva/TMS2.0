'use client';

import * as React from 'react';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Customer, CustomerEmployee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, User, Building, Phone, Mail, FileText, Briefcase, Edit, Trash2, Camera, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
  const [employeeToDelete, setEmployeeToDelete] = React.useState<CustomerEmployee | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const fetchCustomerData = React.useCallback(async () => {
    if (!id) return;
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
  }, [id, router, toast]);

  React.useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);
  
  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'customer_employees', employeeToDelete.id));
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
      toast({ title: 'Амжилттай', description: `${employeeToDelete.firstName} ажилтныг устгалаа.`});
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтан устгахад алдаа гарлаа.'});
    } finally {
      setIsDeleting(false);
      setEmployeeToDelete(null);
    }
  };
  
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `customer_logos/${id}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const customerDocRef = doc(db, 'customers', id);
      await updateDoc(customerDocRef, { logoUrl: downloadURL });
      
      setCustomer(prev => prev ? { ...prev, logoUrl: downloadURL } : null);
      
      toast({ title: 'Амжилттай', description: 'Байгууллагын логог шинэчиллээ.'});
    } catch (error) {
       console.error("Error uploading logo:", error);
       toast({ variant: 'destructive', title: 'Алдаа', description: 'Лого оруулахад алдаа гарлаа.'});
    } finally {
      setIsUploading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
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
        <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border">
                <AvatarImage src={customer.logoUrl} alt={customer.name} />
                <AvatarFallback className="text-2xl">
                    {customer.name?.charAt(0)}
                </AvatarFallback>
            </Avatar>
            <div>
                 <h1 className="text-3xl font-headline font-bold">{customer.name}</h1>
                <p className="text-muted-foreground">
                  Харилцагчийн дэлгэрэнгүй мэдээлэл.
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Customer Details Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Байгууллагын мэдээлэл</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
             <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                {isUploading ? <Upload className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Лого солих
            </Button>
            <CustomerDetailItem icon={Building} label="Регистрийн дугаар" value={customer.registerNumber} />
            <CustomerDetailItem icon={Briefcase} label="Үйл ажиллагааны чиглэл" value={customer.industry} />
            <CustomerDetailItem icon={Mail} label="Албан ёсны и-мэйл" value={customer.email} />
            <CustomerDetailItem icon={Phone} label="Оффисын утас" value={customer.officePhone} />
            <CustomerDetailItem icon={FileText} label="Албан ёсны хаяг" value={customer.address} />
            <CustomerDetailItem icon={User} label="Бүртгэсэн ажилтан" value={customer.createdBy?.name} />
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
                            <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
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
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/customers/${id}/employees/${employee.id}/edit`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setEmployeeToDelete(employee)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                             </TableRow>
                           ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Бүртгэлтэй ажилтан олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                        "{employeeToDelete?.firstName}" нэртэй ажилтныг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEmployee} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? "Устгаж байна..." : "Устгах"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
