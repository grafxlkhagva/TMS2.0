'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Clock } from 'lucide-react';
import { CONTRACT_STATUS_META, KANBAN_COLUMNS } from '@/lib/contract-constants';
import type { Contract, ContractStatus } from '@/types';

interface KanbanProps {
  contracts: Contract[];
}

export function ContractKanban({ contracts }: KanbanProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const meta = CONTRACT_STATUS_META[col.status];
        const items = contracts.filter((c) => {
          if (col.status === 'expired') return c.status === 'expired' || c.status === 'expiring_soon' || c.status === 'terminated';
          return c.status === col.status;
        });

        return (
          <div key={col.status} className="flex-shrink-0 w-[280px]">
            <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg ${meta.bgColor}`}>
              <meta.icon className={`h-4 w-4 ${meta.color}`} />
              <span className={`text-sm font-semibold ${meta.color}`}>{col.label}</span>
              <Badge variant="secondary" className="ml-auto h-5 text-xs">{items.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[100px]">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Хоосон</p>
              ) : (
                items.map((c) => (
                  <Link key={c.id} href={`/contracts/${c.id}`}>
                    <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-semibold line-clamp-1">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.contractNumber}</p>
                        {c.linkedEntities?.customerName && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{c.linkedEntities.customerName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {c.createdAt.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
