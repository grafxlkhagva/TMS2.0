'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import type { CustomerEmployee } from '@/types';
import { customerService } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

interface CustomerEmployeesListProps {
    customerId: string;
}

export function CustomerEmployeesList({ customerId }: CustomerEmployeesListProps) {
    const [employees, setEmployees] = React.useState<CustomerEmployee[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [employeeToDelete, setEmployeeToDelete] = React.useState<CustomerEmployee | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        loadEmployees();
    }, [customerId]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await customerService.getCustomerEmployees(customerId);
            setEmployees(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтны жагсаалт авахад алдаа гарлаа.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmployee = async () => {
        if (!employeeToDelete) return;
        setIsDeleting(true);
        try {
            await customerService.deleteEmployee(employeeToDelete.id);
            setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
            toast({ title: 'Амжилттай', description: `${employeeToDelete.firstName} ажилтныг устгалаа.` });
        } catch (error) {
            console.error("Error deleting employee:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтан устгахад алдаа гарлаа.' });
        } finally {
            setIsDeleting(false);
            setEmployeeToDelete(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Холбогдох ажилтнууд</CardTitle>
                        <CardDescription>{employees.length} ажилтан бүртгэлтэй байна.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href={`/customers/${customerId}/employees/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
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
                                <TableHead className="text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Уншиж байна...
                                    </TableCell>
                                </TableRow>
                            ) : employees.length > 0 ? (
                                employees.map(employee => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium">{`${employee.lastName} ${employee.firstName}`}</TableCell>
                                        <TableCell>{employee.position}</TableCell>
                                        <TableCell>{employee.email}</TableCell>
                                        <TableCell>{employee.phone}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/customers/${customerId}/employees/${employee.id}/edit`}>
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
        </>
    );
}
