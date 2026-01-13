
import * as React from 'react';
import { Check, Circle, Truck, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderItemStatus } from '@/types';

interface StatusTrackerProps {
    status: OrderItemStatus;
}

const steps = [
    { id: 'Pending', label: 'Үүссэн', icon: Package },
    { id: 'Assigned', label: 'Жолоочтой', icon: User },
    { id: 'Shipped', label: 'Ачигдсан', icon: Truck },
    { id: 'Delivered', label: 'Хүрсэн', icon: Check }
];

export function StatusTracker({ status }: StatusTrackerProps) {
    const getCurrentStepIndex = (s: string) => {
        if (s === 'In Transit') return 2; // Treat In Transit as Shipped step
        return steps.findIndex(step => step.id === s);
    };

    const currentStepIndex = getCurrentStepIndex(status);

    return (
        <div className="flex items-center w-full max-w-xl mx-auto py-4">
            {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                    <React.Fragment key={step.id}>
                        <div className="relative flex flex-col items-center group">
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                                isCompleted ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground",
                                isCurrent && "ring-2 ring-offset-2 ring-primary"
                            )}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className={cn(
                                "absolute pt-10 text-xs font-medium whitespace-nowrap",
                                isCompleted ? "text-primary" : "text-muted-foreground"
                            )}>
                                {step.label}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 mx-2",
                                index < currentStepIndex ? "bg-primary" : "bg-muted"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
