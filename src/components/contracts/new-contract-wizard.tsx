'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, Loader2, Building2, Truck, UserSquare, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { contractService } from '@/services/contractService';
import { customerService } from '@/services/customerService';
import { SOURCE_LABELS } from '@/lib/contract-field-sources';
import type { ContractTemplate, ContractFieldSource, ContractFieldValueType } from '@/types';

const ENTITY_ICONS = {
  customer: Building2,
  vehicle: Truck,
  driver: UserSquare,
  warehouse: Warehouse,
};

async function getVehicles(): Promise<{ id: string; label: string }[]> {
  const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  const snap = await getDocs(query(collection(db, 'vehicles'), orderBy('licensePlate')));
  return snap.docs.map((d) => ({
    id: d.id,
    label: `${d.data().licensePlate} - ${d.data().modelName || ''}`.trim(),
  }));
}

async function getDrivers(): Promise<{ id: string; label: string }[]> {
  const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  const snap = await getDocs(query(collection(db, 'Drivers'), orderBy('display_name')));
  return snap.docs.map((d) => ({
    id: d.id,
    label: d.data().display_name || '',
  }));
}

async function getWarehouses(): Promise<{ id: string; label: string }[]> {
  const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  const snap = await getDocs(query(collection(db, 'warehouses'), orderBy('name')));
  return snap.docs.map((d) => ({
    id: d.id,
    label: d.data().name || '',
  }));
}

interface NewContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  createdBy: { uid: string; name: string };
}

export function NewContractWizard({
  open,
  onOpenChange,
  onComplete,
  createdBy,
}: NewContractWizardProps) {
  const searchParams = useSearchParams();
  const presetTemplateId = searchParams.get('templateId');

  const [step, setStep] = React.useState(1);
  const [templates, setTemplates] = React.useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [linkedEntities, setLinkedEntities] = React.useState<{
    customerId?: string;
    vehicleId?: string;
    driverId?: string;
    warehouseId?: string;
  }>({});
  const [title, setTitle] = React.useState('');
  const [contractNumber, setContractNumber] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [totalValue, setTotalValue] = React.useState('');
  const [resolvedData, setResolvedData] = React.useState<Record<string, string>>({});
  const [customers, setCustomers] = React.useState<{ id: string; label: string }[]>([]);
  const [vehicles, setVehicles] = React.useState<{ id: string; label: string }[]>([]);
  const [drivers, setDrivers] = React.useState<{ id: string; label: string }[]>([]);
  const [warehouses, setWarehouses] = React.useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const neededSources = React.useMemo(() => {
    if (!selectedTemplate) return new Set<ContractFieldSource>();
    const set = new Set<ContractFieldSource>();
    for (const f of selectedTemplate.fields) {
      if (f.source !== 'manual') set.add(f.source);
    }
    return set;
  }, [selectedTemplate]);

  React.useEffect(() => {
    if (open) {
      contractService.getTemplates().then(setTemplates);
    }
  }, [open]);

  React.useEffect(() => {
    if (presetTemplateId && templates.length) {
      const t = templates.find((x) => x.id === presetTemplateId);
      if (t) setSelectedTemplateId(presetTemplateId);
    }
  }, [presetTemplateId, templates]);

  React.useEffect(() => {
    if (step === 2 && open) {
      setLoading(true);
      Promise.all([
        customerService.getCustomers(null, 100).then((r) =>
          r.customers.map((c) => ({ id: c.id, label: c.name }))
        ),
        getVehicles(),
        getDrivers(),
        getWarehouses(),
      ])
        .then(([c, v, d, w]) => {
          setCustomers(c);
          setVehicles(v);
          setDrivers(d);
          setWarehouses(w);
        })
        .finally(() => setLoading(false));
    }
  }, [step, open]);

  React.useEffect(() => {
    if (step === 3 && selectedTemplate && Object.keys(linkedEntities).length > 0) {
      contractService
        .resolveTemplateData(selectedTemplate, linkedEntities)
        .then(setResolvedData);
      if (!contractNumber) setContractNumber(contractService.generateContractNumber());
    }
  }, [step, selectedTemplate, linkedEntities]);

  const canNextStep2 = !!selectedTemplateId;
  const canNextStep3 = React.useMemo(() => {
    for (const src of neededSources) {
      if (src === 'customer' && !linkedEntities.customerId) return false;
      if (src === 'vehicle' && !linkedEntities.vehicleId) return false;
      if (src === 'driver' && !linkedEntities.driverId) return false;
      if (src === 'warehouse' && !linkedEntities.warehouseId) return false;
    }
    return true;
  }, [neededSources, linkedEntities]);
  const canSave = !!title.trim() && !!contractNumber.trim();

  const renderFieldInput = React.useCallback(
    (field: NonNullable<ContractTemplate['fields']>[number]) => {
      const fieldType: ContractFieldValueType = field.fieldType || 'text';
      const value = resolvedData[field.id] || '';

      switch (fieldType) {
        case 'number':
          return (
            <Input
              type="number"
              value={value}
              onChange={(e) => setResolvedData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            />
          );
        case 'date':
          return (
            <Input
              type="date"
              value={value}
              onChange={(e) => setResolvedData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            />
          );
        case 'textarea':
          return (
            <Textarea
              rows={3}
              value={value}
              onChange={(e) => setResolvedData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            />
          );
        case 'select':
          return (
            <Select
              value={value}
              onValueChange={(val) => setResolvedData((prev) => ({ ...prev, [field.id]: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонголт сонгох" />
              </SelectTrigger>
              <SelectContent>
                {(field.selectOptions || []).map((option) => (
                  <SelectItem key={`${field.id}-${option}`} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        case 'text':
        default:
          return (
            <Input
              value={value}
              onChange={(e) => setResolvedData((prev) => ({ ...prev, [field.id]: e.target.value }))}
            />
          );
      }
    },
    [resolvedData]
  );

  const handleClose = () => {
    setStep(1);
    setSelectedTemplateId('');
    setLinkedEntities({});
    setTitle('');
    setContractNumber('');
    setStartDate('');
    setEndDate('');
    setTotalValue('');
    setResolvedData({});
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !canSave) return;
    setSaving(true);
    try {
      // Resolve customerName from selected customer
      const customerName = linkedEntities.customerId
        ? customers.find((c) => c.id === linkedEntities.customerId)?.label || ''
        : '';

      await contractService.createContract({
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        title: title.trim(),
        contractNumber: contractNumber.trim(),
        resolvedData,
        linkedEntities: { ...linkedEntities, customerName },
        status: 'draft',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        totalValue: totalValue ? Number(totalValue) : undefined,
        createdBy,
      });
      onComplete();
      handleClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Шинэ гэрээ үүсгэх</DialogTitle>
          <DialogDescription>
            Загвар сонгоод системийн талбаруудаас мэдээлэл татаж гэрээ үүсгэнэ
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <Label>Загвар сонгох</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Загвар байхгүй</p>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                      selectedTemplateId === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs opacity-80">({t.fields.length} талбар)</span>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Системийн бүртгэлээс холбох эх сурвалжаа сонгоно уу
                </p>
                {neededSources.size === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Энэ загвар нь гараар оруулах талбаруудын агуулгатай. Дараах товч дарна уу.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {neededSources.has('customer') && (
                      <div>
                        <Label className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4" />
                          Харилцагч
                        </Label>
                        <ScrollArea className="h-32 rounded-md border">
                          {customers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                setLinkedEntities((prev) => ({ ...prev, customerId: c.id }))
                              }
                              className={cn(
                                'flex w-full px-3 py-2 text-left text-sm hover:bg-muted',
                                linkedEntities.customerId === c.id && 'bg-primary/10 font-medium'
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                    {neededSources.has('vehicle') && (
                      <div>
                        <Label className="flex items-center gap-2 mb-1">
                          <Truck className="h-4 w-4" />
                          Тээврийн хэрэгсэл
                        </Label>
                        <ScrollArea className="h-32 rounded-md border">
                          {vehicles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() =>
                                setLinkedEntities((prev) => ({ ...prev, vehicleId: v.id }))
                              }
                              className={cn(
                                'flex w-full px-3 py-2 text-left text-sm hover:bg-muted',
                                linkedEntities.vehicleId === v.id && 'bg-primary/10 font-medium'
                              )}
                            >
                              {v.label}
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                    {neededSources.has('driver') && (
                      <div>
                        <Label className="flex items-center gap-2 mb-1">
                          <UserSquare className="h-4 w-4" />
                          Тээвэрчин
                        </Label>
                        <ScrollArea className="h-32 rounded-md border">
                          {drivers.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() =>
                                setLinkedEntities((prev) => ({ ...prev, driverId: d.id }))
                              }
                              className={cn(
                                'flex w-full px-3 py-2 text-left text-sm hover:bg-muted',
                                linkedEntities.driverId === d.id && 'bg-primary/10 font-medium'
                              )}
                            >
                              {d.label}
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                    {neededSources.has('warehouse') && (
                      <div>
                        <Label className="flex items-center gap-2 mb-1">
                          <Warehouse className="h-4 w-4" />
                          Агуулах
                        </Label>
                        <ScrollArea className="h-32 rounded-md border">
                          {warehouses.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() =>
                                setLinkedEntities((prev) => ({ ...prev, warehouseId: w.id }))
                              }
                              className={cn(
                                'flex w-full px-3 py-2 text-left text-sm hover:bg-muted',
                                linkedEntities.warehouseId === w.id && 'bg-primary/10 font-medium'
                              )}
                            >
                              {w.label}
                            </button>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selectedTemplate && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Гэрээний нэр</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Жишээ: Тээврийн гэрээ №1" className="mt-1" />
              </div>
              <div>
                <Label>Гэрээний дугаар</Label>
                <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="CON-2026-0001" className="mt-1" />
              </div>
              <div>
                <Label>Нийт дүн (₮)</Label>
                <Input type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Эхлэх огноо</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Дуусах огноо</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Талбарын утгууд</Label>
              <ScrollArea className="h-64 rounded-md border mt-1 p-3">
                <div className="space-y-3 text-sm">
                  {selectedTemplate.fields.sort((a, b) => a.order - b.order).map((f) => (
                    <div key={f.id} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {f.label}
                        <span className="ml-2 text-[10px] uppercase tracking-wide">{f.fieldType || 'text'}</span>
                      </Label>
                      {renderFieldInput(f)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !canNextStep2) ||
                (step === 2 && !canNextStep3) ||
                loading
              }
            >
              Дараах
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Хадгалах
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
