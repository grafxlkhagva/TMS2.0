
/**
 * Standard DPI used for web calculations.
 */
export const DPI = 96;

/**
 * A4 paper dimensions in millimeters (landscape).
 */
export const A4_MM_WIDTH = 297;
export const A4_MM_HEIGHT = 210;

/**
 * Converts millimeters to pixels.
 * @param mm Millimeters to convert.
 * @returns Equivalent value in pixels.
 */
export const mmToPx = (mm: number): number => (mm * DPI) / 25.4;

/**
 * Converts pixels to millimeters.
 * @param px Pixels to convert.
 * @returns Equivalent value in millimeters.
 */
export const pxToMm = (px: number): number => (px * 25.4) / DPI;

/**
 * Approximate width of an A4 landscape page in pixels at standard DPI.
 * This is used to set the width of the HTML element before capturing it with html2canvas.
 * 297mm * 96 DPI / 25.4 mm/inch ≈ 1122.5 px
 */
export const A4_WIDTH_PX = Math.round(mmToPx(A4_MM_WIDTH));
