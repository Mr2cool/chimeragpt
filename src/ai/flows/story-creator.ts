'use server';
/**
 * @fileOverview A multi-agent flow to create a short story with a cover image.
 *
 * - createStory - A function that orchestrates a Writer and Illustrator agent to create a story.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { StoryCreatorInputSchema, StoryCreatorOutputSchema, type StoryCreatorInput, type StoryCreatorOutput } from '@/lib/schema';

// Agent 1: The Writer
const writerAgent = ai.definePrompt({
    name: 'storyWriterPrompt',
    prompt: `You are a talented short story writer. Write a simple, imaginative, and engaging short story (around 150-200 words) based on the following prompt:

Prompt: {{{prompt}}}

The story should be suitable for all ages.`,
});

// Agent 2: The Illustrator
const illustratorAgent = ai.definePrompt({
    name: 'storyIllustratorPrompt',
    prompt: `You are a digital artist. Create a single, compelling prompt (around 20-30 words) for an image generation model. This prompt should visually summarize the following short story. Focus on creating a vibrant, slightly whimsical, and beautiful book cover illustration.

Story:
---
{{{story}}}
---

Image Generation Prompt:`,
});

// The Orchestrator Flow
export async function createStory(input: StoryCreatorInput): Promise<StoryCreatorOutput> {
    const storyCreatorFlow = ai.defineFlow(
        {
            name: 'storyCreatorFlow',
            inputSchema: StoryCreatorInputSchema,
            outputSchema: StoryCreatorOutputSchema,
        },
        async (input) => {
            // Step 1: Give the prompt to the Writer Agent to get the story.
            const storyResponse = await writerAgent({ prompt: input.prompt });
            const story = storyResponse.text;

            if (!story) {
                throw new Error("The writer agent failed to produce a story.");
            }

            // Step 2: Give the story to the Illustrator Agent to get an image prompt.
            const imagePromptResponse = await illustratorAgent({ story });
            const imagePrompt = imagePromptResponse.text;

            if (!imagePrompt) {
                throw new Error("The illustrator agent failed to produce an image prompt.");
            }

            // Step 3: Use the generated prompt to create an image.
            const { media } = await ai.generate({
                model: googleAI.model('imagen-4.0-fast-generate-001'),
                prompt: imagePrompt,
            });

            const imageUrl = media?.url;

            if (!imageUrl) {
                throw new Error("The image generation failed.");
            }

            // Step 4: Return the story and the image URL.
            return {
                story,
                imageUrl,
            };
        }
    );
    return storyCreatorFlow(input);
}
