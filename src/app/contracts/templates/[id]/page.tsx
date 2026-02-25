'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Editor } from '@tiptap/react';
import { PageContainer } from '@/components/patterns/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Eye, Trash2, Clock, User } from 'lucide-react';
import { contractService } from '@/services/contractService';
import { useToast } from '@/hooks/use-toast';
import { SOURCE_LABELS } from '@/lib/contract-field-sources';
import { TemplatePreviewDialog } from '@/components/contracts/template-preview-dialog';
import type { ContractTemplate } from '@/types';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [template, setTemplate] = React.useState<ContractTemplate | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    contractService
      .getTemplateById(id)
      .then(setTemplate)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Загварыг устгах уу?')) return;
    try {
      await contractService.deleteTemplate(id);
      toast({ title: 'Устгагдлаа' });
      router.push('/contracts');
    } catch {
      toast({ title: 'Алдаа', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!template) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Загвар олдсонгүй</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/contracts">Буцах</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/contracts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-headline font-bold">{template.name}</h1>
            <p className="text-muted-foreground">{template.description || 'Тайлбар байхгүй'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!template.content}>
            <Eye className="mr-2 h-4 w-4" />
            Урьдчилан харах
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/contracts/new?templateId=${id}`}>
              Энэ загвараар гэрээ үүсгэх
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Гэрээний текст</TabsTrigger>
          <TabsTrigger value="fields">Талбарууд ({template.fields.length})</TabsTrigger>
          <TabsTrigger value="info">Мэдээлэл</TabsTrigger>
        </TabsList>

        {/* Content tab - rendered HTML */}
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {template.content ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: template.content }}
                />
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  Гэрээний текст оруулаагүй байна (хуучин загвар)
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fields tab */}
        <TabsContent value="fields" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Талбарууд ({template.fields.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {template.fields.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">Талбар байхгүй</p>
              ) : (
                <div className="space-y-3">
                  {template.fields.sort((a, b) => a.order - b.order).map((f, i) => (
                    <div key={f.id} className="flex items-center gap-4 py-3 px-4 rounded-lg border bg-muted/30">
                      <span className="text-muted-foreground w-6">{i + 1}.</span>
                      <span className="font-medium">{f.label}</span>
                      <Badge variant="outline">{SOURCE_LABELS[f.source]}</Badge>
                      {f.sourcePath && (
                        <span className="text-sm text-muted-foreground">({f.sourcePath})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Үүсгэсэн огноо</p>
                  <p className="text-sm font-medium">
                    {template.createdAt.toLocaleString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Үүсгэсэн</p>
                  <p className="text-sm font-medium">{template.createdBy?.name || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        content={template.content || ''}
        title={template.name}
      />
    </PageContainer>
  );
}
