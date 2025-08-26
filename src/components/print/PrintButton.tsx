
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type PrintButtonProps = {
  targetRef: React.RefObject<HTMLElement>;
  fileName: string;
  disabled?: boolean;
  orientation?: 'portrait' | 'landscape';
  buttonLabel?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

async function captureElementToPdf(
    element: HTMLElement, 
    fileName: string, 
    orientation: 'portrait' | 'landscape'
): Promise<void> {
    
    // Create a clone of the element to ensure styles are computed correctly.
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Style the clone to be off-screen but visible for rendering.
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0px';
    clone.style.width = element.scrollWidth + 'px'; // Use scrollWidth for full content width
    clone.style.height = 'auto'; // Let height be determined by content
    clone.style.visibility = 'visible'; // Ensure it's not hidden
    
    document.body.appendChild(clone);
    
    // Small delay to allow fonts/images to potentially load in the cloned element
    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
    });
    
    // Clean up by removing the clone from the DOM
    document.body.removeChild(clone);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
        compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    if (canvasHeight === 0) {
        throw new Error("Canvas height is zero, cannot generate PDF.");
    }
    
    const canvasAspectRatio = canvasWidth / canvasHeight;

    let finalWidth, finalHeight;
    
    // Fit image to page dimensions, preserving aspect ratio
    const pdfAspectRatio = pdfWidth / pdfHeight;

    if (canvasAspectRatio > pdfAspectRatio) {
      finalWidth = pdfWidth;
      finalHeight = pdfWidth / canvasAspectRatio;
    } else {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * canvasAspectRatio;
    }

    if (!isFinite(finalWidth) || !isFinite(finalHeight) || finalWidth <= 0 || finalHeight <= 0) {
       throw new Error(`Invalid calculated dimensions for PDF. W: ${finalWidth}, H: ${finalHeight}`);
    }
    
    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;
    
    if (!isFinite(x) || !isFinite(y)) {
        throw new Error(`Invalid coordinates for PDF: x=${x}, y=${y}`);
    }
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(fileName);
}


export default function PrintButton({
  targetRef,
  fileName,
  disabled = false,
  orientation = 'portrait',
  buttonLabel = 'PDF Татах',
  buttonVariant = "outline",
}: PrintButtonProps) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleCreatePdf = async () => {
    setBusy(true);
    try {
      const element = targetRef.current;
      if (!element) {
        throw new Error('Could not find element to print.');
      }
      await captureElementToPdf(element, fileName, orientation);
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
      aria-label="PDF-ээр татах"
      className="no-print"
      variant={buttonVariant}
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Боловсруулж байна...
        </>
       ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {buttonLabel}
        </>
       )}
    </Button>
  );
}
