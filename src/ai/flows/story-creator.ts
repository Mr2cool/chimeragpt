'use server';
/**
 * @fileOverview A multi-agent flow to create a short story with a cover image and video trailer.
 *
 * - createStory - A function that orchestrates a writer, illustrator, and director agent.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { StoryCreatorInputSchema, StoryCreatorOutputSchema, type StoryCreatorInput, type StoryCreatorOutput } from '@/lib/schema';
import { generateVideo } from './video-generation';

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

The story should be suitable for all ages.`,
                model: googleAI.model('gemini-1.5-flash-latest'),
            });

            // Agent 2: The Illustrator
            const illustratorAgent = ai.definePrompt({
                name: 'illustratorAgent',
                prompt: `You are a digital artist. Create a single, compelling prompt (around 20-30 words) for an image generation model. This prompt should visually summarize the following short story. Focus on creating a vibrant, slightly whimsical, and beautiful book cover illustration.

Story:
---
{{{story}}}
---

Image Generation Prompt:`,
                model: googleAI.model('gemini-1.5-flash-latest'),
            });
            
            // Agent 3: The Director
            const directorAgent = ai.definePrompt({
                name: 'directorAgent',
                prompt: `You are a film director. Create a short, dramatic prompt (around 15-20 words) for a video generation model. This prompt should capture the cinematic essence of the following short story. Focus on a key moment or the overall mood.

Story:
---
{{{story}}}
---

Video Generation Prompt:`,
                model: googleAI.model('gemini-1.5-flash-latest'),
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
            
            // Step 3: Director agent creates a prompt for the video trailer.
            const videoPromptResponse = await directorAgent({ story });
            const videoPrompt = videoPromptResponse.text;
             if (!videoPrompt) {
                throw new Error("Director agent failed to create a video prompt.");
            }

            // Step 4: Generate the cover image and video trailer in parallel.
            const [imageResult, videoResult] = await Promise.all([
                ai.generate({
                    model: googleAI.model('imagen-4.0-fast-generate-001'),
                    prompt: imagePrompt,
                }),
                generateVideo({ prompt: videoPrompt })
            ]);

            const imageUrl = imageResult.media?.url;
            if (!imageUrl) {
                throw new Error("The image generation failed.");
            }
            
            const videoUrl = videoResult.videoUrl;
            if (!videoUrl) {
                throw new Error("The video generation failed.");
            }

            // Step 5: Return the final result.
            return {
                story,
                imageUrl,
                videoUrl,
            };
        }
    );
    return storyCreatorFlow(input);
}
