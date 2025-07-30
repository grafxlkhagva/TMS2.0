
'use client';

import * as React from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderStatus, LoadingUnloadingResponsibility, VehicleAvailability, PaymentTerm } from '@/types';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';


const orderStatuses: OrderStatus[] = ['Pending', 'Processing', 'Completed', 'Cancelled'];
const loadingUnloadingOptions: LoadingUnloadingResponsibility[] = ['Захиалагч хариуцах', 'Тээвэрлэгч хариуцах'];
const vehicleAvailabilityOptions: VehicleAvailability[] = ['8 цаг', '12 цаг', '24 цаг', '48 цаг', '7 хоног', '14 хоног'];
const paymentTermOptions: PaymentTerm[] = ['Урьдчилгаа 30%', 'Урьдчилгаа 40%', 'Урьдчилгаа 50%', 'Тээвэрлэлт дуусаад', 'Гэрээгээр тохиролцоно'];


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
    conditions: z.object({
        loading: z.custom<LoadingUnloadingResponsibility>(),
        unloading: z.custom<LoadingUnloadingResponsibility>(),
        permits: z.object({
            roadPermit: z.boolean(),
            roadToll: z.boolean(),
        }),
        vehicleAvailability: z.custom<VehicleAvailability>(),
        paymentTerm: z.custom<PaymentTerm>(),
        insurance: z.string().min(1, "Даатгалын мэдээлэл оруулна уу."),
        additionalConditions: z.string().optional(),
    }).optional(),
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
        defaultValues: {
            conditions: {
                loading: 'Захиалагч хариуцах',
                unloading: 'Захиалагч хариуцах',
                permits: {
                    roadPermit: false,
                    roadToll: false,
                },
                vehicleAvailability: '24 цаг',
                paymentTerm: 'Гэрээгээр тохиролцоно',
                insurance: 'Оруулаагүй',
                additionalConditions: '',
            }
        }
    });

    React.useEffect(() => {
        if (!id) return;
        const fetchOrder = async () => {
            try {
                const orderDoc = await getDoc(doc(db, 'orders', id));
                if (orderDoc.exists()) {
                    const orderData = orderDoc.data() as Order;
                    setOrder(orderData);
                    form.reset({ 
                        status: orderData.status,
                        conditions: orderData.conditions || form.getValues('conditions'),
                    });
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
                conditions: values.conditions,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Захиалгын мэдээлэл шинэчлэгдлээ.' });
            router.push(`/orders/${id}`);
        } catch (error) {
            console.error("Error updating order:", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Захиалга шинэчлэхэд алдаа гарлаа.' });
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
                    <CardContent className="pt-6">
                        <Skeleton className="h-10 w-full mb-8" />
                        <Skeleton className="h-64 w-full" />
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
            <Form {...form}>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card className="max-w-4xl mx-auto">
                        <CardHeader>
                            <CardTitle>Захиалга засах</CardTitle>
                            <CardDescription>Захиалгын дугаар: {order?.orderNumber}</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>

                    <Card className="max-w-4xl mx-auto">
                         <CardHeader>
                            <CardTitle>Тээврийн нөхцөл</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="conditions.loading" render={({ field }) => ( <FormItem><FormLabel>Ачилт</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{loadingUnloadingOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="conditions.unloading" render={({ field }) => ( <FormItem><FormLabel>Буулгалт</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{loadingUnloadingOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField control={form.control} name="conditions.permits" render={() => (
                                <FormItem>
                                    <FormLabel>Зөвшөөрөл</FormLabel>
                                    <div className="flex items-center space-x-6 pt-2">
                                        <FormField control={form.control} name="conditions.permits.roadPermit" render={({ field }) => ( <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="roadPermit"/></FormControl><label htmlFor="roadPermit" className="text-sm font-medium leading-none">Замын зөвшөөрөл авна</label></FormItem> )}/>
                                        <FormField control={form.control} name="conditions.permits.roadToll" render={({ field }) => ( <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="roadToll"/></FormControl><label htmlFor="roadToll" className="text-sm font-medium leading-none">Замын хураамж тушаана</label></FormItem> )}/>
                                    </div>
                                     <FormMessage />
                                </FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="conditions.vehicleAvailability" render={({ field }) => ( <FormItem><FormLabel>ТХ-н бэлэн байдал</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{vehicleAvailabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="conditions.paymentTerm" render={({ field }) => ( <FormItem><FormLabel>Төлбөрийн нөхцөл</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{paymentTermOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                            </div>
                            <FormField control={form.control} name="conditions.insurance" render={({ field }) => ( <FormItem><FormLabel>Даатгал</FormLabel><FormControl><Input placeholder="Даатгалын мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="conditions.additionalConditions" render={({ field }) => ( <FormItem><FormLabel>Нэмэлт нөхцөл</FormLabel><FormControl><Textarea placeholder="Нэмэлт нөхцөлийн мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2 max-w-4xl mx-auto">
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
        </div>
    )
}
