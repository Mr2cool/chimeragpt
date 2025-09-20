'use server';
/**
 * @fileOverview A multi-agent flow to analyze a legacy application and generate a modernization plan.
 *
 * - generateAppIdeas - A function that orchestrates multiple AI agents to generate a modernization proposal.
 */

import { ai } from '@/ai/genkit';
import { AppIdeationInputSchema, AppIdeationOutputSchema, type AppIdeationInput, type AppIdeationOutput } from '@/lib/schema';
import { googleAI } from '@genkit-ai/googleai';

export async function generateAppIdeas(input: AppIdeationInput): Promise<AppIdeationOutput> {
    const appIdeationFlow = ai.defineFlow(
        {
            name: 'appIdeationFlow',
            inputSchema: AppIdeationInputSchema,
            outputSchema: AppIdeationOutputSchema,
        },
        async (input) => {
            // Agent 1: The Analyst - Understands the source repository
            const analystAgent = ai.definePrompt({
                name: 'analystAgent',
                model: googleAI.model('gemini-2.5-flash-preview'),
                prompt: `You are a Senior Software Architect. Your job is to analyze a source repository to understand its core purpose, technology, and structure.

Source Repository: {{repoName}}
Description: {{repoDescription}}
File Structure:
{{#each filePaths}}
- {{{this}}}
{{/each}}

Based on this, provide a concise, one-paragraph summary of the repository's architecture, key technologies, and potential areas for modernization. This summary will be used by other agents to create a modernization plan.
`,
            });

            // Agent 2: The Modernization Architect - Creates a detailed plan for modernization
            const architectAgent = ai.definePrompt({
                name: 'architectAgent',
                model: googleAI.model('gemini-2.5-flash-preview'),
                output: { schema: AppIdeationOutputSchema.shape.ideas.element },
                prompt: `You are a Lead AI Engineer and Modernization Architect. Your task is to take the analysis of a legacy application and create a detailed modernization proposal.

Application Name: {{repoName}}
Analysis Summary:
---
{{{analysisSummary}}}
---

Based on this, create a practical and detailed modernization proposal. Your proposal MUST include:
1.  **name**: A new, modern name for the application (e.g., "ProjectName 2.0").
2.  **description**: A one-paragraph summary of the modernization plan, outlining the key benefits and goals.
3.  **techStack**: A list of recommended modern technologies to upgrade to (e.g., Next.js, Tailwind CSS, Genkit, Firebase). Be specific about what they would replace.
4.  **agents**: A list of at least two new AI agents that could be integrated into the modernized application to enhance its capabilities. For each agent, provide a name and a description of its role.
5.  **todoList**: A high-level list of 5-7 actionable TODO items for a developer to start the modernization project.
`,
            });

            // Step 1: Analyst agent summarizes the source repository.
            const analysisResponse = await analystAgent(input);
            const analysisSummary = analysisResponse.text;
            if (!analysisSummary) {
                throw new Error("Analyst agent failed to summarize the repository.");
            }

            // Step 2: Modernization Architect creates a detailed proposal.
            const { output } = await architectAgent({
                repoName: input.repoName,
                analysisSummary,
            });

            if (!output) {
                throw new Error("Architect agent failed to generate a modernization plan.");
            }

            return {
                ideas: [output],
            };
        }
    );
    return appIdeationFlow(input);
}
