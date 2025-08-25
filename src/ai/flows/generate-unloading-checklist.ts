'use server';

/**
 * @fileOverview AI agent for generating an unloading checklist.
 *
 * - generateUnloadingChecklist - A function that generates a safety and security checklist for unloading cargo.
 * - GenerateUnloadingChecklistInput - The input type for the function.
 * - GenerateUnloadingChecklistOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateUnloadingChecklistInputSchema = z.object({
  cargoInfo: z
    .string()
    .describe('A summary of the cargo being unloaded, including type, quantity, and packaging.'),
  vehicleInfo: z
    .string()
    .describe('A summary of the vehicle and trailer that was used for transport.'),
});
export type GenerateUnloadingChecklistInput = z.infer<typeof GenerateUnloadingChecklistInputSchema>;

const GenerateUnloadingChecklistOutputSchema = z.object({
  checklistItems: z
    .array(z.string())
    .describe('A list of checklist items for the driver to confirm before unloading.'),
});
export type GenerateUnloadingChecklistOutput = z.infer<typeof GenerateUnloadingChecklistOutputSchema>;

export async function generateUnloadingChecklist(
  input: GenerateUnloadingChecklistInput
): Promise<GenerateUnloadingChecklistOutput> {
  return generateUnloadingChecklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUnloadingChecklistPrompt',
  input: { schema: GenerateUnloadingChecklistInputSchema },
  output: { schema: GenerateUnloadingChecklistOutputSchema },
  prompt: `You are a logistics and transportation safety expert. Your responses must be in Mongolian.
Your task is to generate a concise and critical checklist for a driver preparing to unload cargo at the destination.
The checklist should be based on the specific cargo and vehicle information provided.
Focus on safety, verifying the destination, proper unloading procedures, and checking for damage.
Keep the checklist items short and clear. Generate between 4 and 6 critical items.

Cargo Information: {{{cargoInfo}}}
Vehicle Information: {{{vehicleInfo}}}

Generate a JSON object with a key "checklistItems" containing an array of strings in Mongolian.
For example:
{
  "checklistItems": [
    "Хүргэлтийн хаяг болон буулгах зориулалтын талбайг баталгаажуулах.",
    "Тээвэрлэлтийн явцад ачаанд шилжилт, гэмтэл гарсан эсэхийг шалгах.",
    "Буулгах талбай нь тээврийн хэрэгсэлд аюулгүй, тохиромжтой эсэхийг шалгах.",
    "Гэмтэл, бэртлээс сэргийлж, зөв өргөх техник, тоног төхөөрөмжийг ашиглах.",
    "Хүлээн авагчтай хамт бүх зүйлийг хүргэлтийн manifest-тэй тулган шалгах."
  ]
}
`,
});

const generateUnloadingChecklistFlow = ai.defineFlow(
  {
    name: 'generateUnloadingChecklistFlow',
    inputSchema: GenerateUnloadingChecklistInputSchema,
    outputSchema: GenerateUnloadingChecklistOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
