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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MaintenanceRecord, MaintenanceType, Vehicle } from '@/types';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const maintenanceTypes: MaintenanceType[] = ['Preventive', 'Repair', 'Inspection', 'TireChange', 'Other'];
const maintenanceStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'] as const;

export const maintenanceFormSchema = z.object({
    vehicleId: z.string().min(1, "Тээврийн хэрэгсэл сонгоно уу."),
    type: z.enum(['Preventive', 'Repair', 'Inspection', 'TireChange', 'Other'] as [string, ...string[]]),
    date: z.date({ required_error: "Огноо сонгоно уу." }),
    odometer: z.coerce.number().min(0, "Гүйлт эерэг тоо байна."),
    cost: z.coerce.number().min(0, "Зардал эерэг тоо байна."),
    garageName: z.string().optional(),
    description: z.string().min(1, "Тайлбар оруулна уу."),
    status: z.enum(maintenanceStatuses),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

interface MaintenanceFormProps {
    initialData?: MaintenanceRecord;
    onSubmit: (values: MaintenanceFormValues, imageFiles: File[], removedImageUrls: string[]) => Promise<void>;
    isSubmitting: boolean;
    preselectedVehicleId?: string;
}

export function MaintenanceForm({ initialData, onSubmit, isSubmitting, preselectedVehicleId }: MaintenanceFormProps) {
    const { toast } = useToast();
    const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
    const [imageFiles, setImageFiles] = React.useState<File[]>([]);
    const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(initialData?.attachments || []);
    const [removedImageUrls, setRemovedImageUrls] = React.useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<MaintenanceFormValues>({
        resolver: zodResolver(maintenanceFormSchema),
        defaultValues: {
            vehicleId: initialData?.vehicleId || preselectedVehicleId || '',
            type: initialData?.type || 'Preventive',
            date: initialData?.date ? new Date(initialData.date) : new Date(),
            odometer: initialData?.odometer || 0,
            cost: initialData?.cost || 0,
            garageName: initialData?.garageName || '',
            description: initialData?.description || '',
            status: initialData?.status || 'Completed',
        },
    });

    React.useEffect(() => {
        const fetchVehicles = async () => {
            if (!db) return;
            try {
                const q = query(collection(db, 'vehicles'), orderBy('licensePlate'));
                const querySnapshot = await getDocs(q);
                const vehiclesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
                setVehicles(vehiclesData);
            } catch (error) {
                console.error("Error fetching vehicles:", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Тээврийн хэрэгсэл татахад алдаа гарлаа.' });
            }
        };
        fetchVehicles();
    }, [toast]);

    // Watch vehicle selection to autofill odometer if it's a new record
    const watchedVehicleId = form.watch('vehicleId');
    React.useEffect(() => {
        if (!initialData && watchedVehicleId) {
            const vehicle = vehicles.find(v => v.id === watchedVehicleId);
            if (vehicle && vehicle.odometer) {
                const currentVal = form.getValues('odometer');
                if (currentVal === 0) { // Only autofill if not already entered
                    form.setValue('odometer', vehicle.odometer);
                }
            }
        }
    }, [watchedVehicleId, vehicles, initialData, form]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);
        }
    };

    const removeNewImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (url: string) => {
        setExistingImageUrls(prev => prev.filter(u => u !== url));
        setRemovedImageUrls(prev => [...prev, url]);
    };

    const handleSubmit = (values: MaintenanceFormValues) => {
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData || !!preselectedVehicleId}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Сонгох..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {vehicles.map((vehicle) => (
                                            <SelectItem key={vehicle.id} value={vehicle.id}>
                                                {vehicle.licensePlate} - {vehicle.modelName}
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
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Засварын төрөл</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Сонгох..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {maintenanceTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                    format(field.value, "PP")
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
                                                date > new Date("2100-01-01") || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                            captionLayout="dropdown"
                                            fromYear={2000}
                                            toYear={new Date().getFullYear() + 5}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Төлөв</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Сонгох..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {maintenanceStatuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="odometer" render={({ field }) => (<FormItem><FormLabel>Гүйлт (км)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Нийт зардал (₮)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <FormField control={form.control} name="garageName" render={({ field }) => (<FormItem><FormLabel>Гүйцэтгэгч / Гараж</FormLabel><FormControl><Input placeholder="Internal or Service Center Name" {...field} /></FormControl><FormMessage /></FormItem>)} />

                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Тайлбар / Хийгдсэн ажлууд</FormLabel><FormControl><Textarea placeholder="Тайлбар бичих..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                {/* Images */}
                <div className="space-y-4">
                    <FormLabel>Зураг / Баримт</FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                        {existingImageUrls.map((src, index) => (
                            <div key={src} className="relative aspect-square">
                                <Image src={src} alt={`Existing ${index + 1}`} fill className="object-cover rounded-md border" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeExistingImage(src)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        {imageFiles.map((file, index) => (
                            <div key={index} className="relative aspect-square">
                                <Image src={URL.createObjectURL(file)} alt={`New ${index + 1}`} fill className="object-cover rounded-md border" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeNewImage(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" className="aspect-square w-full h-full flex flex-col items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs mt-1 text-muted-foreground">Зураг нэмэх</span>
                        </Button>
                        <Input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                    </div>
                </div>


                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => window.history.back()}>
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Hадгалах
                    </Button>
                </div>
            </form>
        </Form>
    );
}
