'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/patterns/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, FileSignature, Clock, User, Building2, CalendarDays, DollarSign,
} from 'lucide-react';
import { contractService } from '@/services/contractService';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CONTRACT_STATUS_META } from '@/lib/contract-constants';
import { ContractStatusStepper } from '@/components/contracts/contract-status-stepper';
import { ContractApprovalChain } from '@/components/contracts/contract-approval-chain';
import { ContractActivityLog } from '@/components/contracts/contract-activity-log';
import { ContractActions } from '@/components/contracts/contract-actions';
import { SubmitReviewDialog } from '@/components/contracts/submit-review-dialog';
import type { Contract } from '@/types';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const [contract, setContract] = React.useState<Contract | null>(null);
  const [template, setTemplate] = React.useState<Awaited<ReturnType<typeof contractService.getTemplateById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false);
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<'approve' | 'reject' | 'revision' | 'terminate' | null>(null);
  const [actionComment, setActionComment] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchContract = React.useCallback(async () => {
    if (!id) return;
    try {
      const c = await contractService.getContractById(id);
      setContract(c);
      if (c?.templateId) {
        const t = await contractService.getTemplateById(c.templateId);
        setTemplate(t);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { fetchContract(); }, [fetchContract]);

  const currentUser = { uid: user?.uid || '', name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() };
  const isStaff = ['admin', 'management', 'transport_manager'].includes(user?.role || '');

  const handleSubmitForReview = async (approvers: { uid: string; name: string; role: string }[]) => {
    if (!contract) return;
    try {
      await contractService.submitForReview(id, contract, approvers, currentUser);
      toast({ title: 'Хянуулахаар илгээлээ' });
      fetchContract();
    } catch { toast({ title: 'Алдаа', variant: 'destructive' }); }
  };

  const openActionDialog = (type: 'approve' | 'reject' | 'revision' | 'terminate') => {
    setActionType(type);
    setActionComment('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!contract || !actionType) return;
    setActionLoading(true);
    try {
      switch (actionType) {
        case 'approve':
          await contractService.approve(id, contract, currentUser.uid, currentUser.name, actionComment || undefined);
          toast({ title: 'Батлагдлаа' });
          break;
        case 'reject':
          await contractService.reject(id, contract, currentUser.uid, currentUser.name, actionComment || 'Татгалзсан');
          toast({ title: 'Татгалзлаа' });
          break;
        case 'revision':
          await contractService.requestRevision(id, contract, currentUser.uid, currentUser.name, actionComment || 'Засвар шаардлагатай');
          toast({ title: 'Засвар шаардлаа' });
          break;
        case 'terminate':
          await contractService.terminate(id, contract, currentUser, actionComment || undefined);
          toast({ title: 'Цуцлагдлаа' });
          break;
      }
      setActionDialogOpen(false);
      fetchContract();
    } catch { toast({ title: 'Алдаа', variant: 'destructive' }); }
    finally { setActionLoading(false); }
  };

  const handleActivate = async () => {
    if (!contract) return;
    try {
      await contractService.activate(id, contract, currentUser);
      toast({ title: 'Идэвхжүүллээ' });
      fetchContract();
    } catch { toast({ title: 'Алдаа', variant: 'destructive' }); }
  };

  const handleResubmit = async () => {
    if (!contract) return;
    try {
      await contractService.resubmit(id, contract, currentUser);
      toast({ title: 'Дахин илгээлээ' });
      fetchContract();
    } catch { toast({ title: 'Алдаа', variant: 'destructive' }); }
  };

  const actionDialogTitles = {
    approve: 'Гэрээ батлах',
    reject: 'Гэрээ татгалзах',
    revision: 'Засвар шаардах',
    terminate: 'Гэрээ цуцлах',
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><Skeleton className="h-64 w-full" /></div>
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!contract) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Гэрээ олдсонгүй</p>
        <Button variant="outline" asChild className="mt-4"><Link href="/contracts">Буцах</Link></Button>
      </PageContainer>
    );
  }

  const statusMeta = CONTRACT_STATUS_META[contract.status] || CONTRACT_STATUS_META.draft;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/contracts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="rounded-lg bg-primary/10 p-2">
            <FileSignature className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-headline font-bold">{contract.title}</h1>
              <Badge className={`${statusMeta.bgColor} ${statusMeta.color} ${statusMeta.borderColor} border`}>
                {statusMeta.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{contract.contractNumber} • {contract.templateName}</p>
          </div>
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <Card className="mt-4">
        <CardContent className="pt-6 pb-4">
          <ContractStatusStepper currentStatus={contract.status} />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        {/* Left - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Мэдээлэл</TabsTrigger>
              <TabsTrigger value="approval">Батлалт ({contract.approvalSteps?.length || 0})</TabsTrigger>
              <TabsTrigger value="history">Түүх ({contract.activityLog?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Гэрээний талбарууд</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template
                      ? template.fields.sort((a, b) => a.order - b.order).map((f) => (
                          <div key={f.id} className="flex gap-4 py-2 border-b last:border-0">
                            <span className="text-muted-foreground shrink-0 font-medium">{f.label}:</span>
                            <span>{contract.resolvedData[f.id] || '(хоосон)'}</span>
                          </div>
                        ))
                      : Object.entries(contract.resolvedData).map(([key, value]) => (
                          <div key={key} className="flex gap-4 py-2 border-b last:border-0">
                            <span className="text-muted-foreground shrink-0 font-medium">{key}:</span>
                            <span>{value || '(хоосон)'}</span>
                          </div>
                        ))}
                    {Object.keys(contract.resolvedData).length === 0 && (
                      <p className="text-muted-foreground py-4">Талбар байхгүй</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dates & Value */}
              {(contract.startDate || contract.endDate || contract.totalValue != null) && (
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {contract.startDate && (
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Эхлэх огноо</p>
                            <p className="text-sm font-medium">{new Date(contract.startDate).toLocaleDateString('mn-MN')}</p>
                          </div>
                        </div>
                      )}
                      {contract.endDate && (
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Дуусах огноо</p>
                            <p className="text-sm font-medium">{new Date(contract.endDate).toLocaleDateString('mn-MN')}</p>
                          </div>
                        </div>
                      )}
                      {contract.totalValue != null && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Нийт дүн</p>
                            <p className="text-sm font-medium">{contract.totalValue.toLocaleString()}₮</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="approval" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Батлалтын явц</CardTitle></CardHeader>
                <CardContent>
                  <ContractApprovalChain steps={contract.approvalSteps || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Үйл ажиллагааны түүх</CardTitle></CardHeader>
                <CardContent>
                  <ContractActivityLog entries={contract.activityLog || []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Үйлдэл</CardTitle></CardHeader>
            <CardContent>
              <ContractActions
                contract={contract}
                currentUserUid={currentUser.uid}
                isStaff={isStaff}
                onSubmitForReview={() => setSubmitDialogOpen(true)}
                onApprove={() => openActionDialog('approve')}
                onReject={() => openActionDialog('reject')}
                onRequestRevision={() => openActionDialog('revision')}
                onActivate={handleActivate}
                onTerminate={() => openActionDialog('terminate')}
                onResubmit={handleResubmit}
              />
            </CardContent>
          </Card>

          {/* Info Sidebar */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ерөнхий мэдээлэл</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Үүсгэсэн огноо</p>
                  <p className="text-sm font-medium">
                    {contract.createdAt.toLocaleString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Үүсгэсэн</p>
                  <p className="text-sm font-medium">{contract.createdBy?.name || '—'}</p>
                </div>
              </div>
              {contract.linkedEntities?.customerName && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Харилцагч</p>
                      <p className="text-sm font-medium">{contract.linkedEntities.customerName}</p>
                    </div>
                  </div>
                </>
              )}
              {contract.rejectedReason && (
                <>
                  <Separator />
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-xs text-red-600 font-medium">Татгалзсан шалтгаан</p>
                    <p className="text-sm text-red-700 mt-1">{contract.rejectedReason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit for Review Dialog */}
      <SubmitReviewDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onSubmit={handleSubmitForReview}
      />

      {/* Action Dialog (approve/reject/revision/terminate) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{actionType ? actionDialogTitles[actionType] : ''}</DialogTitle>
            <DialogDescription>Сэтгэгдэл үлдээх (заавал биш)</DialogDescription>
          </DialogHeader>
          <Textarea
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            placeholder="Сэтгэгдэл бичих..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Цуцлах</Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              variant={actionType === 'reject' || actionType === 'terminate' ? 'destructive' : 'default'}
            >
              {actionLoading ? 'Уншиж байна...' : 'Баталгаажуулах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
