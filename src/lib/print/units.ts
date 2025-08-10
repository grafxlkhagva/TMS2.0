/**
 * @fileoverview Pixel to Millimeter conversion utilities for PDF generation.
 * This file provides helper functions to convert between pixels (px) and millimeters (mm),
 * assuming a standard screen resolution of 96 DPI, which is the default for most modern browsers like Chrome.
 */

// Standard Dots Per Inch (DPI) for web browsers.
const DPI = 96;
const INCH_TO_MM = 25.4;

/**
 * Converts a value from pixels to millimeters.
 * @param {number} px The value in pixels.
 * @returns {number} The equivalent value in millimeters.
 */
export const pxToMm = (px: number): number => (px * INCH_TO_MM) / DPI;

/**
 * Converts a value from millimeters to pixels.
 * @param {number} mm The value in millimeters.
 * @returns {number} The equivalent value in pixels.
 */
export const mmToPx = (mm: number): number => (mm * DPI) / INCH_TO_MM;

export { DPI };
