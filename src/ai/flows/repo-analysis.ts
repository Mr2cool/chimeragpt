'use server';
/**
 * @fileOverview A flow to analyze a GitHub repository based on its file structure.
 *
 * - analyzeRepo - A function that analyzes the repository files and provides a summary.
 * - RepoAnalysisInput - The input type for the analyzeRepo function.
 * - RepoAnalysisOutput - The return type for the analyzeRepo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RepoAnalysisInputSchema = z.object({
  filePaths: z.array(z.string()).describe('A list of all file paths in the repository.'),
  repoDescription: z.string().describe('The description of the GitHub repository.'),
});
export type RepoAnalysisInput = z.infer<typeof RepoAnalysisInputSchema>;

const RepoAnalysisOutputSchema = z.object({
  technologies: z.array(z.string()).describe('A list of languages, frameworks, and key libraries identified in the repository.'),
  summary: z.string().describe('A summary of the project\'s likely purpose and architecture based on its file structure.'),
  frameworkSuggestions: z.array(z.object({
    name: z.string().describe('The name of the suggested AI agent framework.'),
    reason: z.string().describe('The reason why this framework is suggested for the repository.'),
  })).describe('A list of suggested AI agent frameworks that might be relevant for this repository.'),
});
export type RepoAnalysisOutput = z.infer<typeof RepoAnalysisOutputSchema>;

export async function analyzeRepo(input: RepoAnalysisInput): Promise<RepoAnalysisOutput> {
  return repoAnalysisFlow(input);
}

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

const repoAnalysisFlow = ai.defineFlow(
  {
    name: 'repoAnalysisFlow',
    inputSchema: RepoAnalysisInputSchema,
    outputSchema: RepoAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
