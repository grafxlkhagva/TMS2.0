'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/patterns/page-container';
import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, FileSignature, ChevronRight } from 'lucide-react';
import { contractService } from '@/services/contractService';
import { ContractKpiCards } from '@/components/contracts/contract-kpi-cards';
import { ContractTable } from '@/components/contracts/contract-table';
import { ContractKanban } from '@/components/contracts/contract-kanban';
import type { Contract, ContractTemplate } from '@/types';

export default function ContractsPage() {
  const [templates, setTemplates] = React.useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        contractService.getTemplates(),
        contractService.getContracts(),
      ]);
      setTemplates(t);
      setContracts(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <PageHeader
        title="Гэрээ"
        description="Гэрээний загвар, үүсгэсэн гэрээнүүд, батлалтын явцыг удирдах"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/contracts/templates/new">
                <FileText className="mr-2 h-4 w-4" />
                Шинэ загвар
              </Link>
            </Button>
            <Button asChild>
              <Link href="/contracts/new">
                <Plus className="mr-2 h-4 w-4" />
                Шинэ гэрээ
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <ContractKpiCards contracts={contracts} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">Бүгд ({contracts.length})</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="templates">Загварууд ({templates.length})</TabsTrigger>
        </TabsList>

        {/* All - DataTable */}
        <TabsContent value="all" className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : contracts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">Гэрээ байхгүй</h3>
                <p className="text-sm text-muted-foreground mb-4">Загвар сонгон шинэ гэрээ үүсгэх</p>
                <Button asChild>
                  <Link href="/contracts/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Шинэ гэрээ үүсгэх
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ContractTable contracts={contracts} />
          )}
        </TabsContent>

        {/* Kanban */}
        <TabsContent value="kanban" className="mt-6">
          {loading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-[280px] shrink-0" />)}
            </div>
          ) : (
            <ContractKanban contracts={contracts} />
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">Загвар байхгүй</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Гэрээний загвар үүсгэж, системийн талбаруудаас мэдээлэл татах боломжтой
                </p>
                <Button asChild>
                  <Link href="/contracts/templates/new">
                    <FileText className="mr-2 h-4 w-4" />
                    Шинэ загвар үүсгэх
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Link key={t.id} href={`/contracts/templates/${t.id}`}>
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer group">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{t.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description || 'Тайлбар байхгүй'}</p>
                          <p className="text-xs text-muted-foreground mt-2">{t.fields.length} талбар</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
