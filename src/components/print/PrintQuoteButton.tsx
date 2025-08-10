
'use client';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

export default function PrintQuoteButton({
  targetId,
  fileName,
  orientation = 'landscape',
  onPreview,
}: { 
  targetId: string; 
  fileName: string; 
  orientation?: 'landscape'|'portrait',
  onPreview: (url: string) => void;
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
      // Fetch the global CSS content
      const cssResponse = await fetch('/globals.css');
      const cssContent = await cssResponse.text();

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: el.innerHTML,
          cssContent: cssContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const pdfBlob = await response.blob();
      const url = URL.createObjectURL(pdfBlob);
      onPreview(url);
      
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
  }, [targetId, toast, onPreview]);

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
          Үнийн санал хэвлэх
        </>
       )}
    </Button>
  );
}
