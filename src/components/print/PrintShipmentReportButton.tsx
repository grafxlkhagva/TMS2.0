
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

    // Ensure fonts are loaded before capturing
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: true,
    });
    
    element.style.width = originalWidth;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    if (imgHeight === 0) {
        throw new Error("Canvas height is zero, cannot generate PDF.");
    }
    
    const ratio = imgWidth / pdfWidth;
    const finalHeight = imgHeight / ratio;

    let heightLeft = finalHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = heightLeft - finalHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
        heightLeft -= pdfHeight;
    }

    pdf.save(fileName);
}


type PrintShipmentReportButtonProps = {
  targetRef: React.RefObject<HTMLElement>;
  fileName: string;
  disabled?: boolean;
};

export default function PrintShipmentReportButton({
  targetRef,
  fileName,
  disabled = false,
}: PrintShipmentReportButtonProps) {
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
      aria-label="Тайлан PDF-ээр татах"
      className="no-print"
      variant="outline"
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Боловсруулж байна...
        </>
       ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Тээврийн тайлан татах
        </>
       )}
    </Button>
  );
}
