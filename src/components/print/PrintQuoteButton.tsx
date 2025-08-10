'use client';

import * as React from 'react';
import { captureElementToPdf } from '@/lib/print/pdf';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

type PrintQuoteButtonProps = {
  targetId: string;
  fileName: string;
  orientation?: 'landscape' | 'portrait';
  disabled?: boolean;
};

export default function PrintQuoteButton({
  targetId,
  fileName,
  orientation = 'landscape',
  disabled = false,
}: PrintQuoteButtonProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);
  const { toast } = useToast();

  const handlePrint = React.useCallback(async () => {
    const element = document.getElementById(targetId);
    if (!element) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: `Хэвлэх элемент (#${targetId}) олдсонгүй.`,
      });
      return;
    }

    setIsPrinting(true);
    try {
      await captureElementToPdf({
        element,
        fileName,
        orientation,
        marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
        background: '#ffffff',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        variant: 'destructive',
        title: 'PDF үүсгэхэд алдаа гарлаа',
        description: error instanceof Error ? error.message : 'Дахин оролдоно уу.',
      });
    } finally {
      setIsPrinting(false);
    }
  }, [targetId, fileName, orientation, toast]);

  return (
    <Button
      onClick={handlePrint}
      disabled={isPrinting || disabled}
      aria-label="Үнийн санал PDF болгон татах"
      className="w-full"
    >
      {isPrinting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Экспорт хийж байна...
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
