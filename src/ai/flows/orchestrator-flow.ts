'use server';
/**
 * @fileOverview The master orchestrator agent that delegates tasks to specialized agents.
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

const OrchestratorInputSchema = z.object({
    goal: z.string().describe('The high-level goal for the orchestrator to achieve.'),
});
export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

const OrchestratorOutputSchema = z.object({
    result: z.string().describe('The final result or summary of the orchestrated task execution.'),
});
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;


export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const orchestratorFlow = ai.defineFlow(
        {
            name: 'orchestratorFlow',
            inputSchema: OrchestratorInputSchema,
            outputSchema: OrchestratorOutputSchema,
        },
        async ({ goal }) => {

            const orchestratorPrompt = ai.definePrompt({
                name: 'orchestratorPrompt',
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
                prompt: `You are the master orchestrator of the Chimera Framework, a "2060" multi-agent system.
Your purpose is to achieve complex, high-level goals by delegating tasks to a team of specialized agents.

You have access to the following agents, exposed as tools:
- appIdeationTool: Analyzes a GitHub repository and generates a detailed modernization plan.
- conversationTool: Kicks off a discussion between a Pragmatist and a Creative AI on a given topic.
- designFrameworkTool: Designs a conceptual architecture for a new multi-agent framework.
- readmeQnaTool: Answers questions about a README file.
- storyCreatorTool: Creates a short story with a cover image.
- videoGeneratorTool: Generates a short video from a text prompt.
- webAgentTool: Performs a task on a webpage with privacy-awareness.

**User's Goal:**
---
{{{goal}}}
---

Analyze the user's goal, decompose it into steps, and use the available agent tools to accomplish it.
Provide a final result summarizing what you have accomplished.
Think step-by-step. If a goal requires multiple tools, chain them together.
For example, if the user asks to "Analyze the Next.js repo and then start a conversation about its architecture," you should first use the webAgentTool to get information, then pass that information to the conversationTool.
`,
            });

            const { output } = await orchestratorPrompt({ goal });

            if (!output) {
                throw new Error("The orchestrator failed to produce a result.");
            }

            return output;
        }
    );
    return orchestratorFlow(input);
}
