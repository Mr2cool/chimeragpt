"use client";
import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { runOrchestrator } from '@/ai/flows/orchestrator-flow';
import { OrchestratorInputSchema, type OrchestratorInput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, BrainCircuit } from 'lucide-react';
import { Logo } from './icons';
import { useRouter } from 'next/navigation';

export function Orchestrator() {
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const form = useForm<OrchestratorInput>({
    resolver: zodResolver(OrchestratorInputSchema),
    defaultValues: {
      goal: '',
    },
  });

  const handleSubmit = async (values: OrchestratorInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await runOrchestrator(values);
      setResult(response.result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
    }
    setIsLoading(false);
  };
  
  const handleRepoNav = () => {
    router.push('/repo');
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
       <div className="text-center">
        <div className="mx-auto mb-4 inline-block">
          <Logo className="w-20 h-20 text-primary" />
        </div>
        <h1 className="font-headline text-4xl font-bold text-foreground">Chimera Framework 2060</h1>
        <p className="mt-2 text-lg text-muted-foreground">A multi-agent system for complex task orchestration.</p>
        <Button variant="link" onClick={handleRepoNav}>Or, go to the legacy repository analyzer &rarr;</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-primary" />
            Orchestrator Agent
          </CardTitle>
          <CardDescription>
            Provide a high-level goal. The Orchestrator will analyze it, decompose it into steps, and delegate tasks to its team of specialized agents.
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
                    <FormLabel>Your High-Level Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Analyze the 'https://github.com/google/genkit' repo, then create a short story about an AI agent who learns to code from it."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what you want to accomplish. Be as simple or as complex as you like.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Orchestrating...' : 'Execute Goal'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Orchestration in Progress...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
                <Skeleton className="h-6 w-1/3" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                 <div className="space-y-2 mt-6">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
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
            <CardTitle className="font-headline text-2xl">Final Result</CardTitle>
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
