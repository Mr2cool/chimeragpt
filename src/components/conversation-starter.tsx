"use client";
import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { startConversation } from '@/ai/flows/conversation-flow';
import { ConversationInputSchema, type ConversationInput, type ConversationOutput } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, MessageSquare, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';

export function ConversationStarter() {
  const [result, setResult] = React.useState<ConversationOutput['conversation'] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<ConversationInput>({
    resolver: zodResolver(ConversationInputSchema),
    defaultValues: {
      topic: '',
    },
  });

  const handleSubmit = async (values: ConversationInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await startConversation(values);
      setResult(response.conversation);
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
            <MessageSquare className="w-6 h-6 text-primary" />
            Multi-Agent Conversation
          </CardTitle>
          <CardDescription>
            Enter a topic and watch as two AI agents with different personalities—a Pragmatist and a Creative—discuss it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversation Topic</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., The future of artificial intelligence."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a starting topic for the AI agents' discussion.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Thinking...' : 'Start Conversation'}
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
      
      {isLoading && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Discussion in Progress...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
                 <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
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
            <CardTitle className="font-headline text-2xl">The Discussion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.map((entry, index) => (
                <div key={index} className="flex gap-4">
                    <Avatar>
                        <AvatarFallback className={cn(entry.agent === 'Creative' ? 'bg-purple-200 dark:bg-purple-900' : 'bg-blue-200 dark:bg-blue-900')}>
                            {entry.agent.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                        <p className="font-semibold font-headline">{entry.agent}</p>
                        <article className="prose dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.text}</ReactMarkdown>
                        </article>
                    </div>
                </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
