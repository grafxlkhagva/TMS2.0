'use server';

/**
 * @fileOverview AI agent for generating a loading checklist.
 *
 * - generateLoadingChecklist - A function that generates a safety and security checklist for loading cargo.
 * - GenerateLoadingChecklistInput - The input type for the function.
 * - GenerateLoadingChecklistOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLoadingChecklistInputSchema = z.object({
  cargoInfo: z
    .string()
    .describe('A summary of the cargo being loaded, including type, quantity, and packaging.'),
  vehicleInfo: z
    .string()
    .describe('A summary of the vehicle and trailer being used for transport.'),
});
export type GenerateLoadingChecklistInput = z.infer<typeof GenerateLoadingChecklistInputSchema>;

const GenerateLoadingChecklistOutputSchema = z.object({
  checklistItems: z
    .array(z.string())
    .describe('A list of checklist items for the driver to confirm before loading.'),
});
export type GenerateLoadingChecklistOutput = z.infer<typeof GenerateLoadingChecklistOutputSchema>;

export async function generateLoadingChecklist(
  input: GenerateLoadingChecklistInput
): Promise<GenerateLoadingChecklistOutput> {
  return generateLoadingChecklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLoadingChecklistPrompt',
  input: { schema: GenerateLoadingChecklistInputSchema },
  output: { schema: GenerateLoadingChecklistOutputSchema },
  prompt: `You are a logistics and transportation safety expert. Your responses must be in Mongolian.
Your task is to generate a concise and critical checklist for a driver preparing to load cargo.
The checklist should be based on the specific cargo and vehicle information provided.
Focus on safety, proper loading procedures, and securing the cargo.
Keep the checklist items short and clear. Generate between 4 and 6 critical items.

Cargo Information: {{{cargoInfo}}}
Vehicle Information: {{{vehicleInfo}}}

Generate a JSON object with a key "checklistItems" containing an array of strings in Mongolian.
For example:
{
  "checklistItems": [
    "Баглаа боодлын харагдах гэмтэл байгаа эсэхийг шалгах.",
    "Тээврийн хэрэгслийн ачих хэсэг цэвэр, хуурай байгаа эсэхийг нягтлах.",
    "Ачааны жин тээврийн хэрэгслийн даацаас хэтрээгүйг баталгаажуулах.",
    "Ачаа бэхлэх оосор, тоноглол хэвийн нөхцөлд байгааг шалгах."
  ]
}
`,
});

const generateLoadingChecklistFlow = ai.defineFlow(
  {
    name: 'generateLoadingChecklistFlow',
    inputSchema: GenerateLoadingChecklistInputSchema,
    outputSchema: GenerateLoadingChecklistOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
