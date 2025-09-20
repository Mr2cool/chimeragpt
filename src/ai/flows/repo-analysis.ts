'use server';
/**
 * @fileOverview A flow to analyze a GitHub repository for potential bugs, vulnerabilities, and limitations.
 *
 * - analyzeRepo - A function that analyzes the repository files and provides a detailed audit.
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
        prompt: `You are an expert Code Auditor AI. Your task is to analyze a GitHub repository based on its file paths, dependencies, and description to identify potential issues.

Repository Description: {{{repoDescription}}}

File Paths:
{{#each filePaths}}
- {{{this}}}
{{/each}}

Based on the file paths and description, provide the following analysis as a senior software architect conducting a code review. Be critical and thorough.

1.  **Potential Bugs & Issues**: Identify potential bugs. For example, look for signs of missing error handling (e.g., no 'error.tsx' files in a Next.js app), potential race conditions in client/server interactions, or complex state management that could lead to bugs.
2.  **Security Vulnerabilities**: Identify potential security risks. Consider things like exposure of environment variables, lack of input validation in forms/APIs, potential for XSS if markdown is used without sanitization, or outdated/insecure dependencies.
3.  **Architectural Limitations**: Identify limitations in the current architecture. This could include scalability bottlenecks (e.g., all logic in a single server file), lack of modularity, or tight coupling between components that would make future maintenance difficult.
4.  **Technologies**: Identify the programming languages, frameworks, and significant libraries being used.
5.  **Summary**: Briefly summarize the project's purpose and architecture.

Provide a concise and insightful analysis suitable for a technical audience. For each issue, provide a brief explanation of the potential risk.`,
      });
      const {output} = await prompt(input);
      return output!;
    }
  );
  return repoAnalysisFlow(input);
}
