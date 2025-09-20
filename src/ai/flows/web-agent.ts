'use server';
/**
 * @fileOverview A flow to perform a task on a given webpage.
 * - performWebTask - A function that takes a URL and a task, and returns the result.
 */

import { ai } from '@/ai/genkit';
import { WebTaskInputSchema, WebTaskOutputSchema, type WebTaskInput, type WebTaskOutput } from '@/lib/schema';
import { fetchUrlContent } from '@/lib/web-fetcher';

export async function performWebTask(input: WebTaskInput): Promise<WebTaskOutput> {
    const webTaskFlow = ai.defineFlow(
        {
            name: 'webTaskFlow',
            inputSchema: WebTaskInputSchema,
            outputSchema: WebTaskOutputSchema,
        },
        async (input) => {
            const pageContent = await fetchUrlContent(input.url);

            if (!pageContent) {
                throw new Error("Failed to fetch content from the provided URL.");
            }

            // Sanitize content - very basic, can be improved
            const sanitizedContent = pageContent
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s\s+/g, ' ')
                .substring(0, 20000); // Limit content length for the prompt


            const prompt = ai.definePrompt({
                name: 'webTaskPrompt',
                output: { schema: WebTaskOutputSchema },
                prompt: `You are a multimodal web agent. Your task is to analyze the content of a webpage and perform a user-defined task.

User's Task:
{{{task}}}

Webpage Content (sanitized text):
---
{{{pageContent}}}
---

Based on the content, perform the task and provide the result in a clear, well-structured markdown format.
`,
            });
            const { output } = await prompt({
                task: input.task,
                pageContent: sanitizedContent,
            });
            return output!;
        }
    );
    return webTaskFlow(input);
}
