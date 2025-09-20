"use client";
import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateVideo } from '@/ai/flows/video-generation';
import { GenerateVideoInputSchema, type GenerateVideoInput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function VideoGenerator() {
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<GenerateVideoInput>({
    resolver: zodResolver(GenerateVideoInputSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const handleSubmit = async (values: GenerateVideoInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await generateVideo(values);
      setResult(response.videoUrl);
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
          <CardTitle className="font-headline text-2xl">Video Generator</CardTitle>
          <CardDescription>
            Describe the video you want to create. The AI will generate a short video clip based on your prompt.
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
                    <FormLabel>Video Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A majestic dragon soaring over a mystical forest at dawn."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Be as descriptive as possible for the best results. Video generation can take a minute or more.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Generating Video...' : 'Generate Video'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Generated Video</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                <div className="w-full max-w-md space-y-4">
                    <Skeleton className="h-[250px] w-full" />
                    <p className="text-center text-sm text-muted-foreground">Generating video... This may take up to a minute.</p>
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
            <CardTitle className="font-headline text-2xl">Generated Video</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
             <video controls autoPlay loop src={result} className="w-full max-w-md rounded-lg border bg-background" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
