
'use client';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { captureElementToPdf } from '@/lib/print/pdf';


export default function PrintQuoteButton({
  targetId,
  fileName,
  orientation = 'landscape',
}: { 
  targetId: string; 
  fileName: string; 
  orientation?: 'landscape'|'portrait',
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const onClick = useCallback(async () => {
    const el = document.getElementById(targetId);
    if (!el) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: `Хэвлэх элемент (#${targetId}) олдсонгүй.`
      });
      return;
    }
    
    setBusy(true);
    try {
      const pdfBlob = await captureElementToPdf({
          element: el,
          fileName: fileName,
          orientation: orientation,
          scale: 2,
      });
      
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (e) {
      console.error('PDF export failed', e);
      toast({
        variant: 'destructive',
        title: 'PDF үүсгэхэд алдаа гарлаа',
        description: e instanceof Error ? e.message : 'Дахин оролдоно уу.',
      });
    } finally {
      setBusy(false);
    }
  }, [targetId, fileName, orientation, toast]);

  return (
    <Button
      onClick={onClick}
      disabled={busy}
      aria-label="Үнийн санал PDF болгон татах"
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Экспорт хийж байна…
        </>
       ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          PDF татах
        </>
       )}
    </Button>
  );
}
