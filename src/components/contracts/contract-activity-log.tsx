'use client';

import { User } from 'lucide-react';
import { ACTIVITY_ACTIONS } from '@/lib/contract-constants';
import { cn } from '@/lib/utils';
import type { ContractActivityEntry } from '@/types';

interface ActivityLogProps {
  entries: ContractActivityEntry[];
}

export function ContractActivityLog({ entries }: ActivityLogProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Түүх байхгүй</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
      <div className="space-y-6">
        {sorted.map((entry) => {
          const actionMeta = ACTIVITY_ACTIONS[entry.action] || { label: entry.action, color: 'text-gray-600' };
          const time = new Date(entry.timestamp);

          return (
            <div key={entry.id} className="relative flex gap-4 pl-10">
              <div className="absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{entry.performedBy.name}</span>
                  <span className={cn('text-sm font-medium', actionMeta.color)}>
                    {actionMeta.label}
                  </span>
                </div>
                {entry.comment && (
                  <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded-md px-3 py-2">
                    {entry.comment}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {time.toLocaleString('mn-MN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
