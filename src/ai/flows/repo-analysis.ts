'use server';
/**
 * @fileOverview A flow to analyze a GitHub repository based on its file structure.
 *
 * - analyzeRepo - A function that analyzes the repository files and provides a summary.
 */

import {ai} from '@/ai/genkit';
import { RepoAnalysisInputSchema, RepoAnalysisOutputSchema, type RepoAnalysisInput, type RepoAnalysisOutput } from '@/lib/schema';

export async function analyzeRepo(input: RepoAnalysisInput): Promise<RepoAnalysisOutput> {
  const repoAnalysisFlow = ai.defineFlow(
    {
      name: 'repoAnalysisFlow',
      inputSchema: RepoAnalysisInputSchema,
      outputSchema: RepoAnalysisOutputSchema,
    },
    async input => {
      const prompt = ai.definePrompt({
        name: 'repoAnalysisPrompt',
        input: {schema: RepoAnalysisInputSchema},
        output: {schema: RepoAnalysisOutputSchema},
        prompt: `You are an expert software architect. Your task is to analyze a GitHub repository based on its file paths and description.

Repository Description: {{{repoDescription}}}

File Paths:
{{#each filePaths}}
- {{{this}}}
{{/each}}

Based on the file paths and description, provide the following analysis:
1.  **Technologies**: Identify the programming languages, frameworks, and significant libraries being used. Look at file extensions (.js, .ts, .py, .go), config files (package.json, pyproject.toml), and common directory names.
2.  **Summary**: Briefly summarize the project's purpose and architecture. What does it seem to do? Is it a web app, a library, a data science project?
3.  **Framework Suggestions**: From the following list of AI agent frameworks, suggest up to 3 that could be relevant to this project and explain why. The frameworks are: nanobot, CAMEL, Eigent, LiteLLM, Dolt, Mem0, A2A, AP2, CrewAI, LangGraph, LangFlow.

Provide a concise and insightful analysis suitable for a technical audience.`,
      });
      const {output} = await prompt(input);
      return output!;
    }
  );
  return repoAnalysisFlow(input);
}