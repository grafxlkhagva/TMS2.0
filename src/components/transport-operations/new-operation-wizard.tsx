'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Globe,
  PackageCheck,
  HardHat,
  FileCheck,
  FileX,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customerService } from '@/services/customerService';
import type { Customer, TransportOperationType } from '@/types';

// ==================== Types ====================

export interface NewOperationData {
  transportType: TransportOperationType;
  hasContract: boolean;
  customerId: string;
  customerName: string;
}

const TRANSPORT_TYPES = [
  {
    value: 'local' as TransportOperationType,
    label: 'Орон нутгийн тээвэр',
    description: 'Дотоодын хот хоорондын болон бүс нутгийн тээвэрлэлт',
    icon: MapPin,
  },
  {
    value: 'international' as TransportOperationType,
    label: 'Олон улсын тээвэр',
    description: 'Хил дамнасан, улс хоорондын тээвэрлэлт',
    icon: Globe,
  },
  {
    value: 'distribution' as TransportOperationType,
    label: 'Түгээлт',
    description: 'Бараа бүтээгдэхүүний түгээлтийн тээвэрлэлт',
    icon: PackageCheck,
  },
  {
    value: 'project' as TransportOperationType,
    label: 'Төслийн тээвэр',
    description: 'Төсөл, барилгын тусгай тээвэрлэлт',
    icon: HardHat,
  },
];

const STEPS = [
  { number: 1, label: 'Тээврийн төрөл' },
  { number: 2, label: 'Гэрээ' },
  { number: 3, label: 'Харилцагч' },
];

// ==================== Component ====================

interface NewOperationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: NewOperationData) => void;
}

export function NewOperationWizard({
  open,
  onOpenChange,
  onComplete,
}: NewOperationWizardProps) {
  const [step, setStep] = React.useState(1);
  const [transportType, setTransportType] = React.useState<TransportOperationType | null>(null);
  const [hasContract, setHasContract] = React.useState<boolean | null>(null);
  const [customerId, setCustomerId] = React.useState('');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState('');

  // Fetch customers when reaching step 3
  React.useEffect(() => {
    if (step === 3 && customers.length === 0) {
      loadCustomers();
    }
  }, [step]);

  const filteredCustomers = React.useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(term));
  }, [customers, customerSearch]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const result = await customerService.getCustomers(null, 100);
      setCustomers(result.customers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const reset = () => {
    setStep(1);
    setTransportType(null);
    setHasContract(null);
    setCustomerId('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  const canGoNext = () => {
    if (step === 1) return transportType !== null;
    if (step === 2) return hasContract !== null;
    if (step === 3) return customerId !== '';
    return false;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!transportType || hasContract === null || !customerId) return;

    const selectedCustomer = customers.find((c) => c.id === customerId);
    if (!selectedCustomer) return;

    setSubmitting(true);
    try {
      onComplete({
        transportType,
        hasContract,
        customerId,
        customerName: selectedCustomer.name,
      });
      handleClose(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeMeta = TRANSPORT_TYPES.find((t) => t.value === transportType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Шинэ тээврийн ажил үүсгэх</DialogTitle>
          <DialogDescription>
            Тээвэрлэлтийн мэдээллийг алхам алхмаар бөглөнө үү
          </DialogDescription>
        </DialogHeader>

        {/* ===== Stepper ===== */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    step === s.number
                      ? 'bg-primary text-primary-foreground'
                      : step > s.number
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s.number ? <Check className="h-3.5 w-3.5" /> : s.number}
                </div>
                <span
                  className={cn(
                    'text-sm hidden sm:inline',
                    step === s.number ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-1 mx-1',
                    step > s.number ? 'bg-primary/40' : 'bg-border'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ===== Step Content ===== */}
        <div className="min-h-[240px]">
          {/* Step 1: Transport Type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                Тээвэрлэлтийн төрлөө сонгоно уу
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRANSPORT_TYPES.map((type) => (
                  <Card
                    key={type.value}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      transportType === type.value
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'hover:border-primary/30'
                    )}
                    onClick={() => setTransportType(type.value)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div
                        className={cn(
                          'rounded-lg p-2 shrink-0',
                          transportType === type.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <type.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{type.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                          {type.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Contract Status */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                Энэ тээвэрлэлт гэрээтэй юу?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    hasContract === true
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'hover:border-primary/30'
                  )}
                  onClick={() => setHasContract(true)}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div
                      className={cn(
                        'rounded-full p-3',
                        hasContract === true
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">Тийм</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Гэрээ байгуулсан харилцагч
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    hasContract === false
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'hover:border-primary/30'
                  )}
                  onClick={() => setHasContract(false)}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div
                      className={cn(
                        'rounded-full p-3',
                        hasContract === false
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <FileX className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">Үгүй</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Гэрээгүй, нэг удаагийн тээвэр
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary so far */}
              {selectedTypeMeta && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                  <selectedTypeMeta.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Төрөл: <span className="font-medium text-foreground">{selectedTypeMeta.label}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Customer Selection */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-1">Харилцагчаа сонгоно уу</p>

              {loadingCustomers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Уншиж байна...</span>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Харилцагчийн нэрээр хайх..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="mb-2"
                  />
                  <ScrollArea className="h-[160px] rounded-md border">
                    <div className="p-1">
                      {filteredCustomers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Харилцагч олдсонгүй
                        </p>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCustomerId(c.id)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors text-left',
                              customerId === c.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                          >
                            <Building2 className={cn(
                              'h-4 w-4 shrink-0',
                              customerId === c.id ? 'text-primary-foreground' : 'text-muted-foreground'
                            )} />
                            <span className="truncate font-medium">{c.name}</span>
                            {customerId === c.id && (
                              <Check className="ml-auto h-4 w-4 shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* Summary */}
              <div className="mt-2 space-y-2">
                {selectedTypeMeta && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                    <selectedTypeMeta.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Төрөл: <span className="font-medium text-foreground">{selectedTypeMeta.label}</span>
                    </span>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                  {hasContract ? (
                    <FileCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <FileX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    Гэрээ:{' '}
                    <span className="font-medium text-foreground">
                      {hasContract ? 'Тийм' : 'Үгүй'}
                    </span>
                  </span>
                </div>
                {customerId && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Харилцагч:{' '}
                      <span className="font-medium text-foreground">
                        {customers.find((c) => c.id === customerId)?.name}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== Footer ===== */}
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Дараах
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canGoNext() || submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Үүсгэх
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
