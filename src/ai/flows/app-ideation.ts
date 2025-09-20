'use server';
/**
 * @fileOverview A multi-agent flow to brainstorm and plan new applications based on a source repository.
 *
 * - generateAppIdeas - A function that orchestrates multiple AI agents to generate application proposals.
 */

import { ai } from '@/ai/genkit';
import { AppIdeationInputSchema, AppIdeationOutputSchema, type AppIdeationInput, type AppIdeationOutput } from '@/lib/schema';

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
                prompt: `You are a Senior Software Architect. Your job is to analyze a source repository to understand its core purpose, technology, and structure.

Source Repository: {{repoName}}
Description: {{repoDescription}}
File Structure:
{{#each filePaths}}
- {{{this}}}
{{/each}}

Based on this, provide a concise, one-paragraph summary of the repository's core concept and key technologies. This summary will be used by other agents to brainstorm new ideas.
`,
            });

            // Agent 2: The Brainstormer - Generates new application ideas
            const brainstormerAgent = ai.definePrompt({
                name: 'brainstormerAgent',
                prompt: `You are a creative Product Manager. Based on the following summary of an existing project, brainstorm a list of {{numIdeas}} new, innovative application ideas that expand upon or are inspired by the original concept.

For each idea, provide only a creative name and a one-sentence description.

Source Project Summary:
---
{{{analysisSummary}}}
---

Your output should be a simple list of names and descriptions, each on a new line, formatted like: "Idea Name: Idea Description".
`,
            });

            // Agent 3: The Planner - Creates a detailed plan for a single idea
            const plannerAgent = ai.definePrompt({
                name: 'plannerAgent',
                output: { schema: AppIdeationOutputSchema.shape.ideas.element },
                prompt: `You are a Lead AI Engineer and Project Planner. Your task is to take a single application idea and create a detailed project plan.

Application Idea: {{ideaName}} - {{ideaDescription}}
Source Repository Context: The original project was about '{{repoDescription}}' and used technologies suggested by its file paths.

Based on this, create a practical and detailed project proposal. Your proposal MUST include:
1.  **name**: The application name provided.
2.  **description**: A one-paragraph expansion of the provided description, detailing the application's features and value proposition.
3.  **techStack**: A list of recommended technologies (e.g., Next.js, Tailwind CSS, Genkit, Firebase, etc.). Be specific.
4.  **agents**: A list of at least two AI agents that would be required to build this application. For each agent, provide a name (e.g., "DataProcessingAgent") and a description of its specific role and responsibilities.
5.  **todoList**: A high-level list of 5-7 actionable TODO items for a developer to start building the project.
`,
            });

            // Step 1: Analyst agent summarizes the source repository.
            const analysisResponse = await analystAgent(input);
            const analysisSummary = analysisResponse.text;
            if (!analysisSummary) {
                throw new Error("Analyst agent failed to summarize the repository.");
            }

            // Step 2: Brainstormer agent generates a list of ideas.
            const brainstormResponse = await brainstormerAgent({
                analysisSummary,
                numIdeas: input.numIdeas,
            });
            const ideasText = brainstormResponse.text;
             if (!ideasText) {
                throw new Error("Brainstormer agent failed to generate ideas.");
            }

            // Parse the brainstormed ideas (simple parsing based on expected format)
            const ideaLines = ideasText.split('\n').filter(line => line.trim().length > 0 && line.includes(':'));
            const ideaPromises = ideaLines.map(async (line) => {
                const match = line.match(/^(?:-|\*|\d+\.)?\s*([^:]+):\s*(.*)/);
                if (!match) return null;
                const [, ideaName, ideaDescription] = match;

                // Step 3: For each idea, have the Planner agent create a detailed proposal.
                const { output } = await plannerAgent({
                    ideaName: ideaName.trim(),
                    ideaDescription: ideaDescription.trim(),
                    repoDescription: input.repoDescription,
                });

                return output;
            });

            const resolvedIdeas = (await Promise.all(ideaPromises)).filter((idea): idea is AppIdeationOutput['ideas'][0] => idea !== null);

            return {
                ideas: resolvedIdeas,
            };
        }
    );
    return appIdeationFlow(input);
}
