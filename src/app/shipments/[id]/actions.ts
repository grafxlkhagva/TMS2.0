'use server';

import {
  generateLoadingChecklist,
  type GenerateLoadingChecklistInput,
  type GenerateLoadingChecklistOutput,
} from '@/ai/flows/generate-loading-checklist';
import { z } from 'zod';

const ActionInputSchema = z.object({
  cargoInfo: z.string(),
  vehicleInfo: z.string(),
});

export async function generateChecklistAction(
  input: GenerateLoadingChecklistInput
): Promise<{ success: boolean; data?: GenerateLoadingChecklistOutput; error?: string }> {
  const parsedInput = ActionInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const result = await generateLoadingChecklist(parsedInput.data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating checklist:', error);
    return { success: false, error: 'Failed to generate checklist. Please try again.' };
  }
}
