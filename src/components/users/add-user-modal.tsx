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
import { UserRole } from '@/types';
import { Loader2, UserPlus } from 'lucide-react';

const addUserSchema = z.object({
    firstName: z.string().min(2, 'Нэр дэх тэмдэгтийн тоо бага байна'),
    lastName: z.string().min(2, 'Овог дахь тэмдэгтийн тоо бага байна'),
    phone: z.string().min(8, 'Утасны дугаар буруу байна'),
    email: z.string().email('И-мэйл хаяг буруу байна'),
    role: z.string().min(1, 'Эрх сонгох шаардлагатай'),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: AddUserFormValues) => Promise<void>;
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

export function AddUserModal({
    isOpen,
    onClose,
    onAdd,
}: AddUserModalProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<AddUserFormValues>({
        resolver: zodResolver(addUserSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            role: 'manager',
        },
    });

    const onSubmit = async (values: AddUserFormValues) => {
        setIsSubmitting(true);
        try {
            await onAdd(values);
            form.reset();
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => {
            if (!open) {
                form.reset();
            }
            onClose();
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Шинэ хэрэглэгч нэмэх
                    </DialogTitle>
                    <DialogDescription>
                        Системд шинээр ажилтны мэдээллийг оруулах. Хэрэглэгч тус и-мэйл хаягаар бүртгүүлэхэд мэдээлэл нь холбогдох болно.
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
                                            <Input placeholder="Овог" {...field} />
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
                                            <Input placeholder="Нэр" {...field} />
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
                                        <Input placeholder="example@domain.com" {...field} />
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
                                        <Input placeholder="99119911" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Нэмэх
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
