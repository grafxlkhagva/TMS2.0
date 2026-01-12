'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, Camera, X, CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

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
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleType, TrailerType, VehicleMake, VehicleModel } from '@/types';
import QuickAddDialog, { type QuickAddDialogProps } from '@/components/quick-add-dialog';
import { getDocs, query, collection, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const fuelTypes = ['Diesel', 'Gasoline', 'Electric', 'Hybrid'] as const;
const transmissionTypes = ['Manual', 'Automatic', 'CVT', 'DCT'] as const;
const mongolianAlphabet = [
    'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ү', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'
];

export const vehicleFormSchema = z.object({
    makeId: z.string().min(1, "Үйлдвэрлэгч сонгоно уу."),
    modelId: z.string().min(1, "Загвар сонгоно уу."),
    year: z.coerce.number().min(1980, "Оноо зөв оруулна уу.").max(new Date().getFullYear() + 1, "Оноо зөв оруулна уу."),
    importedYear: z.coerce.number().min(1980, "Оноо зөв оруулна уу.").max(new Date().getFullYear() + 1, "Оноо зөв оруулна уу."),
    licensePlateDigits: z.string().length(4, "4 оронтой тоо оруулна уу.").regex(/^[0-9]{4}$/, "Зөвхөн тоо оруулна уу."),
    licensePlateChar1: z.string().min(1, "Үсэг сонгоно уу."),
    licensePlateChar2: z.string().min(1, "Үсэг сонгоно уу."),
    licensePlateChar3: z.string().min(1, "Үсэг сонгоно уу."),
    trailerLicensePlateDigits: z.string().optional(),
    trailerLicensePlateChar1: z.string().optional(),
    trailerLicensePlateChar2: z.string().optional(),
    vin: z.string().min(1, "Арлын дугаарыг оруулна уу."),
    vehicleTypeId: z.string().min(1, "Машины төрөл сонгоно уу."),
    trailerTypeId: z.string().min(1, "Тэвшний төрөл сонгоно уу."),
    capacity: z.string().min(1, "Даацын мэдээллийг оруулна уу."),
    fuelType: z.enum(fuelTypes),
    notes: z.string().optional(),

    // New Fields
    odometer: z.coerce.number().min(0, "Гүйлт эерэг тоо байна.").optional(),
    specs: z.object({
        tankCapacity: z.coerce.number().optional(),
        transmission: z.enum(transmissionTypes).optional(),
        axleConfig: z.string().optional(),
        engineType: z.string().optional(),
    }).optional(),
    dates: z.object({
        purchase: z.date().optional(),
        warrantyExpiry: z.date().optional(),
        registrationExpiry: z.date().optional(),
        insuranceExpiry: z.date().optional(),
        roadPermitExpiry: z.date().optional(),
        inspectionExpiry: z.date().optional(),
    }).optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
    initialData?: Vehicle;
    onSubmit: (values: VehicleFormValues, imageFiles: File[], removedImageUrls: string[]) => Promise<void>;
    isSubmitting: boolean;
}

export function VehicleForm({ initialData, onSubmit, isSubmitting }: VehicleFormProps) {
    const { toast } = useToast();
    const [vehicleTypes, setVehicleTypes] = React.useState<VehicleType[]>([]);
    const [trailerTypes, setTrailerTypes] = React.useState<TrailerType[]>([]);
    const [makes, setMakes] = React.useState<VehicleMake[]>([]);
    const [models, setModels] = React.useState<VehicleModel[]>([]);
    const [filteredModels, setFilteredModels] = React.useState<VehicleModel[]>([]);
    const [dialogProps, setDialogProps] = React.useState<Omit<QuickAddDialogProps, 'onClose'> | null>(null);

    const [imageFiles, setImageFiles] = React.useState<File[]>([]);
    const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(initialData?.imageUrls || []);
    const [removedImageUrls, setRemovedImageUrls] = React.useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleFormSchema),
        defaultValues: {
            makeId: initialData?.makeId || '',
            modelId: initialData?.modelId || '',
            year: initialData?.year || new Date().getFullYear(),
            importedYear: initialData?.importedYear || new Date().getFullYear(),
            licensePlateDigits: initialData?.licensePlateDigits || (initialData?.licensePlate ? initialData.licensePlate.substring(0, 4) : ''),
            licensePlateChar1: initialData?.licensePlateChars?.[0] || '',
            licensePlateChar2: initialData?.licensePlateChars?.[1] || '',
            licensePlateChar3: initialData?.licensePlateChars?.[2] || '',
            trailerLicensePlateDigits: initialData?.trailerLicensePlateDigits || '',
            trailerLicensePlateChar1: initialData?.trailerLicensePlateChars?.[0] || '',
            trailerLicensePlateChar2: initialData?.trailerLicensePlateChars?.[1] || '',
            vin: initialData?.vin || '',
            vehicleTypeId: initialData?.vehicleTypeId || '',
            trailerTypeId: initialData?.trailerTypeId || '',
            capacity: initialData?.capacity || '',
            fuelType: initialData?.fuelType || 'Diesel',
            notes: initialData?.notes || '',
            odometer: initialData?.odometer,
            specs: {
                tankCapacity: initialData?.specs?.tankCapacity,
                transmission: initialData?.specs?.transmission as any, // Cast to avoid strict enum check on empty
                axleConfig: initialData?.specs?.axleConfig,
                engineType: initialData?.specs?.engineType,
            },
            dates: {
                purchase: initialData?.dates?.purchase ? new Date(initialData.dates.purchase) : undefined,
                warrantyExpiry: initialData?.dates?.warrantyExpiry ? new Date(initialData.dates.warrantyExpiry) : undefined,
                registrationExpiry: initialData?.dates?.registrationExpiry ? new Date(initialData.dates.registrationExpiry) : undefined,
                insuranceExpiry: initialData?.dates?.insuranceExpiry ? new Date(initialData.dates.insuranceExpiry) : undefined,
                roadPermitExpiry: initialData?.dates?.roadPermitExpiry ? new Date(initialData.dates.roadPermitExpiry) : undefined,
                inspectionExpiry: initialData?.dates?.inspectionExpiry ? new Date(initialData.dates.inspectionExpiry) : undefined,
            }
        },
    });

    const watchedMakeId = form.watch('makeId');

    React.useEffect(() => {
        const fetchDropdownData = async () => {
            if (!db) return;
            try {
                const [vehicleTypeSnap, trailerTypeSnap, makesSnapshot, modelsSnapshot] = await Promise.all([
                    getDocs(query(collection(db, "vehicle_types"), orderBy("name"))),
                    getDocs(query(collection(db, "trailer_types"), orderBy("name"))),
                    getDocs(query(collection(db, 'vehicle_makes'), orderBy('name'))),
                    getDocs(query(collection(db, 'vehicle_models'), orderBy('name')))
                ]);
                setVehicleTypes(vehicleTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType)));
                setTrailerTypes(trailerTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrailerType)));
                setMakes(makesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleMake)));
                setModels(modelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleModel)));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Лавлах сангийн мэдээлэл татахад алдаа гарлаа.' });
            }
        }
        fetchDropdownData();
    }, [toast]);

    React.useEffect(() => {
        if (watchedMakeId) {
            setFilteredModels(models.filter(model => model.makeId === watchedMakeId));
            // Only reset if loading initially or changing
            const currentModel = models.find(m => m.id === form.getValues('modelId'));
            if (currentModel && currentModel.makeId !== watchedMakeId) {
                form.setValue('modelId', '');
            }
        } else {
            setFilteredModels([]);
        }
    }, [watchedMakeId, models, form]);

    const handleQuickAdd = (type: 'vehicle_types' | 'trailer_types', formField: 'vehicleTypeId' | 'trailerTypeId') => {
        setDialogProps({
            open: true,
            collectionName: type,
            title: `Шинэ ${type === 'vehicle_types' ? 'машины төрөл' : 'тэвшний төрөл'} нэмэх`,
            onSuccess: (newItem) => {
                if (type === 'vehicle_types') {
                    setVehicleTypes(prev => [...prev, newItem as VehicleType]);
                } else {
                    setTrailerTypes(prev => [...prev, newItem as TrailerType]);
                }
                form.setValue(formField, newItem.id);
                setDialogProps(null);
            }
        });
    };

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

    const handleSubmit = (values: VehicleFormValues) => {
        onSubmit(values, imageFiles, removedImageUrls);
    };

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                    {/* Images */}
                    <div className="space-y-4">
                        <FormLabel>Тээврийн хэрэгслийн зургууд</FormLabel>
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

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="makeId" render={({ field }) => (<FormItem><FormLabel>Үйлдвэрлэгч</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Үйлдвэрлэгч сонгох..." /></SelectTrigger></FormControl><SelectContent>{makes.map((make) => <SelectItem key={make.id} value={make.id}>{make.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="modelId" render={({ field }) => (<FormItem><FormLabel>Загвар</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedMakeId || filteredModels.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Эхлээд үйлдвэрлэгчээс сонгоно уу..." /></SelectTrigger></FormControl><SelectContent>{filteredModels.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Үйлдвэрлэсэн он</FormLabel><FormControl><Input type="number" placeholder="2023" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="importedYear" render={({ field }) => (<FormItem><FormLabel>Орж ирсэн он</FormLabel><FormControl><Input type="number" placeholder="2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>

                    {/* License Plate */}
                    <div>
                        <FormLabel>Улсын дугаар</FormLabel>
                        <div className="flex items-start gap-2 mt-2">
                            <FormField control={form.control} name="licensePlateDigits" render={({ field }) => (<FormItem className="w-24"><FormControl><Input placeholder="0000" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)} />
                            {[1, 2, 3].map(i => (
                                <FormField key={i} control={form.control} name={`licensePlateChar${i}` as any} render={({ field }) => (<FormItem className="w-20"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{mongolianAlphabet.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <FormLabel>Чиргүүлийн дугаар (Сонголттой)</FormLabel>
                        <div className="flex items-start gap-2 mt-2">
                            <FormField control={form.control} name="trailerLicensePlateDigits" render={({ field }) => (<FormItem className="w-24"><FormControl><Input placeholder="0000" {...field} maxLength={4} /></FormControl><FormMessage /></FormItem>)} />
                            {[1, 2].map(i => (
                                <FormField key={i} control={form.control} name={`trailerLicensePlateChar${i}` as any} render={({ field }) => (<FormItem className="w-20"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{mongolianAlphabet.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            ))}
                        </div>
                    </div>

                    <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>Арлын дугаар (VIN)</FormLabel><FormControl><Input placeholder="Арлын дугаар" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="odometer" render={({ field }) => (<FormItem><FormLabel>Гүйлт (км)</FormLabel><FormControl><Input type="number" placeholder="150000" {...field} /></FormControl><FormMessage /></FormItem>)} />

                    {/* Specs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="vehicleTypeId" render={({ field }) => (<FormItem><FormLabel>Машины төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{vehicleTypes.map((s) => (<SelectItem key={s.id} value={s.id}> {s.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('vehicle_types', 'vehicleTypeId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="trailerTypeId" render={({ field }) => (<FormItem><FormLabel>Тэвшний төрөл</FormLabel><div className="flex gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger></FormControl><SelectContent>{trailerTypes.map((s) => (<SelectItem key={s.id} value={s.id}> {s.name} </SelectItem>))}</SelectContent></Select><Button type="button" variant="outline" size="icon" onClick={() => handleQuickAdd('trailer_types', 'trailerTypeId')}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Даац / Хэмжээ</FormLabel><FormControl><Input placeholder="25тн, 90м3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="fuelType" render={({ field }) => (<FormItem><FormLabel>Шатахууны төрөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{fuelTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="specs.tankCapacity" render={({ field }) => (<FormItem><FormLabel>Түлшний сав (литр)</FormLabel><FormControl><Input type="number" placeholder="400" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="specs.transmission" render={({ field }) => (<FormItem><FormLabel>Хурдны хайрцаг</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl><SelectContent>{transmissionTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="specs.axleConfig" render={({ field }) => (<FormItem><FormLabel>Тэнхлэгийн тохиргоо</FormLabel><FormControl><Input placeholder="6x4, 4x2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="specs.engineType" render={({ field }) => (<FormItem><FormLabel>Хөдөлгүүрийн төрөл</FormLabel><FormControl><Input placeholder="V8 Turbo Diesel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>

                    {/* Dates */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Хугацаа ба Бичиг баримт</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { name: 'dates.purchase', label: 'Худалдаж авсан огноо' },
                                { name: 'dates.registrationExpiry', label: 'Техникийн үзлэг дуусах' },
                                { name: 'dates.insuranceExpiry', label: 'Даатгал дуусах' },
                                { name: 'dates.roadPermitExpiry', label: 'Замын зөвшөөрөл дуусах' },
                                { name: 'dates.warrantyExpiry', label: 'Баталгаат хугацаа дуусах' },
                            ].map((dateField) => (
                                <FormField
                                    key={dateField.name}
                                    control={form.control}
                                    name={dateField.name as any}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>{dateField.label}</FormLabel>
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
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                        captionLayout="dropdown"
                                                        fromYear={dateField.name === 'dates.purchase' ? 1990 : new Date().getFullYear() - 5}
                                                        toYear={new Date().getFullYear() + 15}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Нэмэлт тэмдэглэл</FormLabel><FormControl><Textarea placeholder="Тээврийн хэрэгслийн талаарх нэмэлт мэдээлэл..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => window.history.back()}>
                            Цуцлах
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? 'Шинэчлэх' : 'Бүртгэх'}
                        </Button>
                    </div>
                </form>
            </Form>
            {dialogProps && <QuickAddDialog {...dialogProps} onClose={() => setDialogProps(null)} />}
        </>
    );
}
