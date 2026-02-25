'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LIFECYCLE_STEPS, CONTRACT_STATUS_META } from '@/lib/contract-constants';
import type { ContractStatus } from '@/types';

interface StatusStepperProps {
  currentStatus: ContractStatus;
}

export function ContractStatusStepper({ currentStatus }: StatusStepperProps) {
  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.status === currentStatus);
  const isTerminal = ['rejected', 'terminated', 'expired', 'expiring_soon'].includes(currentStatus);

  return (
    <div className="flex items-center gap-1 w-full">
      {LIFECYCLE_STEPS.map((step, i) => {
        const meta = CONTRACT_STATUS_META[step.status];
        const isPast = currentIdx > i;
        const isCurrent = currentIdx === i || (isTerminal && i === LIFECYCLE_STEPS.length - 1);
        const StatusIcon = meta.icon;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors border-2',
                  isPast && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && !isPast && `${meta.bgColor} ${meta.borderColor} ${meta.color}`,
                  !isPast && !isCurrent && 'bg-muted border-muted text-muted-foreground'
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : <StatusIcon className="h-3.5 w-3.5" />}
              </div>
              <span className={cn('text-[10px] font-medium whitespace-nowrap', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
            {i < LIFECYCLE_STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-1 mt-[-18px]', isPast ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}

      {/* Terminal status indicator */}
      {isTerminal && (
        <div className="flex flex-col items-center gap-1 ml-2">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2', CONTRACT_STATUS_META[currentStatus].bgColor, CONTRACT_STATUS_META[currentStatus].borderColor)}>
            {(() => { const I = CONTRACT_STATUS_META[currentStatus].icon; return <I className={cn('h-3.5 w-3.5', CONTRACT_STATUS_META[currentStatus].color)} />; })()}
          </div>
          <span className="text-[10px] font-medium whitespace-nowrap">
            {CONTRACT_STATUS_META[currentStatus].label}
          </span>
        </div>
      )}
    </div>
  );
}
