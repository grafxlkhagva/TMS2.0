
'use server';

import {
  generateLoadingChecklist,
  type GenerateLoadingChecklistInput,
  type GenerateLoadingChecklistOutput,
} from '@/ai/flows/generate-loading-checklist';
import {
  generateUnloadingChecklist,
  type GenerateUnloadingChecklistInput,
  type GenerateUnloadingChecklistOutput,
} from '@/ai/flows/generate-unloading-checklist';
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
    // Extracting a more detailed error message from Zod
    const errorMessage = parsedInput.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid input: ${errorMessage}` };
  }

  try {
    const result = await generateLoadingChecklist(parsedInput.data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating checklist:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to generate checklist. Details: ${errorMessage}` };
  }
}

export async function generateUnloadingChecklistAction(
  input: GenerateUnloadingChecklistInput
): Promise<{ success: boolean; data?: GenerateUnloadingChecklistOutput; error?: string }> {
  const parsedInput = ActionInputSchema.safeParse(input);
  if (!parsedInput.success) {
    const errorMessage = parsedInput.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid input: ${errorMessage}` };
  }

  try {
    const result = await generateUnloadingChecklist(parsedInput.data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error generating unloading checklist:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to generate unloading checklist. Details: ${errorMessage}` };
  }
}
