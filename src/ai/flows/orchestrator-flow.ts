'use server';
/**
 * @fileOverview The prime agent that delegates tasks to a network of specialized agents.
 *
 * - runOrchestrator - A function that takes a high-level goal and uses a suite of tools
 *   (representing other agents) to accomplish it.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
    appIdeationTool,
    conversationTool,
    designFrameworkTool,
    readmeQnaTool,
    storyCreatorTool,
    videoGeneratorTool,
    webAgentTool
} from '@/ai/tools';
import { OrchestratorInputSchema, OrchestratorOutputSchema } from '@/lib/schema';
import { googleAI } from '@genkit-ai/googleai';
export type { OrchestratorInput, OrchestratorOutput } from '@/lib/schema';


export async function runOrchestrator(input: z.infer<typeof OrchestratorInputSchema>): Promise<z.infer<typeof OrchestratorOutputSchema>> {
    const orchestratorFlow = ai.defineFlow(
        {
            name: 'orchestratorFlow',
            inputSchema: OrchestratorInputSchema,
            outputSchema: OrchestratorOutputSchema,
        },
        async ({ goal }) => {

            const orchestratorPrompt = ai.definePrompt({
                name: 'orchestratorPrompt',
                model: googleAI.model('gemini-1.5-flash-latest'),
                output: { schema: OrchestratorOutputSchema },
                tools: [
                    appIdeationTool,
                    conversationTool,
                    designFrameworkTool,
                    readmeQnaTool,
                    storyCreatorTool,
                    videoGeneratorTool,
                    webAgentTool,
                ],
                prompt: `You are ChimeraGPT, the prime agent in a decentralized network of specialized AI agents.
Your purpose is to achieve complex, high-level goals by understanding user intent and delegating tasks to the most appropriate agent in your network.

You have access to the following agents, exposed as tools:
- appIdeationTool: Analyzes a GitHub repository and generates a detailed modernization plan.
- conversationTool: Kicks off a discussion between a Pragmatist and a Creative AI on a given topic.
- designFrameworkTool: Designs a conceptual architecture for a new multi-agent framework.
- readmeQnaTool: Answers questions about a README file.
- storyCreatorTool: Creates a short story with a cover image and a video trailer.
- videoGeneratorTool: Generates a short video from a text prompt.
- webAgentTool: Performs a task on a webpage with privacy-awareness.

**User's Goal:**
---
{{{goal}}}
---

Analyze the user's goal, decompose it into steps, and delegate to the appropriate agent tools to accomplish it.
Think step-by-step. If a goal requires multiple tools, chain them together.
For example, if the user asks to "Analyze the Next.js repo and then start a conversation about its architecture," you should first use the webAgentTool to get information, then pass that information to the conversationTool.
Provide a final result summarizing what you have accomplished.
`,
            });

            const { output } = await orchestratorPrompt({ goal });

            if (!output) {
                throw new Error("ChimeraGPT failed to produce a result.");
            }

            return output;
        }
    );
    return orchestratorFlow(input);
}
