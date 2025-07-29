'use server';

import { optimizeRoute, type OptimizeRouteInput, type OptimizeRouteOutput } from '@/ai/flows/optimize-route';
import { z } from 'zod';

const ActionInputSchema = z.object({
  currentRoute: z.string(),
  deliveryDeadlines: z.string(),
  trafficConditions: z.string(),
});

export async function optimizeRouteAction(
  input: OptimizeRouteInput
): Promise<{ success: boolean; data?: OptimizeRouteOutput; error?: string }> {
  const parsedInput = ActionInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, error: 'Invalid input.' };
  }

  try {
    const result = await optimizeRoute(parsedInput.data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error optimizing route:', error);
    return { success: false, error: 'Failed to optimize route. Please try again.' };
  }
}
