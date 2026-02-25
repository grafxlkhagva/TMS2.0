'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileSignature, Zap, Clock, AlertTriangle } from 'lucide-react';
import type { Contract } from '@/types';

interface KpiCardsProps {
  contracts: Contract[];
}

export function ContractKpiCards({ contracts }: KpiCardsProps) {
  const total = contracts.length;
  const active = contracts.filter((c) => c.status === 'active').length;
  const pending = contracts.filter((c) => c.status === 'pending_review' || c.status === 'revision_requested').length;
  const expiring = contracts.filter((c) => c.status === 'expiring_soon' || c.status === 'expired').length;

  const cards = [
    { label: 'Нийт гэрээ', value: total, icon: FileSignature, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Идэвхтэй', value: active, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Хянагдаж байна', value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Дуусах гэж буй', value: expiring, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${c.bg}`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
