'use server';

/**
 * @fileOverview Route optimization AI agent.
 *
 * - optimizeRoute - A function that handles the route optimization process.
 * - OptimizeRouteInput - The input type for the optimizeRoute function.
 * - OptimizeRouteOutput - The return type for the optimizeRoute function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeRouteInputSchema = z.object({
  currentRoute: z.string().describe('The current route as a list of addresses.'),
  deliveryDeadlines: z
    .string()
    .describe(
      'A JSON list of delivery deadlines, in unix epoch seconds, for each address in the current route.'
    ),
  trafficConditions: z.string().describe('The current traffic conditions.'),
});
export type OptimizeRouteInput = z.infer<typeof OptimizeRouteInputSchema>;

const OptimizeRouteOutputSchema = z.object({
  optimizedRoute: z
    .string()
    .describe('The optimized route as a list of addresses.'),
  estimatedTimeSavings: z
    .string()
    .describe('The estimated time savings from the optimized route.'),
  reasoning: z
    .string()
    .describe(
      'The step-by-step reasoning for how the optimized route was determined.'
    ),
});
export type OptimizeRouteOutput = z.infer<typeof OptimizeRouteOutputSchema>;

export async function optimizeRoute(input: OptimizeRouteInput): Promise<OptimizeRouteOutput> {
  return optimizeRouteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeRoutePrompt',
  input: {schema: OptimizeRouteInputSchema},
  output: {schema: OptimizeRouteOutputSchema},
  prompt: `You are an expert route optimization specialist.

You will receive the current route, delivery deadlines, and current traffic conditions.

You will use this information to determine the optimal route, estimate the time savings, and provide a step-by-step reasoning for your determination.

Current Route: {{{currentRoute}}}
Delivery Deadlines: {{{deliveryDeadlines}}}
Traffic Conditions: {{{trafficConditions}}}

Optimize the route considering the traffic conditions and delivery deadlines to minimize delivery times and improve efficiency.

Follow these steps:
1. Analyze the current route and identify potential bottlenecks.
2. Evaluate the traffic conditions and identify alternative routes.
3. Consider the delivery deadlines and prioritize deliveries accordingly.
4. Provide a step-by-step reasoning for the optimized route.
5. Estimate the time savings from the optimized route.

Output the optimized route, estimated time savings, and reasoning in a JSON format.

Ensure that the optimizedRoute field contains a valid list of addresses.
Ensure that the estimatedTimeSavings field contains a human-readable string representing the estimated time savings.
Ensure that the reasoning field contains a clear and concise explanation of the optimization process.

{
  "optimizedRoute": "[address1, address2, ...]",
  "estimatedTimeSavings": "X hours and Y minutes",
  "reasoning": "Step 1: ... Step 2: ..."
}`,
});

const optimizeRouteFlow = ai.defineFlow(
  {
    name: 'optimizeRouteFlow',
    inputSchema: OptimizeRouteInputSchema,
    outputSchema: OptimizeRouteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
