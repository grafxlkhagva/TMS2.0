'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, CalendarIcon, Camera, X } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { FuelLog, Vehicle } from '@/types';
import { getDocs, query, collection, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export const fuelFormSchema = z.object({
    vehicleId: z.string().min(1, "Тээврийн хэрэгсэл сонгоно уу."),
    date: z.date({ required_error: "Огноо сонгоно уу." }),
    odometer: z.coerce.number().min(0, "Гүйлт эерэг тоо байна."),
    liters: z.coerce.number().min(0.1, "Литр оруулна уу."),
    pricePerLiter: z.coerce.number().min(0, "Нэгж үнэ оруулна уу."),
    totalCost: z.coerce.number().min(0, "Нийт үнэ."),
    stationName: z.string().optional(),
    fullTank: z.boolean().default(false),
    notes: z.string().optional(),
});

export type FuelFormValues = z.infer<typeof fuelFormSchema>;

interface FuelFormProps {
    initialData?: FuelLog;
    vehicleId?: string | null;
    onSubmit: (values: FuelFormValues, imageFiles: File[], removedImageUrls: string[]) => Promise<void>;
    isSubmitting: boolean;
}

export function FuelForm({ initialData, vehicleId, onSubmit, isSubmitting }: FuelFormProps) {
    const { toast } = useToast();
    const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);

    // Image handling
    const [imageFiles, setImageFiles] = React.useState<File[]>([]);
    const [existingImageUrl, setExistingImageUrl] = React.useState<string | null>(initialData?.imageUrl || null);
    const [removedImageUrls, setRemovedImageUrls] = React.useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<FuelFormValues>({
        resolver: zodResolver(fuelFormSchema),
        defaultValues: {
            vehicleId: initialData?.vehicleId || vehicleId || '',
            date: initialData?.date ? new Date(initialData.date) : new Date(),
            odometer: initialData?.odometer || 0,
            liters: initialData?.liters || 0,
            pricePerLiter: initialData?.pricePerLiter || 0,
            totalCost: initialData?.totalCost || 0,
            stationName: initialData?.stationName || '',
            fullTank: initialData?.fullTank || false,
            notes: initialData?.notes || '',
        },
    });

    React.useEffect(() => {
        const fetchVehicles = async () => {
            if (!db) return;
            try {
                const snap = await getDocs(query(collection(db, 'vehicles'), orderBy('licensePlate')));
                setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
            } catch (error) {
                console.error("Error fetching vehicles", error);
            }
        };
        fetchVehicles();
    }, []);

    // Helper to auto-calculate total cost
    const liters = form.watch('liters');
    const price = form.watch('pricePerLiter');

    React.useEffect(() => {
        if (liters && price) {
            const calculated = liters * price;
            // Only update if not manually edited recently? Or just override.
            // Be simple: always override totalCost if liters/price change.
            form.setValue('totalCost', parseFloat(calculated.toFixed(2)));
        }
    }, [liters, price, form]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFiles([e.target.files[0]]); // Limit to 1 image for now
        }
    };

    const removeNewImage = () => {
        setImageFiles([]);
    };

    const removeExistingImage = () => {
        if (existingImageUrl) {
            setRemovedImageUrls([existingImageUrl]);
            setExistingImageUrl(null);
        }
    };

    const handleSubmit = (values: FuelFormValues) => {
        onSubmit(values, imageFiles, removedImageUrls);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="vehicleId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Тээврийн хэрэгсэл</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData || !!vehicleId}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Сонгох..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {vehicles.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.licensePlate} {v.makeName ? `- ${v.makeName}` : ''}
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
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Огноо</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PP HH:mm")
                                                ) : (
                                                    <span>Огноо сонгох</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                            captionLayout="dropdown"
                                            fromYear={2020}
                                            toYear={new Date().getFullYear()}
                                        />
                                        <div className="p-3 border-t">
                                            <Input
                                                type="time"
                                                value={field.value ? format(field.value, "HH:mm") : "00:00"}
                                                onChange={(e) => {
                                                    const [hours, minutes] = e.target.value.split(':');
                                                    const newDate = new Date(field.value || new Date());
                                                    newDate.setHours(parseInt(hours), parseInt(minutes));
                                                    field.onChange(newDate);
                                                }}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="odometer"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Гүйлт (км)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>Тухайн үеийн гүйлт.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="stationName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Колонк (Station)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Сод Монгол, Петровис..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="fullTank"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Дүүргэсэн эсэх
                                    </FormLabel>
                                    <FormDescription>
                                        Банк дүүргэсэн үед идэвхжүүлээрэй.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-muted/50 rounded-lg">
                    <FormField
                        control={form.control}
                        name="liters"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Литр</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="pricePerLiter"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Нэгж үнэ (₮)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="1" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="totalCost"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Нийт үнэ (₮)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="1" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <FormLabel>Баримтын зураг</FormLabel>
                    <div className="flex gap-4">
                        {existingImageUrl && (
                            <div className="relative w-32 h-32">
                                <Image src={existingImageUrl} alt="Receipt" fill className="object-cover rounded-md border" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeExistingImage}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        {imageFiles.length > 0 && (
                            <div className="relative w-32 h-32">
                                <Image src={URL.createObjectURL(imageFiles[0])} alt="New Receipt" fill className="object-cover rounded-md border" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeNewImage}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        {(!existingImageUrl && imageFiles.length === 0) && (
                            <Button type="button" variant="outline" className="w-32 h-32 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Зураг оруулах</span>
                            </Button>
                        )}
                        <Input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Тэмдэглэл</FormLabel>
                            <FormControl>
                                <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => window.history.back()}>
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Хадгалах
                    </Button>
                </div>
            </form>
        </Form>
    );
}
