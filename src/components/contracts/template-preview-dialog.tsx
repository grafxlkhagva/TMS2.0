'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, X } from 'lucide-react';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  title: string;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  content,
  title,
}: TemplatePreviewDialogProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            max-width: 170mm;
            margin: 0 auto;
          }
          h1 { font-size: 18pt; text-align: center; margin-bottom: 1em; }
          h2 { font-size: 14pt; margin-top: 1em; }
          h3 { font-size: 12pt; margin-top: 0.8em; }
          ul, ol { padding-left: 2em; }
          hr { border: none; border-top: 1px solid #999; margin: 1em 0; }
          .placeholder-chip {
            background: #FEF3C7;
            color: #92400E;
            padding: 1px 6px;
            border-radius: 3px;
            font-weight: 600;
            font-size: 11pt;
            border: 1px dashed #D97706;
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-row items-center justify-between">
          <DialogTitle>Урьдчилан харах: {title}</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Хэвлэх
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          {/* A4 Preview */}
          <div className="px-6 pb-6">
            <div
              ref={printRef}
              className="bg-white border rounded-lg shadow-sm mx-auto"
              style={{
                width: '210mm',
                minHeight: '297mm',
                maxWidth: '100%',
                padding: '20mm',
                fontFamily: "'Times New Roman', serif",
                fontSize: '12pt',
                lineHeight: '1.6',
                color: '#000',
              }}
            >
              <style>{`
                .a4-preview h1 { font-size: 18pt; text-align: center; margin-bottom: 1em; font-weight: 700; }
                .a4-preview h2 { font-size: 14pt; margin-top: 1em; font-weight: 700; }
                .a4-preview h3 { font-size: 12pt; margin-top: 0.8em; font-weight: 600; }
                .a4-preview p { margin: 0.4em 0; }
                .a4-preview ul, .a4-preview ol { padding-left: 2em; }
                .a4-preview hr { border: none; border-top: 1px solid #ccc; margin: 1em 0; }
                .a4-preview .placeholder-chip {
                  display: inline;
                  background: #FEF3C7;
                  color: #92400E;
                  padding: 1px 6px;
                  border-radius: 3px;
                  font-weight: 600;
                  font-size: 11pt;
                  border: 1px dashed #D97706;
                }
              `}</style>
              <div
                className="a4-preview"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
