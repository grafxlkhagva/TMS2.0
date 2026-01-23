'use server';

/**
 * @fileOverview AI agent for analyzing Mongolian national ID card images.
 * Extracts information from Mongolian national ID (Иргэний үнэмлэх) front and back.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeNationalIdInputSchema = z.object({
  frontImageBase64: z.string().optional().describe('Base64 encoded front side of national ID image'),
  backImageBase64: z.string().optional().describe('Base64 encoded back side of national ID image'),
});
export type AnalyzeNationalIdInput = z.infer<typeof AnalyzeNationalIdInputSchema>;

const AnalyzeNationalIdOutputSchema = z.object({
  displayName: z.string().optional().describe('Full name of the person (Овог Нэр)'),
  registerNumber: z.string().optional().describe('Mongolian national ID / register number (Регистрийн дугаар)'),
  birthDate: z.string().optional().describe('Birth date in YYYY-MM-DD format'),
  gender: z.string().optional().describe('Gender (Эрэгтэй/Эмэгтэй)'),
  address: z.string().optional().describe('Registered address'),
  idNumber: z.string().optional().describe('ID card number'),
  issueDate: z.string().optional().describe('ID issue date in YYYY-MM-DD format'),
  expiryDate: z.string().optional().describe('ID expiry date in YYYY-MM-DD format'),
  confidence: z.number().optional().describe('Confidence score 0-100'),
  rawText: z.string().optional().describe('Raw extracted text for debugging'),
});
export type AnalyzeNationalIdOutput = z.infer<typeof AnalyzeNationalIdOutputSchema>;

export async function analyzeNationalId(
  input: AnalyzeNationalIdInput
): Promise<AnalyzeNationalIdOutput> {
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
        text: `You are an expert OCR system specialized in reading Mongolian national ID cards (Иргэний үнэмлэх).
        
Analyze the provided national ID card image(s) and extract the following information:

1. **displayName**: Full name (Овог Нэр) - in Mongolian Cyrillic
2. **registerNumber**: National registration number (Регистрийн дугаар) - format like "УК12345678" (2 Cyrillic letters + 8 digits)
3. **birthDate**: Date of birth in YYYY-MM-DD format
4. **gender**: Gender (Эрэгтэй for male, Эмэгтэй for female)
5. **address**: Registered address if visible
6. **idNumber**: The ID card number
7. **issueDate**: ID card issue date in YYYY-MM-DD format
8. **expiryDate**: ID card expiry date in YYYY-MM-DD format
9. **confidence**: Your confidence in the extraction (0-100)
10. **rawText**: All text you can read from the image(s)

Important notes:
- Mongolian national IDs have text in Mongolian Cyrillic
- The front side usually contains: photo, name, register number, birth date
- The back side usually contains: address, issue/expiry dates
- If you can't read a field clearly, leave it as null/undefined
- For dates, convert to YYYY-MM-DD format
- Register numbers follow the pattern: 2 Cyrillic letters (like УК, АБ, ЕД) + 8 digits

Return a valid JSON object with these fields. Only return the JSON, no markdown.`,
      },
    ],
    output: { schema: AnalyzeNationalIdOutputSchema },
  });

  return output || {};
}
