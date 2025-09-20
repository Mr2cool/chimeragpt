'use server';
/**
 * @fileOverview A flow to perform a task on a given webpage, with search and image analysis capabilities.
 * - performWebTask - A function that takes a URL and a task, and returns the result.
 */

import { ai } from '@/ai/genkit';
import { WebTaskInputSchema, WebTaskOutputSchema, type WebTaskInput, type WebTaskOutput } from '@/lib/schema';
import { fetchUrlContent, extractImageUrls, fetchImageAsDataUri } from '@/lib/web-fetcher';
import { z } from 'zod';
import { searchGoogle } from '@/lib/search';
import { googleAI } from '@genkit-ai/googleai';

// Tool to perform a web search
const webSearchTool = ai.defineTool(
    {
        name: 'webSearch',
        description: 'Performs a web search to get more information to help with the task. Use this if the provided webpage content is not enough.',
        inputSchema: z.object({ query: z.string().describe('The search query.') }),
        outputSchema: z.string().describe('The search results in a summarized string format.'),
    },
    async (input) => {
        try {
            const searchResults = await searchGoogle(input.query);
            // Return only the top 5 results for brevity
            const topResults = searchResults.items.slice(0, 5);
            return JSON.stringify(topResults.map(item => ({ title: item.title, snippet: item.snippet, link: item.link })));
        } catch (e) {
            console.error("Search tool failed", e);
            return "Search failed or returned no results.";
        }
    }
);

// Tool to analyze an image from a URL
const imageAnalysisTool = ai.defineTool(
    {
        name: 'analyzeImage',
        description: 'Analyzes an image from a given URL to describe its content. Use this to understand images found on the webpage.',
        inputSchema: z.object({ imageUrl: z.string().url().describe('The URL of the image to analyze.') }),
        outputSchema: z.string().describe('A text description of the image content.'),
    },
    async (input) => {
        try {
            const dataUri = await fetchImageAsDataUri(input.imageUrl);
            if (!dataUri) return "Failed to fetch image.";

            const { text } = await ai.generate({
                model: googleAI.model('gemini-pro-vision'),
                prompt: [{
                    media: { url: dataUri }
                }, {
                    text: "Describe this image in detail."
                }],
            });
            
            return text || "Could not analyze image.";

        } catch (e) {
            console.error("Image analysis tool failed", e);
            return "Image analysis failed.";
        }
    }
);

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

            const sanitizedContent = pageContent
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s\s+/g, ' ');

            const imageUrls = extractImageUrls(pageContent, input.url).slice(0, 3);

            const prompt = ai.definePrompt({
                name: 'webTaskPrompt',
                model: googleAI.model('gemini-1.5-flash-latest'),
                output: { schema: WebTaskOutputSchema },
                tools: [webSearchTool, imageAnalysisTool],
                prompt: `You are an advanced web agent. Your goal is to perform a task on a given webpage.

You have access to tools that can help you:
- 'webSearch': If the provided webpage content is not enough, use this to search the web.
- 'analyzeImage': If the page contains images relevant to the task, use this to "see" and understand their content.

**User's Task:**
{{{task}}}

**Webpage URL:**
{{{url}}}

**Webpage Content (sanitized text):**
---
{{{pageContent}}}
---

{{#if imageUrls.length}}
**Images found on page (up to 3):**
{{#each imageUrls}}
- {{{this}}}
{{/each}}
{{/if}}

Analyze the 'Webpage Content'. If it's not sufficient, use 'webSearch' or 'analyzeImage' to gather more information.
Finally, perform the task and provide the result in a clear, well-structured markdown format.
When using tools, briefly mention that you are doing so.
If you need to perform multiple steps, think step-by-step and use the tools iteratively.
`,
            });

            const { output } = await prompt({
                url: input.url,
                task: input.task,
                pageContent: sanitizedContent,
                imageUrls: imageUrls
            });
            return output!;
        }
    );
    return webTaskFlow(input);
}
