'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Editor } from '@tiptap/react';
import { PageContainer } from '@/components/patterns/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { contractService } from '@/services/contractService';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { TemplateEditor } from '@/components/contracts/template-editor';
import { TemplateFieldSidebar } from '@/components/contracts/template-field-sidebar';
import { TemplatePreviewDialog } from '@/components/contracts/template-preview-dialog';

export default function NewTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [content, setContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const editorRef = React.useRef<Editor | null>(null);

  const handleInsertPlaceholder = (source: string, path: string, label: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().insertPlaceholder({ source, path, label }).run();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Загварын нэр оруулна уу', variant: 'destructive' });
      return;
    }
    if (!content.trim() || content === '<p></p>') {
      toast({ title: 'Гэрээний текст бичнэ үү', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Extract fields from content placeholders
      const fields = extractFieldsFromContent(content);
      const id = await contractService.createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        content,
        fields,
        createdBy: {
          uid: user?.uid || '',
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        },
      });
      toast({ title: 'Амжилттай', description: 'Загвар үүслээ' });
      router.push(`/contracts/templates/${id}`);
    } catch (error) {
      console.error(error);
      toast({ title: 'Алдаа', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/contracts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold">Шинэ гэрээний загвар</h1>
            <p className="text-sm text-muted-foreground">
              Гэрээний бүтэн текстийг бичиж, системийн талбарууд оруулна
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!content}>
            <Eye className="mr-2 h-4 w-4" />
            Урьдчилан харах
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </Button>
        </div>
      </div>

      {/* Name + Description */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Загварын нэр *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Жишээ: Тээврийн үйлчилгээний гэрээ"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="desc">Тайлбар</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Загварын товч тайлбар..."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2-Panel Layout: Editor + Sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <TemplateEditor content={content} onChange={setContent} editorRef={editorRef} />
        <TemplateFieldSidebar onInsertPlaceholder={handleInsertPlaceholder} />
      </div>

      {/* Preview Dialog */}
      <TemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        content={content}
        title={name || 'Гэрээний загвар'}
      />
    </PageContainer>
  );
}

/** HTML content-оос placeholder-уудыг задлан fields массив үүсгэнэ */
function extractFieldsFromContent(html: string): {
  id: string;
  label: string;
  source: 'customer' | 'vehicle' | 'driver' | 'warehouse' | 'manual';
  sourcePath?: string;
  required: boolean;
  order: number;
}[] {
  const regex = /data-source="([^"]+)"\s+data-path="([^"]+)"[^>]*>([^<]*)</g;
  const seen = new Set<string>();
  const fields: ReturnType<typeof extractFieldsFromContent> = [];
  let match;
  let order = 0;

  while ((match = regex.exec(html)) !== null) {
    const source = match[1] as 'customer' | 'vehicle' | 'driver' | 'warehouse';
    const path = match[2];
    const key = `${source}.${path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const labelText = match[3].replace(/[{}]/g, '').trim();
    fields.push({
      id: crypto.randomUUID(),
      label: labelText,
      source,
      sourcePath: path,
      required: false,
      order: order++,
    });
  }
  return fields;
}
