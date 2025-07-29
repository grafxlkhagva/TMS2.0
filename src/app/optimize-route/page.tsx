'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2, Sparkles, Clock, Route } from 'lucide-react';
import type { OptimizeRouteOutput } from '@/ai/flows/optimize-route';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { optimizeRouteAction } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  currentRoute: z.string().min(10, 'Please enter a valid route.'),
  deliveryDeadlines: z.string().min(10, 'Please enter delivery deadlines.'),
  trafficConditions: z.string().min(5, 'Please describe traffic conditions.'),
});

export default function OptimizeRoutePage() {
  const [result, setResult] = useState<OptimizeRouteOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentRoute: '["123 Main St, Anytown, USA", "456 Oak Ave, Somewhere, USA", "789 Pine Ln, Elsewhere, USA"]',
      deliveryDeadlines: '{"123 Main St, Anytown, USA": 1692115200, "456 Oak Ave, Somewhere, USA": 1692122400, "789 Pine Ln, Elsewhere, USA": 1692108000}',
      trafficConditions: 'Heavy congestion on Main St bridge, moderate traffic on Oak Ave.',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    const response = await optimizeRouteAction(values);

    if (response.success && response.data) {
      setResult(response.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Optimization Failed',
        description: response.error,
      });
    }
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto py-6">
       <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold">AI Route Optimization</h1>
        <p className="text-muted-foreground">
          Let AI find the most efficient route for your deliveries.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Route Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="currentRoute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Route</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder='["Address 1", "Address 2"]' {...field} />
                      </FormControl>
                      <FormDescription>Enter addresses as a JSON array of strings.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryDeadlines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Deadlines</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder='{"Address 1": 1672531199, ...}' {...field} />
                      </FormControl>
                      <FormDescription>Enter as a JSON object with addresses and unix timestamps.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trafficConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Traffic Conditions</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="e.g., Heavy traffic on I-5 North" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Optimize Route
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          {isLoading && (
            <>
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent><Skeleton className="h-5 w-1/2" /></CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
              </Card>
            </>
          )}
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Route /> Optimized Route</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    {JSON.parse(result.optimizedRoute).map((stop: string, index: number) => (
                      <li key={index}>{stop}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock /> Estimated Time Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-headline text-primary">{result.estimatedTimeSavings}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles /> Reasoning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{result.reasoning}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
