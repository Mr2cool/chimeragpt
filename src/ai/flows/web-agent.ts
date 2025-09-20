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
            return JSON.stringify(searchResults.items.map(item => ({ title: item.title, snippet: item.snippet, link: item.link })));
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

            const { output } = await ai.generate({
                model: 'googleai/gemini-pro-vision',
                prompt: [{
                    media: { url: dataUri }
                }, {
                    text: "Describe this image in detail."
                }],
            });
            
            return output || "Could not analyze image.";

        } catch (e) {
            console.error("Image analysis tool failed", e);
            return "Image analysis failed.";
        }
    }
);

// Tool to self-translate non-English text to English
const selfTranslateTool = ai.defineTool(
    {
        name: 'selfTranslate',
        description: 'Translates a given text into English. Use this if the user task is in a language other than English to ensure better understanding.',
        inputSchema: z.object({ text: z.string().describe('The non-English text to translate.') }),
        outputSchema: z.string().describe('The translated English text.'),
    },
    async(input) => {
        const { output } = await ai.generate({
            prompt: `Translate the following text to English: "${input.text}"`,
        });
        return output || "Translation failed.";
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
                output: { schema: WebTaskOutputSchema },
                tools: [webSearchTool, imageAnalysisTool, selfTranslateTool],
                prompt: `You are an advanced multimodal web agent. Your task is to analyze the content of a webpage and perform a user-defined task.

You have access to tools that can help you:
1. 'selfTranslate': If the user's task is in a language other than English, you MUST use this tool first to translate the task to English before proceeding.
2. 'webSearch': If the provided webpage content is not enough to answer the user's request, use this tool to search the web for additional information.
3. 'analyzeImage': If the page contains images relevant to the task, use this tool to "see" and understand their content.

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

First, check the language of the user's task. If it's not in English, use the 'selfTranslate' tool.
Next, analyze the content of the page. If it is sufficient, perform the task.
If the content is not sufficient, use the 'webSearch' tool to gather more information.
If there are relevant images, use the 'analyzeImage' tool to understand them.
Finally, perform the task and provide the result in a clear, well-structured markdown format. When using tools, briefly mention that you are doing so.
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
