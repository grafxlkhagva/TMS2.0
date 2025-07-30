
'use client';

import * as React from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const orderStatuses: OrderStatus[] = ['Pending', 'Processing', 'Completed', 'Cancelled'];

const statusTranslations: Record<OrderStatus, string> = {
    Pending: 'Хүлээгдэж буй',
    Processing: 'Боловсруулагдаж буй',
    Completed: 'Дууссан',
    Cancelled: 'Цуцлагдсан'
};


const formSchema = z.object({
    status: z.custom<OrderStatus>(val => orderStatuses.includes(val as OrderStatus), {
        message: "Хүчинтэй статус сонгоно уу."
    }),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditOrderPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = React.useState<Order | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    React.useEffect(() => {
        if (!id) return;
        const fetchOrder = async () => {
            try {
                const orderDoc = await getDoc(doc(db, 'orders', id));
                if (orderDoc.exists()) {
                    const orderData = orderDoc.data() as Order;
                    setOrder(orderData);
                    form.reset({ status: orderData.status });
                } else {
                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга олдсонгүй.' });
                    router.push('/orders');
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалгын мэдээлэл татахад алдаа гарлаа.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrder();
    }, [id, router, toast, form]);

    async function onSubmit(values: FormValues) {
        if (!id) return;
        setIsSubmitting(true);
        try {
            const orderRef = doc(db, 'orders', id);
            await updateDoc(orderRef, {
                status: values.status,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Захиалгын статус шинэчлэгдлээ.' });
            router.push(`/orders/${id}`);
        } catch (error) {
            console.error("Error updating order status:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Статус шинэчлэхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full" />
                        <div className="flex justify-end mt-4">
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
                    <Link href={`/orders/${id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Буцах
                    </Link>
                </Button>
            </div>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Захиалга засах</CardTitle>
                    <CardDescription>Захиалгын дугаар: {order?.orderNumber}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Захиалгын статус</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Статус сонгоно уу..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {orderStatuses.map(status => (
                                                    <SelectItem key={status} value={status}>
                                                        {statusTranslations[status]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" asChild>
                                    <Link href={`/orders/${id}`}>Цуцлах</Link>
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
    )
}
