
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { A4_WIDTH_PX } from '@/lib/print/units';


async function captureElementToPdf(element: HTMLElement, fileName: string): Promise<void> {
    const originalWidth = element.style.width;
    element.style.width = `${A4_WIDTH_PX}px`;

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: true,
    });
    
    element.style.width = originalWidth;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Prevent division by zero
    if (canvasHeight === 0) {
        throw new Error("Canvas height is zero, cannot generate PDF.");
    }
    
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const pdfAspectRatio = pdfWidth / pdfHeight;

    let finalWidth, finalHeight;

    if (canvasAspectRatio > pdfAspectRatio) {
        finalWidth = pdfWidth;
        finalHeight = pdfWidth / canvasAspectRatio;
    } else {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * canvasAspectRatio;
    }

    // Ensure final dimensions are valid numbers
    if (!isFinite(finalWidth) || !isFinite(finalHeight) || finalWidth <= 0 || finalHeight <= 0) {
       console.error("Invalid calculated dimensions for PDF. Using fallback.", { finalWidth, finalHeight });
       // Fallback to simpler scaling
       finalWidth = pdfWidth;
       finalHeight = pdfHeight;
    }

    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;
    
    // Ensure coordinates are valid numbers
    if (!isFinite(x) || !isFinite(y)) {
        throw new Error(`Invalid coordinates for PDF: x=${x}, y=${y}`);
    }

    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save(fileName);
}


type PrintQuoteButtonProps = {
  targetRef: React.RefObject<HTMLElement>;
  fileName: string;
  disabled?: boolean;
};

export default function PrintQuoteButton({
  targetRef,
  fileName,
  disabled = false,
}: PrintQuoteButtonProps) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleCreatePdf = async () => {
    setBusy(true);
    try {
      const element = targetRef.current;
      if (!element) {
        throw new Error('Could not find element to print.');
      }
      await captureElementToPdf(element, fileName);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'PDF үүсгэхэд алдаа гарлаа. Та дахин оролдоно уу.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={handleCreatePdf}
      disabled={busy || disabled}
      aria-label="Үнийн санал PDF-ээр татах"
      className="no-print"
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Боловсруулж байна...
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
