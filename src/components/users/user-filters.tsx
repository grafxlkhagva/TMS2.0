'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UserRole, UserStatus } from '@/types';
import { Search } from 'lucide-react';

const roleNames: Record<UserRole | 'all', string> = {
    all: 'Бүх эрх',
    admin: 'Админ',
    management: 'Удирдлага',
    manager: 'Менежер',
    transport_manager: 'Тээврийн менежер',
    finance_manager: 'Санхүүгийн менежер',
    customer_officer: 'Харилцагчийн ажилтан',
    driver: 'Жолооч',
};

const statusNames: Record<UserStatus | 'all', string> = {
    all: 'Бүх статус',
    active: 'Идэвхтэй',
    pending: 'Хүлээгдэж буй',
    inactive: 'Идэвхгүй',
};

interface UserFiltersProps {
    onSearchChange: (value: string) => void;
    onRoleChange: (value: UserRole | 'all') => void;
    onStatusChange: (value: UserStatus | 'all') => void;
}

export function UserFilters({
    onSearchChange,
    onRoleChange,
    onStatusChange,
}: UserFiltersProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Нэр, и-мэйл, утсаар хайх..."
                    className="pl-9"
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="flex flex-wrap gap-2">
                <Select onValueChange={(value) => onRoleChange(value as UserRole | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Эрхээр шүүх" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(roleNames).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select onValueChange={(value) => onStatusChange(value as UserStatus | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Статусаар шүүх" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(statusNames).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
