'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Camera, X, CalendarIcon, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { FormDescription } from '@/components/ui/form';
import { analyzeDriverLicense } from '@/ai/flows/analyze-driver-license';
import { useToast } from '@/hooks/use-toast';

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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Driver, DriverStatus } from '@/types';

const driverStatuses: DriverStatus[] = ['Active', 'Inactive', 'On Leave'];

export const driverFormSchema = z.object({
    display_name: z.string().min(2, "Нэр дор хаяж 2 үсэгтэй байх ёстой."),
    phone_number: z.string().min(8, "Утасны дугаар буруу байна."),
    status: z.enum(['Active', 'Inactive', 'On Leave']),
    registerNumber: z.string().min(1, "Регистрийн дугаар оруулна уу."),
    birthDate: z.date().optional(),
    licenseNumber: z.string().min(1, "Үнэмлэхний дугаар оруулна уу."),
    licenseClasses: z.array(z.string()).min(1, "Доод тал нь нэг ангилал сонгоно уу."),
    licenseExpiryDate: z.date().optional(),
    emergencyContact: z.object({
        name: z.string().min(1, "Нэр оруулна уу."),
        phone: z.string().min(8, "Утасны дугаар оруулна уу."),
    }),
    isAvailableForContracted: z.boolean().default(false),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

interface LicenseFiles {
    front: File | null;
    back: File | null;
}

interface NationalIdFiles {
    front: File | null;
    back: File | null;
}

interface DriverFormProps {
    initialData?: Driver;
    onSubmit: (values: DriverFormValues, avatarFile: File | null, licenseFiles: LicenseFiles, nationalIdFiles: NationalIdFiles) => Promise<void>;
    isSubmitting: boolean;
}

const LICENSE_CLASSES = ['A', 'B', 'BC', 'C', 'D', 'E', 'M'];

export function DriverForm({ initialData, onSubmit, isSubmitting }: DriverFormProps) {
    const { toast } = useToast();
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(initialData?.photo_url || null);
    
    // Үнэмлэхний урд тал
    const [licenseFrontFile, setLicenseFrontFile] = React.useState<File | null>(null);
    const [licenseFrontPreview, setLicenseFrontPreview] = React.useState<string | null>(
        initialData?.licenseImageFrontUrl || initialData?.licenseImageUrl || null
    );
    
    // Жолооны үнэмлэхний ар тал
    const [licenseBackFile, setLicenseBackFile] = React.useState<File | null>(null);
    const [licenseBackPreview, setLicenseBackPreview] = React.useState<string | null>(
        initialData?.licenseImageBackUrl || null
    );

    // Иргэний үнэмлэхний урд тал
    const [nationalIdFrontFile, setNationalIdFrontFile] = React.useState<File | null>(null);
    const [nationalIdFrontPreview, setNationalIdFrontPreview] = React.useState<string | null>(
        initialData?.nationalIdFrontUrl || null
    );
    
    // Иргэний үнэмлэхний ар тал
    const [nationalIdBackFile, setNationalIdBackFile] = React.useState<File | null>(null);
    const [nationalIdBackPreview, setNationalIdBackPreview] = React.useState<string | null>(
        initialData?.nationalIdBackUrl || null
    );

    // AI шинжилгээ
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);

    const avatarInputRef = React.useRef<HTMLInputElement>(null);
    const licenseFrontInputRef = React.useRef<HTMLInputElement>(null);
    const licenseBackInputRef = React.useRef<HTMLInputElement>(null);
    const nationalIdFrontInputRef = React.useRef<HTMLInputElement>(null);
    const nationalIdBackInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<DriverFormValues>({
        resolver: zodResolver(driverFormSchema),
        defaultValues: {
            display_name: initialData?.display_name || '',
            phone_number: initialData?.phone_number || '',
            status: (initialData?.status as any) || 'Active',
            registerNumber: initialData?.registerNumber || '',
            birthDate: initialData?.birthDate ? (initialData.birthDate instanceof Timestamp ? initialData.birthDate.toDate() : new Date(initialData.birthDate)) : undefined,
            licenseNumber: initialData?.licenseNumber || '',
            licenseClasses: initialData?.licenseClasses || [],
            licenseExpiryDate: initialData?.licenseExpiryDate ? (initialData.licenseExpiryDate instanceof Timestamp ? initialData.licenseExpiryDate.toDate() : new Date(initialData.licenseExpiryDate)) : undefined,
            emergencyContact: {
                name: initialData?.emergencyContact?.name || '',
                phone: initialData?.emergencyContact?.phone || '',
            },
            isAvailableForContracted: initialData?.isAvailableForContracted || false,
        },
    });

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleLicenseFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLicenseFrontFile(file);
            setLicenseFrontPreview(URL.createObjectURL(file));
        }
    };

    const handleLicenseBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLicenseBackFile(file);
            setLicenseBackPreview(URL.createObjectURL(file));
        }
    };

    const handleNationalIdFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNationalIdFrontFile(file);
            setNationalIdFrontPreview(URL.createObjectURL(file));
        }
    };

    const handleNationalIdBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNationalIdBackFile(file);
            setNationalIdBackPreview(URL.createObjectURL(file));
        }
    };

    const handleFormSubmit = (values: DriverFormValues) => {
        onSubmit(
            values, 
            avatarFile, 
            { front: licenseFrontFile, back: licenseBackFile },
            { front: nationalIdFrontFile, back: nationalIdBackFile }
        );
    };

    const toggleClass = (cls: string) => {
        const current = form.getValues('licenseClasses');
        if (current.includes(cls)) {
            form.setValue('licenseClasses', current.filter(c => c !== cls));
        } else {
            form.setValue('licenseClasses', [...current, cls]);
        }
    };

    // File-ыг base64 болгох
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    // Огноог аюулгүй parse хийх
    const safeParseDate = (dateString: string | undefined | null): Date | null => {
        if (!dateString || dateString === 'null' || dateString === 'undefined') {
            return null;
        }
        try {
            const date = new Date(dateString);
            // Invalid Date эсэхийг шалгах
            if (isNaN(date.getTime())) {
                return null;
            }
            // Хэт эрт эсвэл хэт хожуу огноо эсэхийг шалгах
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                return null;
            }
            return date;
        } catch {
            return null;
        }
    };

    // AI-аар үнэмлэх шинжлэх
    const handleAIAnalysis = async () => {
        if (!licenseFrontFile && !licenseBackFile && !licenseFrontPreview && !licenseBackPreview) {
            toast({
                variant: 'destructive',
                title: 'Зураг оруулна уу',
                description: 'AI шинжилгээ хийхийн тулд үнэмлэхний зураг оруулна уу.',
            });
            return;
        }

        setIsAnalyzing(true);
        try {
            let frontBase64: string | undefined;
            let backBase64: string | undefined;

            // Шинэ файл байвал түүнийг ашиглана, үгүй бол URL fetch хийнэ
            if (licenseFrontFile) {
                frontBase64 = await fileToBase64(licenseFrontFile);
            } else if (licenseFrontPreview && !licenseFrontPreview.startsWith('blob:')) {
                // URL-ээс fetch хийх (Firebase Storage URL)
                const response = await fetch(licenseFrontPreview);
                const blob = await response.blob();
                frontBase64 = await fileToBase64(new File([blob], 'front.jpg', { type: blob.type }));
            }

            if (licenseBackFile) {
                backBase64 = await fileToBase64(licenseBackFile);
            } else if (licenseBackPreview && !licenseBackPreview.startsWith('blob:')) {
                const response = await fetch(licenseBackPreview);
                const blob = await response.blob();
                backBase64 = await fileToBase64(new File([blob], 'back.jpg', { type: blob.type }));
            }

            const result = await analyzeDriverLicense({
                frontImageBase64: frontBase64,
                backImageBase64: backBase64,
            });

            // Форм талбаруудыг бөглөх
            let fieldsUpdated = 0;

            if (result.displayName) {
                form.setValue('display_name', result.displayName);
                fieldsUpdated++;
            }
            if (result.registerNumber) {
                form.setValue('registerNumber', result.registerNumber);
                fieldsUpdated++;
            }
            if (result.birthDate) {
                const parsedBirthDate = safeParseDate(result.birthDate);
                if (parsedBirthDate) {
                    form.setValue('birthDate', parsedBirthDate);
                    fieldsUpdated++;
                }
            }
            if (result.licenseNumber) {
                form.setValue('licenseNumber', result.licenseNumber);
                fieldsUpdated++;
            }
            if (result.licenseClasses && result.licenseClasses.length > 0) {
                // BC гэх мэтийг B, C болгож салгах
                const expandedClasses: string[] = [];
                result.licenseClasses.forEach(cls => {
                    if (cls === 'BC') {
                        expandedClasses.push('B', 'C');
                    } else if (LICENSE_CLASSES.includes(cls)) {
                        expandedClasses.push(cls);
                    }
                });
                form.setValue('licenseClasses', [...new Set(expandedClasses)]);
                fieldsUpdated++;
            }
            if (result.licenseExpiryDate) {
                const parsedExpiryDate = safeParseDate(result.licenseExpiryDate);
                if (parsedExpiryDate) {
                    form.setValue('licenseExpiryDate', parsedExpiryDate);
                    fieldsUpdated++;
                }
            }

            toast({
                title: 'AI шинжилгээ дууслаа',
                description: `${fieldsUpdated} талбар автоматаар бөглөгдлөө. ${result.confidence ? `(${result.confidence}% итгэлтэй)` : ''}`,
            });

        } catch (error) {
            console.error('AI analysis error:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'AI шинжилгээ хийхэд алдаа гарлаа. Дахин оролдоно уу.',
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                {/* Profile Photo */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-2">
                            <AvatarImage src={avatarPreview ?? undefined} />
                            <AvatarFallback className="text-4xl text-muted-foreground">
                                {form.getValues('display_name')?.charAt(0) || 'D'}
                            </AvatarFallback>
                        </Avatar>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="absolute bottom-0 right-0 rounded-full bg-background"
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                    <FormLabel>Профайл зураг</FormLabel>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1: Personal Info */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-2">Хувийн мэдээлэл</h3>
                        <FormField
                            control={form.control}
                            name="display_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Овог Нэр</FormLabel>
                                    <FormControl><Input placeholder="Бат Болд" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="registerNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Регистрийн дугаар</FormLabel>
                                        <FormControl><Input placeholder="УЗ88..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="birthDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col mt-2">
                                        <FormLabel>Төрсөн огноо</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PP") : <span>Сонгох</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                    captionLayout="dropdown"
                                                    fromYear={1940}
                                                    toYear={new Date().getFullYear()}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Утасны дугаар</FormLabel>
                                        <FormControl><Input placeholder="88..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Статус</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Сонгох..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Active">Идэвхтэй</SelectItem>
                                                <SelectItem value="Inactive">Идэвхгүй</SelectItem>
                                                <SelectItem value="On Leave">Чөлөөнд</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Яаралтай үед холбоо барих</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="emergencyContact.name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Хэний хэн</FormLabel>
                                            <FormControl><Input placeholder="Эхнэр/Нөхөр..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="emergencyContact.phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Холбоо барих утас</FormLabel>
                                            <FormControl><Input placeholder="99..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Тээвэрлэлтийн тохиргоо</h3>
                            <FormField
                                control={form.control}
                                name="isAvailableForContracted"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Гэрээт тээвэрт явах</FormLabel>
                                            <FormDescription>
                                                Энэ жолооч гэрээт (тогтмол) тээвэрлэлтэд явах боломжтой эсэх.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Column 2: Licensing */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-2">Жолооны үнэмлэх</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="licenseNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Үнэмлэхний дугаар</FormLabel>
                                        <FormControl><Input placeholder="123456" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="licenseExpiryDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col mt-2">
                                        <FormLabel>Хугацаа дуусах огноо</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PP") : <span>Сонгох</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                    captionLayout="dropdown"
                                                    fromYear={new Date().getFullYear() - 10}
                                                    toYear={new Date().getFullYear() + 20}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-3">
                            <FormLabel>Ангилал</FormLabel>
                            <div className="flex flex-wrap gap-2">
                                {LICENSE_CLASSES.map((cls) => (
                                    <Button
                                        key={cls}
                                        type="button"
                                        variant={form.watch('licenseClasses').includes(cls) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleClass(cls)}
                                        className="w-12"
                                    >
                                        {cls}
                                    </Button>
                                ))}
                            </div>
                            <FormMessage>{form.formState.errors.licenseClasses?.message}</FormMessage>
                        </div>

                        <div className="space-y-4 pt-4">
                            <FormLabel>Үнэмлэхний зураг</FormLabel>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Урд тал */}
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-muted-foreground">Урд тал</span>
                                    <div className="relative aspect-[4/3] w-full rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
                                        {licenseFrontPreview ? (
                                            <>
                                                <Image src={licenseFrontPreview} alt="License Front" fill className="object-contain" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 rounded-full h-7 w-7"
                                                    onClick={() => { setLicenseFrontFile(null); setLicenseFrontPreview(null); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => licenseFrontInputRef.current?.click()}
                                                className="flex flex-col h-auto p-3 gap-1"
                                            >
                                                <Camera className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Урд тал</span>
                                            </Button>
                                        )}
                                        <input
                                            type="file"
                                            ref={licenseFrontInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLicenseFrontChange}
                                        />
                                    </div>
                                </div>

                                {/* Ар тал */}
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-muted-foreground">Ар тал</span>
                                    <div className="relative aspect-[4/3] w-full rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
                                        {licenseBackPreview ? (
                                            <>
                                                <Image src={licenseBackPreview} alt="License Back" fill className="object-contain" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 rounded-full h-7 w-7"
                                                    onClick={() => { setLicenseBackFile(null); setLicenseBackPreview(null); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => licenseBackInputRef.current?.click()}
                                                className="flex flex-col h-auto p-3 gap-1"
                                            >
                                                <Camera className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Ар тал</span>
                                            </Button>
                                        )}
                                        <input
                                            type="file"
                                            ref={licenseBackInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLicenseBackChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* AI шинжилгээ товч */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full mt-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-300 hover:border-violet-400 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-purple-500/20"
                                onClick={handleAIAnalysis}
                                disabled={isAnalyzing || (!licenseFrontFile && !licenseBackFile && !licenseFrontPreview && !licenseBackPreview)}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        AI шинжилж байна...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
                                        AI-аар мэдээлэл таних
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                Зургаас нэр, регистр, үнэмлэхний дугаар, ангилал зэргийг автоматаар таниулна
                            </p>
                        </div>

                        {/* Иргэний үнэмлэх */}
                        <div className="space-y-4 pt-6 border-t">
                            <FormLabel>Иргэний үнэмлэх</FormLabel>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Урд тал */}
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-muted-foreground">Урд тал</span>
                                    <div className="relative aspect-[4/3] w-full rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
                                        {nationalIdFrontPreview ? (
                                            <>
                                                <Image src={nationalIdFrontPreview} alt="National ID Front" fill className="object-contain" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 rounded-full h-7 w-7"
                                                    onClick={() => { setNationalIdFrontFile(null); setNationalIdFrontPreview(null); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => nationalIdFrontInputRef.current?.click()}
                                                className="flex flex-col h-auto p-3 gap-1"
                                            >
                                                <Camera className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Урд тал</span>
                                            </Button>
                                        )}
                                        <input
                                            type="file"
                                            ref={nationalIdFrontInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleNationalIdFrontChange}
                                        />
                                    </div>
                                </div>

                                {/* Ар тал */}
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-muted-foreground">Ар тал</span>
                                    <div className="relative aspect-[4/3] w-full rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
                                        {nationalIdBackPreview ? (
                                            <>
                                                <Image src={nationalIdBackPreview} alt="National ID Back" fill className="object-contain" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 rounded-full h-7 w-7"
                                                    onClick={() => { setNationalIdBackFile(null); setNationalIdBackPreview(null); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => nationalIdBackInputRef.current?.click()}
                                                className="flex flex-col h-auto p-3 gap-1"
                                            >
                                                <Camera className="h-8 w-8 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Ар тал</span>
                                            </Button>
                                        )}
                                        <input
                                            type="file"
                                            ref={nationalIdBackInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleNationalIdBackChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => window.history.back()}>
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Шинэчлэх' : 'Хадгалах'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
