'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
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

interface CustomerListTableProps {
    customers: Customer[];
    isLoading: boolean;
    onDelete: (customer: Customer) => void;
}

export function CustomerListTable({ customers, isLoading, onDelete }: CustomerListTableProps) {
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
                <p className="text-muted-foreground">Бүртгэлтэй харилцагч олдсонгүй.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
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
                    {customers.map((customer) => (
                        <TableRow key={customer.id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={customer.logoUrl} alt={customer.name} />
                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                                <Link href={`/customers/${customer.id}`} className="hover:underline">
                                    {customer.name}
                                </Link>
                            </TableCell>
                            <TableCell>{customer.registerNumber}</TableCell>
                            <TableCell>{customer.officePhone}</TableCell>
                            <TableCell>{customer.createdBy?.name || 'N/A'}</TableCell>
                            <TableCell>{customer.assignedTo?.name || 'N/A'}</TableCell>
                            <TableCell>{customer.createdAt?.toLocaleDateString()}</TableCell>
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
