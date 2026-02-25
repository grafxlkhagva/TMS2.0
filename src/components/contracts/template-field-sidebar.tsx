'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Building2, Truck, UserSquare, Warehouse, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOURCE_FIELD_OPTIONS, SOURCE_LABELS } from '@/lib/contract-field-sources';
import type { ContractFieldSource } from '@/types';

const SOURCE_ICONS: Record<Exclude<ContractFieldSource, 'manual'>, { icon: typeof Building2; color: string; bg: string }> = {
  customer: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  vehicle: { icon: Truck, color: 'text-green-600', bg: 'bg-green-50' },
  driver: { icon: UserSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
  warehouse: { icon: Warehouse, color: 'text-purple-600', bg: 'bg-purple-50' },
};

interface FieldSidebarProps {
  onInsertPlaceholder: (source: string, path: string, label: string) => void;
}

export function TemplateFieldSidebar({ onInsertPlaceholder }: FieldSidebarProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Системийн талбарууд</CardTitle>
        <p className="text-xs text-muted-foreground">
          Дарж гэрээний текст рүү оруулна
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-4 pb-4">
          <div className="space-y-2">
            {(Object.entries(SOURCE_FIELD_OPTIONS) as [Exclude<ContractFieldSource, 'manual'>, typeof SOURCE_FIELD_OPTIONS['customer']][]).map(
              ([source, fields]) => {
                const meta = SOURCE_ICONS[source];
                const Icon = meta.icon;
                const sourceLabel = SOURCE_LABELS[source];

                return (
                  <Collapsible key={source} defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                      <div className={cn('rounded-md p-1', meta.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', meta.color)} />
                      </div>
                      <span className="text-sm font-semibold flex-1 text-left">{sourceLabel}</span>
                      <Badge variant="secondary" className="h-5 text-[10px]">{fields.length}</Badge>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 pl-9 pr-2 pb-2 pt-1">
                        {fields.map((field) => (
                          <button
                            key={`${source}-${field.value}`}
                            type="button"
                            onClick={() =>
                              onInsertPlaceholder(
                                source,
                                field.value,
                                `${sourceLabel}.${field.label}`
                              )
                            }
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                              'border hover:shadow-sm active:scale-95 cursor-pointer',
                              source === 'customer' && 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                              source === 'vehicle' && 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
                              source === 'driver' && 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
                              source === 'warehouse' && 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            )}
                          >
                            <Plus className="h-3 w-3" />
                            {field.label}
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
