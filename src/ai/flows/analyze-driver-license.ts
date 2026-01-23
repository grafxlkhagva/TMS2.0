'use server';

/**
 * @fileOverview AI agent for analyzing driver's license images.
 * Extracts information from Mongolian driver's license (front and back).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeDriverLicenseInputSchema = z.object({
  frontImageBase64: z.string().optional().describe('Base64 encoded front side of driver license image'),
  backImageBase64: z.string().optional().describe('Base64 encoded back side of driver license image'),
});
export type AnalyzeDriverLicenseInput = z.infer<typeof AnalyzeDriverLicenseInputSchema>;

const AnalyzeDriverLicenseOutputSchema = z.object({
  displayName: z.string().optional().describe('Full name of the driver (Овог Нэр)'),
  registerNumber: z.string().optional().describe('Mongolian national ID / register number (Регистрийн дугаар)'),
  birthDate: z.string().optional().describe('Birth date in YYYY-MM-DD format'),
  licenseNumber: z.string().optional().describe('Driver license number'),
  licenseClasses: z.array(z.string()).optional().describe('License classes/categories (e.g., A, B, BC, C, D, E, M)'),
  licenseExpiryDate: z.string().optional().describe('License expiry date in YYYY-MM-DD format'),
  confidence: z.number().optional().describe('Confidence score 0-100'),
  rawText: z.string().optional().describe('Raw extracted text for debugging'),
});
export type AnalyzeDriverLicenseOutput = z.infer<typeof AnalyzeDriverLicenseOutputSchema>;

export async function analyzeDriverLicense(
  input: AnalyzeDriverLicenseInput
): Promise<AnalyzeDriverLicenseOutput> {
  if (!input.frontImageBase64 && !input.backImageBase64) {
    throw new Error('At least one image is required');
  }

  const mediaItems: Array<{ media: { url: string; contentType: string } }> = [];
  
  if (input.frontImageBase64) {
    mediaItems.push({
      media: {
        url: input.frontImageBase64.startsWith('data:') 
          ? input.frontImageBase64 
          : `data:image/jpeg;base64,${input.frontImageBase64}`,
        contentType: 'image/jpeg',
      },
    });
  }
  
  if (input.backImageBase64) {
    mediaItems.push({
      media: {
        url: input.backImageBase64.startsWith('data:') 
          ? input.backImageBase64 
          : `data:image/jpeg;base64,${input.backImageBase64}`,
        contentType: 'image/jpeg',
      },
    });
  }

  const { output } = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: [
      ...mediaItems,
      {
        text: `You are an expert OCR system specialized in reading Mongolian driver's licenses (Жолооны үнэмлэх).
        
Analyze the provided driver's license image(s) and extract the following information:

1. **displayName**: Full name (Овог Нэр) - usually in Cyrillic Mongolian
2. **registerNumber**: National registration number (Регистрийн дугаар) - format like "УК12345678" 
3. **birthDate**: Date of birth in YYYY-MM-DD format
4. **licenseNumber**: The driver's license number
5. **licenseClasses**: Array of license categories (like A, B, BC, C, D, E, M)
6. **licenseExpiryDate**: Expiry date in YYYY-MM-DD format
7. **confidence**: Your confidence in the extraction (0-100)
8. **rawText**: All text you can read from the image(s)

Important notes:
- Mongolian licenses have text in both Mongolian Cyrillic and sometimes Latin letters
- The front side usually contains: photo, name, birth date, license number
- The back side usually contains: categories/classes, expiry dates
- If you can't read a field clearly, leave it as null/undefined
- For dates, convert to YYYY-MM-DD format
- For license classes, return as array: ["B", "C"] not "BC"

Return a valid JSON object with these fields. Only return the JSON, no markdown.`,
      },
    ],
    output: { schema: AnalyzeDriverLicenseOutputSchema },
  });

  return output || {};
}
