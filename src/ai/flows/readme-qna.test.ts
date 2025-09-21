/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { answerReadmeQuestion } from './readme-qna';
import { ai } from '@/ai/genkit';
import { ReadmeQnaInputSchema, ReadmeQnaOutputSchema } from '@/lib/schema';

// Mock the AI call
vi.mock('@/ai/genkit', () => {
  const mockOutput = {
    answer: 'The project is installed using `npm install`.',
  };

  const prompt = vi.fn().mockResolvedValue({
    output: mockOutput,
    text: JSON.stringify(mockOutput),
  });
  
  const definePrompt = vi.fn().mockReturnValue(prompt);
  
  return {
    ai: {
      defineFlow: vi.fn((config, flow) => flow),
      definePrompt: definePrompt,
    },
  };
});

describe('answerReadmeQuestion Flow', () => {
  it('should return a valid answer for a given README and question', async () => {
    // Arrange
    const input = {
      readmeContent: 'This is a project. To install, run `npm install`.',
      question: 'How do I install this project?',
    };

    // Act
    const result = await answerReadmeQuestion(input);

    // Assert
    // Validate input and output against their Zod schemas
    expect(() => ReadmeQnaInputSchema.parse(input)).not.toThrow();
    expect(() => ReadmeQnaOutputSchema.parse(result)).not.toThrow();
    
    // Check if the answer is as expected from the mock
    expect(result.answer).toBe('The project is installed using `npm install`.');
    
    // Ensure the underlying prompt was called
    const prompt = ai.definePrompt({name: 'mock', output: {schema: ReadmeQnaOutputSchema}});
    expect(prompt).toHaveBeenCalledWith(input);
  });

  it('should handle an empty question gracefully', async () => {
    // This tests schema validation, it won't actually call the flow
    const input = {
      readmeContent: 'Some content.',
      question: '',
    };
    
    // Zod schema should throw because the question is less than 5 characters
    expect(() => ReadmeQnaInputSchema.parse(input)).toThrow();
  });
});
