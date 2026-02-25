'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/patterns/page-container';
import { PageHeader } from '@/components/patterns/page-header';
import { EmptyState } from '@/components/patterns/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Workflow,
  Plus,
  MapPin,
  Globe,
  PackageCheck,
  HardHat,
  FileCheck,
  FileX,
  Building2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  NewOperationWizard,
  type NewOperationData,
} from '@/components/transport-operations/new-operation-wizard';
import { transportOperationService } from '@/services/transportOperationService';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { TransportOperation, TransportOperationType } from '@/types';

// ==================== Helpers ====================

export const TRANSPORT_TYPE_META: Record<
  TransportOperationType,
  { label: string; icon: React.ElementType; color: string }
> = {
  local: { label: 'Орон нутгийн тээвэр', icon: MapPin, color: 'bg-blue-100 text-blue-700' },
  international: { label: 'Олон улсын тээвэр', icon: Globe, color: 'bg-purple-100 text-purple-700' },
  distribution: { label: 'Түгээлт', icon: PackageCheck, color: 'bg-green-100 text-green-700' },
  project: { label: 'Төслийн тээвэр', icon: HardHat, color: 'bg-orange-100 text-orange-700' },
};

export const STATUS_META: Record<
  string,
  { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive'; className: string }
> = {
  new: { label: 'Шинэ', variant: 'outline', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  planning: { label: 'Төлөвлөж байна', variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'Явагдаж байна', variant: 'outline', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Дууссан', variant: 'outline', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled: { label: 'Цуцлагдсан', variant: 'outline', className: 'bg-red-50 text-red-600 border-red-200' },
};

// ==================== Page ====================

export default function EndToEndPage() {
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [operations, setOperations] = React.useState<TransportOperation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchOperations = React.useCallback(async () => {
    try {
      const data = await transportOperationService.getAll();
      setOperations(data);
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const handleComplete = async (data: NewOperationData) => {
    try {
      await transportOperationService.create({
        transportType: data.transportType,
        hasContract: data.hasContract,
        customerId: data.customerId,
        customerName: data.customerName,
        status: 'new',
        createdBy: {
          uid: user?.uid || '',
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        },
      });
      toast({
        title: 'Амжилттай',
        description: 'Шинэ тээврийн ажил үүсгэлээ',
      });
      fetchOperations();
    } catch (error) {
      console.error('Error creating operation:', error);
      toast({
        title: 'Алдаа',
        description: 'Тээврийн ажил үүсгэхэд алдаа гарлаа',
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="End-to-End"
        description="Үнийн саналаас хүргэлт хүртэлх тээвэрлэлтийн бүрэн үйл явцыг нэг дороос удирдах"
        actions={
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Шинэ тээврийн ажил
          </Button>
        }
      />

      {/* ===== Loading ===== */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : operations.length > 0 ? (
        /* ===== Operation Cards ===== */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {operations.map((op) => {
            const meta = TRANSPORT_TYPE_META[op.transportType];
            const statusMeta = STATUS_META[op.status] || STATUS_META.new;
            const TypeIcon = meta.icon;

            return (
              <Link
                key={op.id}
                href={`/transport-operations/end-to-end/${op.id}`}
              >
                <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`rounded-lg p-2 ${meta.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{meta.label}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {op.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={statusMeta.variant} className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Харилцагч:</span>
                      <span className="font-medium truncate">{op.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {op.hasContract ? (
                        <FileCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : (
                        <FileX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-muted-foreground">Гэрээ:</span>
                      <span className="font-medium">{op.hasContract ? 'Тийм' : 'Үгүй'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Үүсгэсэн:</span>
                      <span className="font-medium">
                        {op.createdAt.toLocaleString('mn-MN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ===== Empty State ===== */
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Workflow}
              title="Тээврийн ажил байхгүй"
              description="Шинэ тээврийн ажил үүсгэхийн тулд дээрх товчийг дарна уу"
              action={
                <Button onClick={() => setWizardOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Шинэ тээврийн ажил
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* ===== Wizard Dialog ===== */}
      <NewOperationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={handleComplete}
      />
    </PageContainer>
  );
}
