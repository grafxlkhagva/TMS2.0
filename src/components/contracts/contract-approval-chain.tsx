'use client';

import { Check, Clock, XCircle, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContractApprovalStep } from '@/types';

interface ApprovalChainProps {
  steps: ContractApprovalStep[];
}

const stepStatusMeta = {
  pending: { label: 'Хүлээж буй', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  approved: { label: 'Батлагдсан', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { label: 'Татгалзсан', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  revision_requested: { label: 'Засвар шаардсан', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
};

export function ContractApprovalChain({ steps }: ApprovalChainProps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Батлалтын мэдээлэл байхгүй</p>;
  }

  return (
    <div className="space-y-4">
      {sorted.map((step, i) => {
        const meta = stepStatusMeta[step.status];
        const StepIcon = meta.icon;

        return (
          <div key={step.id} className="relative">
            {i < sorted.length - 1 && (
              <div className="absolute left-4 top-10 bottom-[-16px] w-px bg-border" />
            )}
            <div className="flex gap-4">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0', meta.bg, meta.border)}>
                <StepIcon className={cn('h-4 w-4', meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{step.approverName}</span>
                  <Badge variant="outline" className={cn('text-xs', meta.bg, meta.color, meta.border)}>
                    {meta.label}
                  </Badge>
                </div>
                {step.comment && (
                  <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded-md px-3 py-2">
                    &ldquo;{step.comment}&rdquo;
                  </p>
                )}
                {step.actionAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(step.actionAt).toLocaleString('mn-MN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
