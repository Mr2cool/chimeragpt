
"use client";
import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { designFramework } from '@/ai/flows/framework-design';
import { DesignFrameworkInputSchema, type DesignFrameworkInput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Waypoints } from 'lucide-react';

export function FrameworkDesigner() {
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<DesignFrameworkInput>({
    resolver: zodResolver(DesignFrameworkInputSchema),
    defaultValues: {
      goal: '',
    },
  });

  const handleSubmit = async (values: DesignFrameworkInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await designFramework(values);
      setResult(response.architecture);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Waypoints className="w-6 h-6 text-primary" />
            Multi-Agent Framework Architect
          </CardTitle>
          <CardDescription>
            Describe the goal of your multi-agent system, and our AI architect will design a conceptual architecture for a new, unified framework to achieve it, drawing inspiration from modern protocols and systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., An automated system for booking travel that involves searching for flights, reserving hotels, and creating an itinerary."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Clearly describe what you want your multi-agent system to accomplish.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Designing Architecture...' : 'Design Architecture'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Generated Architecture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 prose dark:prose-invert max-w-none">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-1/3 mt-4" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-1/4 font-bold" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-5 w-1/4 font-bold" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Generated Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <article className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
