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
import { AlertCircle, BookOpen, Clapperboard } from 'lucide-react';
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
            <BookOpen className="w-6 h-6 text-primary" />
            Multi-Modal Story Weaver
          </CardTitle>
          <CardDescription>
            Provide a simple prompt and let a team of AI agents—a writer, an illustrator, and a director—collaborate to create a short story, a cover image, and a video trailer for you.
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
                {isLoading ? 'Weaving Story...' : 'Create Story'}
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
            <CardContent className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Skeleton className="w-full aspect-square rounded-lg" />
                </div>
                <div className="md:col-span-2 space-y-4">
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                     <div>
                        <h4 className="font-semibold text-lg font-headline flex items-center gap-2 mb-2"><Clapperboard className="w-5 h-5"/>Video Trailer</h4>
                        <Skeleton className="w-full aspect-video rounded-lg" />
                     </div>
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
            <div className="grid md:grid-cols-3 gap-8">
                <div className="w-full md:col-span-1 space-y-4">
                    <Image 
                        src={result.imageUrl}
                        alt="Generated story cover"
                        width={400}
                        height={400}
                        className="rounded-lg object-cover aspect-square border"
                    />
                     <article className="prose dark:prose-invert text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.story}</ReactMarkdown>
                    </article>
                </div>
                <div className="w-full md:col-span-2">
                    <h4 className="font-semibold text-lg font-headline flex items-center gap-2 mb-2"><Clapperboard className="w-5 h-5"/>Video Trailer</h4>
                    <video controls autoPlay loop src={result.videoUrl} className="w-full rounded-lg border bg-background" />
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
