
'use client';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

type PrintQuoteButtonProps = {
  getContent: () => HTMLDivElement | null;
  fileName: string;
  disabled?: boolean;
};

export default function PrintQuoteButton({
  getContent,
  fileName,
  disabled = false,
}: PrintQuoteButtonProps) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handlePrint = useReactToPrint({
    content: getContent,
    documentTitle: fileName,
    onBeforeGetContent: async () => {
      setBusy(true);
      try {
        if ('fonts' in document) {
          await (document as any).fonts.ready;
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
      } catch (e) {
        console.warn('Could not wait for fonts to load.', e);
      }
    },
    onAfterPrint: () => {
      setBusy(false);
    },
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 12mm;
      }
      @media print {
        .no-print {
          display: none !important;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #print-root {
          transform: none !important;
          overflow: visible !important;
          visibility: visible !important;
        }
        #print-root * {
          visibility: visible !important;
        }
      }
    `,
    removeAfterPrint: true,
  });
  
  const onClick = useCallback(() => {
    const el = getContent();
    if (!el) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: `Хэвлэх элемент олдсонгүй.`
      });
      return;
    }
     if (el.offsetHeight === 0) {
        toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Хэвлэх контент одоогоор хоосон байна. Түр хүлээнэ үү.'
        });
        return;
    }
    handlePrint();
  }, [getContent, handlePrint, toast]);


  return (
    <Button
      onClick={onClick}
      disabled={busy || disabled}
      aria-label="Үнийн санал PDF болгон татах"
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Хэвлэж байна...
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
