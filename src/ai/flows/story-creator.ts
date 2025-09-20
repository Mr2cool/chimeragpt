'use server';
/**
 * @fileOverview A multi-agent flow to create a short story with a cover image.
 *
 * - createStory - A function that orchestrates a writer and illustrator agent.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { StoryCreatorInputSchema, StoryCreatorOutputSchema, type StoryCreatorInput, type StoryCreatorOutput } from '@/lib/schema';

export async function createStory(input: StoryCreatorInput): Promise<StoryCreatorOutput> {
    const storyCreatorFlow = ai.defineFlow(
        {
            name: 'storyCreatorFlow',
            inputSchema: StoryCreatorInputSchema,
            outputSchema: StoryCreatorOutputSchema,
        },
        async ({ prompt }) => {
            // Agent 1: The Writer
            const writerAgent = ai.definePrompt({
                name: 'writerAgent',
                prompt: `You are a talented short story writer. Write a simple, imaginative, and engaging short story (around 150-200 words) based on the following prompt:

Prompt: {{{prompt}}}

The story should be suitable for all ages.`
            });

            // Agent 2: The Illustrator
            const illustratorAgent = ai.definePrompt({
                name: 'illustratorAgent',
                prompt: `You are a digital artist. Create a single, compelling prompt (around 20-30 words) for an image generation model. This prompt should visually summarize the following short story. Focus on creating a vibrant, slightly whimsical, and beautiful book cover illustration.

Story:
---
{{{story}}}
---

Image Generation Prompt:`
            });

            // Step 1: Writer agent creates the story.
            const storyResponse = await writerAgent({ prompt });
            const story = storyResponse.text;
            if (!story) {
                throw new Error("Writer agent failed to produce a story.");
            }

            // Step 2: Illustrator agent creates a prompt for the cover image.
            const imagePromptResponse = await illustratorAgent({ story });
            const imagePrompt = imagePromptResponse.text;
            if (!imagePrompt) {
                throw new Error("Illustrator agent failed to create an image prompt.");
            }
            
            // Step 3: Generate the cover image.
            const { media } = await ai.generate({
                model: googleAI.model('imagen-4.0-fast-generate-001'),
                prompt: imagePrompt,
            });

            const imageUrl = media?.url;
            if (!imageUrl) {
                throw new Error("The image generation failed.");
            }

            // Step 4: Return the final result.
            return {
                story,
                imageUrl,
            };
        }
    );
    return storyCreatorFlow(input);
}
