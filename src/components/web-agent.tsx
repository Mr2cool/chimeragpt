
"use client";
import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { performWebTask } from '@/ai/flows/web-agent';
import { WebTaskInputSchema, type WebTaskInput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Globe } from 'lucide-react';

export function WebAgent() {
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<WebTaskInput>({
    resolver: zodResolver(WebTaskInputSchema),
    defaultValues: {
      url: 'https://en.wikipedia.org/wiki/React_(software)',
      task: 'Resume la historia de este framework.',
      userData: `My name is John Doe, I live at 123 Main St, and I am a software engineer. My manager asked me to research the history of React for a presentation. I need a summary of its key milestones.`
    },
  });

  const handleSubmit = async (values: WebTaskInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await performWebTask(values);
      setResult(response.result);
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
            <Globe className="w-6 h-6 text-primary" />
            Privacy-Aware Web Agent
          </CardTitle>
          <CardDescription>
            Provide a URL, a task, and some context. The agent will analyze the webpage, but it will first use a privacy filter to extract only the necessary information from your data to perform the task, preventing leaks of sensitive info.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webpage URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The full URL of the webpage you want the agent to visit.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="task"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description (Any Language)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Summarize the main points of the article."
                        {...field}
                        rows={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Clearly describe what you want the agent to do on the page.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Data / Context</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Provide any context the agent might need. The agent will only use what is necessary."
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide any background information or data the agent might need. It will be filtered for privacy.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Performing Task...' : 'Run Agent'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Agent Output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
                <Skeleton className="h-6 w-1/4" />
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
            <CardTitle className="font-headline text-2xl">Agent Output</CardTitle>
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
