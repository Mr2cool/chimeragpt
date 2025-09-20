'use server';
/**
 * @fileOverview A flow to answer questions about a README file.
 *
 * - answerReadmeQuestion - A function that takes README content and a question, and returns an answer.
 */

import { ai } from '@/ai/genkit';
import { ReadmeQnaInputSchema, ReadmeQnaOutputSchema, type ReadmeQnaInput, type ReadmeQnaOutput } from '@/lib/schema';
import { googleAI } from '@genkit-ai/googleai';

export async function answerReadmeQuestion(input: ReadmeQnaInput): Promise<ReadmeQnaOutput> {
  const readmeQnaFlow = ai.defineFlow(
    {
      name: 'readmeQnaFlow',
      inputSchema: ReadmeQnaInputSchema,
      outputSchema: ReadmeQnaOutputSchema,
    },
    async input => {
      const prompt = ai.definePrompt({
        name: 'readmeQnaPrompt',
        model: googleAI.model('gemini-1.5-flash-latest'),
        input: { schema: ReadmeQnaInputSchema },
        output: { schema: ReadmeQnaOutputSchema },
        prompt: `You are an AI assistant that answers questions about a GitHub repository based on its README file.

You will be given the content of the README file and a user's question.
Your task is to answer the question based *only* on the information provided in the README.
If the answer is not in the README, state that clearly.

**README Content:**
---
{{{readmeContent}}}
---

**User's Question:**
{{{question}}}

Based on the README, what is the answer?
`,
      });
      const { output } = await prompt(input);
      return output!;
    }
  );
  return readmeQnaFlow(input);
}
