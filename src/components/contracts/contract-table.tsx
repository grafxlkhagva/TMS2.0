'use client';

import * as React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ChevronRight } from 'lucide-react';
import { CONTRACT_STATUS_META } from '@/lib/contract-constants';
import type { Contract, ContractStatus } from '@/types';

interface ContractTableProps {
  contracts: Contract[];
}

export function ContractTable({ contracts }: ContractTableProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const filtered = React.useMemo(() => {
    let list = contracts;
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.contractNumber.toLowerCase().includes(term) ||
          c.linkedEntities?.customerName?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [contracts, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Гэрээний нэр, дугаар, харилцагчаар хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Бүх статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Бүх статус</SelectItem>
            {Object.entries(CONTRACT_STATUS_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Гэрээний нэр</TableHead>
              <TableHead>Дугаар</TableHead>
              <TableHead>Харилцагч</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Огноо</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Гэрээ олдсонгүй
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const meta = CONTRACT_STATUS_META[c.status] || CONTRACT_STATUS_META.draft;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/contracts/${c.id}`} className="font-medium hover:text-primary">
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.contractNumber}</TableCell>
                    <TableCell>{c.linkedEntities?.customerName || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`${meta.bgColor} ${meta.color} ${meta.borderColor} border`}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.createdAt.toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Link href={`/contracts/${c.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
