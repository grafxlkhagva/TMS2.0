'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SystemUser, UserRole, UserStatus } from '@/types';
import { Loader2 } from 'lucide-react';

const userSchema = z.object({
    firstName: z.string().min(2, 'Нэр дэх тэмдэгтийн тоо бага байна'),
    lastName: z.string().min(2, 'Овог дахь тэмдэгтийн тоо бага байна'),
    phone: z.string().min(8, 'Утасны дугаар буруу байна'),
    email: z.string().email('И-мэйл хаяг буруу байна'),
    role: z.string(),
    status: z.string(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserDetailsModalProps {
    user: SystemUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<SystemUser>) => Promise<void>;
}

const roleNames: Record<UserRole, string> = {
    admin: 'Админ',
    management: 'Удирдлага',
    manager: 'Менежер',
    transport_manager: 'Тээврийн менежер',
    finance_manager: 'Санхүүгийн менежер',
    customer_officer: 'Харилцагчийн ажилтан',
    driver: 'Жолооч',
};

export function UserDetailsModal({
    user,
    isOpen,
    onClose,
    onSave,
}: UserDetailsModalProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            role: 'manager',
            status: 'active',
        },
    });

    React.useEffect(() => {
        if (user) {
            form.reset({
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                email: user.email,
                role: user.role,
                status: user.status,
            });
        }
    }, [user, form]);

    const onSubmit = async (values: UserFormValues) => {
        setIsSubmitting(true);
        try {
            await onSave(values as Partial<SystemUser>);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Хэрэглэгчийн мэдээлэл</DialogTitle>
                    <DialogDescription>
                        Хэрэглэгчийн үндсэн мэдээлэл болон эрхийг засварлах.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Овог</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Нэр</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>И-мэйл</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Утас</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Эрх</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Эрх сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(roleNames).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
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
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Статус</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Статус сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Идэвхтэй</SelectItem>
                                                <SelectItem value="pending">Хүлээгдэж буй</SelectItem>
                                                <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
