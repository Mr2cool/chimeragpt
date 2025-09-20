"use client";
import * as React from 'react';
import Image from 'next/image';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStory } from '@/ai/flows/story-creator';
import { StoryCreatorInputSchema, type StoryCreatorInput, type StoryCreatorOutput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function StoryCreator() {
  const [result, setResult] = React.useState<StoryCreatorOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<StoryCreatorInput>({
    resolver: zodResolver(StoryCreatorInputSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const handleSubmit = async (values: StoryCreatorInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await createStory(values);
      setResult(response);
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
            <Bot className="w-6 h-6 text-primary" />
            Multi-Agent Story Creator
          </CardTitle>
          <CardDescription>
            Provide a simple prompt and let two AI agents—a writer and an illustrator—collaborate to create a short, illustrated story for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A curious squirrel who finds a mysterious, glowing acorn."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the main character and the basic idea of your story.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating Story...' : 'Create Story'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Your Generated Story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="w-full h-64 rounded-lg" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
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
            <CardTitle className="font-headline text-2xl">Your Generated Story</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3">
                    <Image 
                        src={result.imageUrl}
                        alt="Generated story cover"
                        width={400}
                        height={400}
                        className="rounded-lg object-cover aspect-square"
                    />
                </div>
                <div className="w-full md:w-2/3">
                     <article className="prose dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.story}</ReactMarkdown>
                    </article>
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
