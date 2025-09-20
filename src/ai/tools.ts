'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

import { generateAppIdeas } from './flows/app-ideation';
import { startConversation } from './flows/conversation-flow';
import { designFramework } from './flows/framework-design';
import { answerReadmeQuestion } from './flows/readme-qna';
import { createStory } from './flows/story-creator';
import { generateVideo } from './flows/video-generation';
import { performWebTask } from './flows/web-agent';

import { AppIdeationInputSchema, ConversationInputSchema, DesignFrameworkInputSchema, ReadmeQnaInputSchema, StoryCreatorInputSchema, GenerateVideoInputSchema, WebTaskInputSchema } from '@/lib/schema';

// Each tool wraps a specialized agent (flow)

export const appIdeationTool = ai.defineTool(
    {
        name: 'appIdeationTool',
        description: 'Analyzes a GitHub repository and generates a detailed modernization plan. Use this when the user wants to understand how to upgrade or improve a codebase.',
        inputSchema: AppIdeationInputSchema,
        outputSchema: z.string().describe('A summary of the generated modernization plan.'),
    },
    async (input) => {
        const result = await generateAppIdeas(input);
        return JSON.stringify(result.ideas[0], null, 2);
    }
);

export const conversationTool = ai.defineTool(
    {
        name: 'conversationTool',
        description: 'Starts a conversation between a Pragmatist and a Creative AI on a given topic. Use this for brainstorming or exploring a subject from multiple viewpoints.',
        inputSchema: ConversationInputSchema,
        outputSchema: z.string().describe('A summary of the conversation.'),
    },
    async (input) => {
        const result = await startConversation(input);
        return result.conversation.map(turn => `${turn.agent}: ${turn.text}`).join('\n\n');
    }
);

export const designFrameworkTool = ai.defineTool(
    {
        name: 'designFrameworkTool',
        description: 'Designs a conceptual architecture for a new multi-agent framework based on a high-level goal.',
        inputSchema: DesignFrameworkInputSchema,
        outputSchema: z.string().describe('The markdown-formatted architectural design.'),
    },
    async (input) => {
        const result = await designFramework(input);
        return result.architecture;
    }
);

export const readmeQnaTool = ai.defineTool(
    {
        name: 'readmeQnaTool',
        description: 'Answers a specific question based on the content of a README file.',
        inputSchema: ReadmeQnaInputSchema,
        outputSchema: z.string().describe('The answer to the question.'),
    },
    async (input) => {
        const result = await answerReadmeQuestion(input);
        return result.answer;
    }
);

export const storyCreatorTool = ai.defineTool(
    {
        name: 'storyCreatorTool',
        description: 'Creates a short story with a cover image and a video trailer based on a user prompt.',
        inputSchema: StoryCreatorInputSchema,
        outputSchema: z.string().describe('A summary containing the story, image URL, and confirmation of video generation.'),
    },
    async (input) => {
        const result = await createStory(input);
        return `Story created successfully. Image is available at: ${result.imageUrl}. A video trailer has also been generated.`;
    }
);

export const videoGeneratorTool = ai.defineTool(
    {
        name: 'videoGeneratorTool',
        description: 'Generates a short video from a text prompt.',
        inputSchema: GenerateVideoInputSchema,
        outputSchema: z.string().describe('A confirmation message that the video was generated.'),
    },
    async (input) => {
        const result = await generateVideo(input);
        // Returning the data URI is too long for the prompt, so just confirm.
        return `Video generated successfully.`;
    }
);

export const webAgentTool = ai.defineTool(
    {
        name: 'webAgentTool',
        description: 'Performs a task on a given webpage, with capabilities for searching the web and analyzing images. It is privacy-aware.',
        inputSchema: WebTaskInputSchema,
        outputSchema: z.string().describe('The result of the task execution.'),
    },
    async (input) => {
        const result = await performWebTask(input);
        return result.result;
    }
);
