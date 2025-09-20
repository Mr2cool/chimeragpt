// src/ai/flows/readme-enhancement.ts
'use server';

/**
 * @fileOverview A flow to enhance a README file by adding a short, friendly introduction based on the repository's metadata.
 *
 * - enhanceReadme - A function that enhances the README content with an AI-generated introduction.
 */

import {ai} from '@/ai/genkit';
import { EnhanceReadmeInputSchema, EnhanceReadmeOutputSchema, type EnhanceReadmeInput, type EnhanceReadmeOutput } from '@/lib/schema';

export async function enhanceReadme(input: EnhanceReadmeInput): Promise<EnhanceReadmeOutput> {
  return enhanceReadmeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'readmeEnhancementPrompt',
  input: {schema: EnhanceReadmeInputSchema},
  output: {schema: EnhanceReadmeOutputSchema},
  prompt: `You are an AI assistant that enhances README files for GitHub repositories.

  You will receive the repository description and the README content.
  Your task is to analyze the README file and generate a short, friendly introduction based on the repository's metadata (description) to provide context before displaying the README content.
  If the README already has a good introduction, just return the README content as is.
  Make sure the introduction is professional and friendly.

  Repository Description: {{{repoDescription}}}
  README Content: {{{readmeContent}}}

  Enhanced README Content:`,  
});

const enhanceReadmeFlow = ai.defineFlow(
  {
    name: 'enhanceReadmeFlow',
    inputSchema: EnhanceReadmeInputSchema,
    outputSchema: EnhanceReadmeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      enhancedReadme: output!.enhancedReadme,
    };
  }
);
