/**
 * @fileoverview PDF generation utility using html2canvas and jsPDF.
 * This file provides a robust function to capture an HTML element, convert it to a canvas,
 * and then generate a multi-page A4 PDF, handling content pagination automatically.
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { pxToMm } from './units';

type Margins = { top: number; right: number; bottom: number; left: number };

type CaptureOptions = {
  element: HTMLElement;
  fileName: string;
  orientation?: 'landscape' | 'portrait';
  marginsMm?: Margins;
  scale?: number;
  background?: string;
};

/**
 * Captures an HTML element and generates a paginated PDF.
 * @param {CaptureOptions} opts - The options for PDF generation.
 * @returns {Promise<void>} A promise that resolves when the PDF has been saved.
 * @throws Will throw an error if the canvas context cannot be created.
 */
export async function captureElementToPdf(opts: CaptureOptions): Promise<void> {
  const {
    element,
    fileName,
    orientation = 'landscape',
    marginsMm = { top: 10, right: 10, bottom: 10, left: 10 },
    // Use a higher scale for better quality on HiDPI/Retina screens.
    scale = Math.min(2, window.devicePixelRatio || 1) * 2,
    background = '#ffffff',
  } = opts;

  if (!element) {
    throw new Error('Target element for PDF capture not found.');
  }
  
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: background,
    useCORS: true, // Allow loading of cross-origin images
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation,
    compress: true, // Reduces file size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const printableWidth = pageWidth - (marginsMm.left + marginsMm.right);
  const printableHeight = pageHeight - (marginsMm.top + marginsMm.bottom);

  // Scale the canvas image to fit the printable width of the PDF page.
  const imgWidthMm = printableWidth;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  let remainingHeightMm = imgHeightMm;
  let srcY = 0; // The Y-coordinate in pixels on the source canvas to start slicing from.

  // The height of a single PDF page's content area in pixels of the source canvas.
  const sliceHeightPx = Math.floor((printableHeight / imgHeightMm) * canvas.height);

  let isFirstPage = true;
  while (remainingHeightMm > 0.1) { // Use a small threshold for floating point inaccuracies
    if (!isFirstPage) {
      doc.addPage();
    }
    
    // The height of the current slice might be smaller than a full page if it's the last one.
    const currentSliceHeightPx = Math.min(sliceHeightPx, canvas.height - srcY);

    // Create a temporary canvas to hold the slice of the original canvas.
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeightPx;

    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas slice.');
    }
    
    // Draw the slice from the master canvas onto the temporary canvas.
    ctx.drawImage(
      canvas,
      0, srcY, // Source rectangle (x, y, width, height)
      canvas.width, currentSliceHeightPx,
      0, 0, // Destination rectangle (x, y, width, height)
      canvas.width, currentSliceHeightPx
    );

    const sliceDataUrl = sliceCanvas.toDataURL('image/png', 1.0); // Use high-quality PNG
    const sliceHeightMm = (sliceCanvas.height * imgWidthMm) / sliceCanvas.width;

    doc.addImage(
      sliceDataUrl,
      'PNG',
      marginsMm.left,
      marginsMm.top,
      imgWidthMm,
      sliceHeightMm,
      undefined,
      'FAST' // Use fast compression
    );

    srcY += sliceHeightPx;
    remainingHeightMm -= printableHeight;
    isFirstPage = false;
  }

  doc.save(fileName);
}
