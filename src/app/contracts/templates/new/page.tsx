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
import type { ContractFieldSource, ContractFieldValueType } from '@/types';

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

  const handleInsertPlaceholder = (
    source: string,
    path: string,
    label: string,
    fieldType: ContractFieldValueType = 'text',
    selectOptions?: string[]
  ) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertPlaceholder({
        source,
        path,
        label,
        fieldType,
        options: selectOptions && selectOptions.length > 0 ? JSON.stringify(selectOptions) : '',
      })
      .run();
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
  source: ContractFieldSource;
  fieldType?: ContractFieldValueType;
  sourcePath?: string;
  selectOptions?: string[];
  required: boolean;
  order: number;
}[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.querySelectorAll('span[data-placeholder][data-source]'));
  const seen = new Set<string>();
  const fields: ReturnType<typeof extractFieldsFromContent> = [];
  let order = 0;

  for (const node of nodes) {
    const source = (node.getAttribute('data-source') || '') as ContractFieldSource;
    const sourcePath = node.getAttribute('data-path') || '';
    const fieldType = (node.getAttribute('data-field-type') || 'text') as ContractFieldValueType;
    const optionsRaw = node.getAttribute('data-options') || '';
    let selectOptions: string[] | undefined = undefined;
    if (optionsRaw) {
      try {
        const parsed = JSON.parse(optionsRaw);
        if (Array.isArray(parsed)) {
          selectOptions = parsed.map((v) => String(v)).filter(Boolean);
        }
      } catch {
        selectOptions = optionsRaw.split(',').map((v) => v.trim()).filter(Boolean);
      }
    }
    const labelText = (node.textContent || '').replace(/[{}]/g, '').trim();

    if (!source || !labelText) continue;

    const dedupeKey = source === 'manual'
      ? `manual.${sourcePath || labelText}`
      : `${source}.${sourcePath}`;

    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    fields.push({
      id: crypto.randomUUID(),
      label: labelText,
      source,
      fieldType,
      sourcePath: sourcePath || undefined,
      selectOptions,
      required: false,
      order: order++,
    });
  }

  return fields;
}
