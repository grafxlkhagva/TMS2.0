/**
 * @fileoverview PDF generation utility using html2canvas and jsPDF.
 * This file provides a robust function to capture an HTML element, convert it to a canvas,
 * and then generate a multi-page A4 PDF, handling content pagination automatically.
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Margins = { top: number; right: number; bottom: number; left: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function captureElementToPdf(opts: {
  element: HTMLElement;
  fileName: string;
  orientation?: 'landscape' | 'portrait';
  marginsMm?: Margins;
  background?: string;
  scale?: number; // integer 2..3
}): Promise<void> {
  const {
    element,
    fileName,
    orientation = 'landscape',
    marginsMm = { top: 10, right: 10, bottom: 10, left: 10 },
    background = '#ffffff',
    scale = clamp((window.devicePixelRatio || 1) * 2, 2, 3),
  } = opts;

  // Wait for webfonts to load to prevent glued/overlapping letters
  if ('fonts' in document) {
    try {
      await (document as any).fonts.ready;
    } catch (e) {
      console.warn('Could not wait for fonts to load.', e);
    }
  }

  // Force a fixed width during capture to avoid right-edge clipping
  const prevWidth = element.style.width;
  element.style.width = '1123px';

  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: background,
    useCORS: true,
    logging: false,
    windowWidth: Math.max(element.scrollWidth, 1123),
    windowHeight: element.scrollHeight,
    foreignObjectRendering: true,
    letterRendering: true, // Crucial for correct text spacing
    removeContainer: true,
  });
  
  // Restore original width after capture
  element.style.width = prevWidth;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const printableW = pageW - (marginsMm.left + marginsMm.right);
  const printableH = pageH - (marginsMm.top + marginsMm.bottom);

  const imgWmm = printableW;
  const imgHmm = (canvas.height * imgWmm) / canvas.width;

  const pxPerMm = canvas.height / imgHmm;
  const sliceHeightPx = Math.floor(printableH * pxPerMm);

  let srcY = 0;
  let isFirstPage = true;

  while (srcY < canvas.height) {
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - srcY);

    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    
    // Draw the slice from the master canvas onto the temporary canvas.
    ctx.drawImage(
      canvas,
      0, srcY, // Source rectangle (x, y, width, height)
      sliceCanvas.width, sliceCanvas.height,
      0, 0, // Destination rectangle (x, y, width, height)
      sliceCanvas.width, sliceCanvas.height
    );

    const sliceDataUrl = sliceCanvas.toDataURL('image/png');

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    const sliceHeightMm = (sliceCanvas.height * imgWmm) / sliceCanvas.width;
    doc.addImage(sliceDataUrl, 'PNG', marginsMm.left, marginsMm.top, imgWmm, sliceHeightMm, undefined, 'FAST');

    srcY += sliceHeightPx;
  }

  doc.save(fileName);
}
