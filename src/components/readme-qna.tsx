"use client";
import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { answerReadmeQuestion } from '@/ai/flows/readme-qna';
import { ReadmeQnaInputSchema, type ReadmeQnaInput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Bot } from 'lucide-react';
import { Skeleton } from './ui/skeleton';


export function ReadmeQna({ readmeContent }: { readmeContent: string }) {
    const [result, setResult] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const form = useForm<{ question: string }>({
        resolver: zodResolver(z.object({ question: z.string().min(5, { message: "Question must be at least 5 characters."}) })),
        defaultValues: {
            question: '',
        },
    });

    const handleSubmit = async (values: { question: string }) => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await answerReadmeQuestion({
                readmeContent,
                question: values.question,
            });
            setResult(response.answer);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
            setError(errorMessage);
        }
        setIsLoading(false);
    };
    
    return (
        <div className="mt-12">
            <Separator />
            <div className="mt-8">
                 <h3 className="text-xl font-headline font-semibold flex items-center gap-2">
                    <Bot className="w-6 h-6 text-primary" />
                    Ask a question about this README
                </h3>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-4 flex items-start gap-2">
                         <FormField
                            control={form.control}
                            name="question"
                            render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                <Input
                                    placeholder="e.g., How do I install this project?"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Thinking...' : 'Ask'}
                        </Button>
                    </form>
                </FormProvider>

                {isLoading && (
                    <div className="mt-6 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {result && (
                    <Card className="mt-6">
                        <CardContent className="p-6">
                            <article className="prose dark:prose-invert max-w-full">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                            </article>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
