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
  prompt: `You are a logistics and transportation safety expert.
Your task is to generate a concise and critical checklist for a driver preparing to unload cargo at the destination.
The checklist should be based on the specific cargo and vehicle information provided.
Focus on safety, verifying the destination, proper unloading procedures, and checking for damage.
Keep the checklist items short and clear. Generate between 4 and 6 critical items.

Cargo Information: {{{cargoInfo}}}
Vehicle Information: {{{vehicleInfo}}}

Generate a JSON object with a key "checklistItems" containing an array of strings.
For example:
{
  "checklistItems": [
    "Verify the delivery address and designated unloading area.",
    "Inspect cargo for any signs of shifting or damage during transit.",
    "Ensure the unloading area is clear, safe, and suitable for the vehicle.",
    "Use proper lifting techniques and equipment to prevent injury.",
    "Check all items against the delivery manifest with the recipient."
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
