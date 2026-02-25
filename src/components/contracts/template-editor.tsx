'use client';

import * as React from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { TemplatePlaceholder } from './placeholder-extension';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Minus,
} from 'lucide-react';

interface TemplateEditorProps {
  content: string;
  onChange: (html: string) => void;
  editorRef?: React.MutableRefObject<Editor | null>;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md hover:bg-muted transition-colors',
        active && 'bg-muted text-primary'
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Буцаах">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Дахин">
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Тод"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Налуу"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Доогуур зураас"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Дундуур зураас"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Гарчиг 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Гарчиг 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Гарчиг 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Жагсаалт"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Дугаарласан жагсаалт"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Зүүн"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Голд"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Баруун"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Хэвтээ шугам"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function TemplateEditor({ content, onChange, editorRef }: TemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Гэрээний загварын текстийг энд бичнэ...' }),
      TemplatePlaceholder,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  React.useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border overflow-hidden bg-background">
      <EditorToolbar editor={editor} />
      <style jsx global>{`
        .placeholder-chip {
          display: inline-flex;
          align-items: center;
          padding: 1px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          vertical-align: baseline;
          cursor: default;
          user-select: none;
        }
        .placeholder-customer {
          background-color: hsl(217 91% 95%);
          color: hsl(217 91% 40%);
          border: 1px solid hsl(217 91% 85%);
        }
        .placeholder-vehicle {
          background-color: hsl(142 76% 93%);
          color: hsl(142 76% 30%);
          border: 1px solid hsl(142 76% 80%);
        }
        .placeholder-driver {
          background-color: hsl(25 95% 93%);
          color: hsl(25 95% 35%);
          border: 1px solid hsl(25 95% 80%);
        }
        .placeholder-warehouse {
          background-color: hsl(280 67% 94%);
          color: hsl(280 67% 35%);
          border: 1px solid hsl(280 67% 82%);
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
          opacity: 0.5;
        }
        .ProseMirror {
          min-height: 400px;
        }
        .ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; }
        .ProseMirror h2 { font-size: 1.25em; font-weight: 700; margin-top: 0.8em; margin-bottom: 0.4em; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin-top: 0.6em; margin-bottom: 0.3em; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; }
        .ProseMirror hr { border-color: hsl(var(--border)); margin: 1em 0; }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );
}
