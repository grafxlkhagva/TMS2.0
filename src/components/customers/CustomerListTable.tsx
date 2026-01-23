'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, Eye, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer } from '@/types';

type SortField = 'name' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc';

interface CustomerListTableProps {
    customers: Customer[];
    isLoading: boolean;
    onDelete: (customer: Customer) => void;
    emptyMessage?: string;
}

export function CustomerListTable({ customers, isLoading, onDelete, emptyMessage }: CustomerListTableProps) {
    const [sortField, setSortField] = React.useState<SortField>(null);
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

    // Эрэмбэлэх
    const sortedCustomers = React.useMemo(() => {
        if (!sortField) return customers;
        
        return [...customers].sort((a, b) => {
            let comparison = 0;
            
            if (sortField === 'name') {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                comparison = nameA.localeCompare(nameB, 'mn');
            } else if (sortField === 'createdAt') {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                comparison = dateA - dateB;
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [customers, sortField, sortDirection]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            // Дахин дарахад чиглэл солигдоно, 3 дахь удаад унтарна
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else {
                setSortField(null);
                setSortDirection('asc');
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="ml-1 h-3 w-3" />
            : <ArrowDown className="ml-1 h-3 w-3" />;
    };

    if (isLoading) {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Лого</TableHead>
                        <TableHead>Нэр</TableHead>
                        <TableHead>Регистрийн дугаар</TableHead>
                        <TableHead>Утас</TableHead>
                        <TableHead>Бүртгэсэн</TableHead>
                        <TableHead>Хариуцсан</TableHead>
                        <TableHead>Бүртгүүлсэн</TableHead>
                        <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="text-center py-10 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">{emptyMessage || 'Бүртгэлтэй харилцагч олдсонгүй.'}</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Лого</TableHead>
                        <TableHead>
                            <button
                                type="button"
                                className="flex items-center hover:text-foreground transition-colors"
                                onClick={() => toggleSort('name')}
                            >
                                Нэр
                                {getSortIcon('name')}
                            </button>
                        </TableHead>
                        <TableHead>Регистрийн дугаар</TableHead>
                        <TableHead>Утас</TableHead>
                        <TableHead>Бүртгэсэн</TableHead>
                        <TableHead>Хариуцсан</TableHead>
                        <TableHead>
                            <button
                                type="button"
                                className="flex items-center hover:text-foreground transition-colors"
                                onClick={() => toggleSort('createdAt')}
                            >
                                Бүртгүүлсэн
                                {getSortIcon('createdAt')}
                            </button>
                        </TableHead>
                        <TableHead><span className="sr-only">Үйлдэл</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={customer.logoUrl} alt={customer.name} />
                                    <AvatarFallback>{(customer.name || '?').charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                                <Link href={`/customers/${customer.id}`} className="hover:underline">
                                    {customer.name || '—'}
                                </Link>
                            </TableCell>
                            <TableCell>{customer.registerNumber || '—'}</TableCell>
                            <TableCell>{customer.officePhone || '—'}</TableCell>
                            <TableCell>{customer.createdBy?.name || '—'}</TableCell>
                            <TableCell>{customer.assignedTo?.name || '—'}</TableCell>
                            <TableCell>{customer.createdAt?.toLocaleDateString() || '—'}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Цэс нээх</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/customers/${customer.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Дэлгэрэнгүй
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/customers/${customer.id}/edit`}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Засах
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(customer)}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Устгах
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
