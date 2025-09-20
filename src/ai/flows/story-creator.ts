// src/ai/flows/story-creator.ts
'use server';
/**
 * @fileOverview A multi-agent flow to create a short story with a cover image,
 * refactored to use the AgentLite-inspired architecture.
 *
 * - createStory - A function that orchestrates a ManagerAgent to lead a team
 *   of specialist agents (Writer and Illustrator).
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { StoryCreatorInputSchema, StoryCreatorOutputSchema, type StoryCreatorInput, type StoryCreatorOutput } from '@/lib/schema';
import { z } from 'zod';
import { BaseAction, AIAgent, ManagerAgent } from '@/lib/agents';

// Define Actions (Tools) for the agents

class WriteStoryAction extends BaseAction {
  name = 'WriteStory';
  description = 'Writes a short story based on a given prompt.';
  inputSchema = z.string().describe('The prompt for the story.');
  outputSchema = z.string().describe('The generated story text.');

  async execute(prompt: string): Promise<string> {
    const writerPrompt = ai.definePrompt({
        name: 'storyWriterActionPrompt',
        prompt: `You are a talented short story writer. Write a simple, imaginative, and engaging short story (around 150-200 words) based on the following prompt:

Prompt: ${prompt}

The story should be suitable for all ages.`
    });
    const { text } = await writerPrompt({ prompt });
    return text();
  }
}

class CreateImagePromptAction extends BaseAction {
  name = 'CreateImagePrompt';
  description = 'Creates a compelling image generation prompt based on a story.';
  inputSchema = z.string().describe('The story text.');
  outputSchema = z.string().describe('The prompt for the image generator.');

  async execute(story: string): Promise<string> {
    const illustratorPrompt = ai.definePrompt({
        name: 'storyIllustratorActionPrompt',
        prompt: `You are a digital artist. Create a single, compelling prompt (around 20-30 words) for an image generation model. This prompt should visually summarize the following short story. Focus on creating a vibrant, slightly whimsical, and beautiful book cover illustration.

Story:
---
${story}
---

Image Generation Prompt:`
    });
    const { text } = await illustratorPrompt({ story });
    return text();
  }
}


// The Orchestrator Flow
export async function createStory(input: StoryCreatorInput): Promise<StoryCreatorOutput> {
    const storyCreatorFlow = ai.defineFlow(
        {
            name: 'storyCreatorFlow',
            inputSchema: StoryCreatorInputSchema,
            outputSchema: StoryCreatorOutputSchema,
        },
        async ({ prompt }) => {
            // 1. Define Specialist Agents and their Tools
            const writerAgent = new AIAgent('WriterAgent', 'Writes short stories.', [new WriteStoryAction()]);
            const illustratorAgent = new AIAgent('IllustratorAgent', 'Creates image prompts from stories.', [new CreateImagePromptAction()]);

            // 2. Define the Manager Agent and its team
            const managerAgent = new ManagerAgent('StoryManager', 'Manages a team to create an illustrated story.', [writerAgent, illustratorAgent]);

            // 3. The Manager orchestrates the process
            // Step 1: Manager asks the WriterAgent to write a story.
            const story = await managerAgent.actions[0].execute(prompt);
            if (!story || typeof story !== 'string') {
                throw new Error("Writer agent failed to produce a story.");
            }

            // Step 2: Manager asks the IllustratorAgent to create a prompt.
            const imagePrompt = await managerAgent.actions[1].execute(story);
            if (!imagePrompt || typeof imagePrompt !== 'string') {
                throw new Error("Illustrator agent failed to produce an image prompt.");
            }
            
            // Step 3: The flow (or the manager) uses the generated prompt to create an image.
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
