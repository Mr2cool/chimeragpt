/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { analyzeRepo } from './repo-analysis';
import { ai } from '@/ai/genkit';
import { RepoAnalysisInputSchema, RepoAnalysisOutputSchema } from '@/lib/schema';

// Mock the AI call to avoid actual API requests during tests
vi.mock('@/ai/genkit', () => {
  const mockOutput = {
    technologies: ['Next.js', 'React', 'TypeScript'],
    summary: 'A simple Next.js application.',
    potentialBugs: [
      { name: 'Missing Error Handling', reason: 'No global error boundary found.' }
    ],
    securityVulnerabilities: [
        { name: 'No CSRF Protection', reason: 'Forms do not seem to have CSRF tokens.'}
    ],
    architecturalLimitations: [
        { name: 'No State Management', reason: 'No dedicated state management library like Redux or Zustand detected.'}
    ]
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

describe('analyzeRepo Flow', () => {
  it('should return a valid analysis output for a given repository input', async () => {
    // Arrange
    const input = {
      repoDescription: 'A sample Next.js application for testing.',
      filePaths: [
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'package.json',
        'next.config.ts'
      ],
    };

    // Act
    const result = await analyzeRepo(input);

    // Assert
    expect(() => RepoAnalysisInputSchema.parse(input)).not.toThrow();
    expect(() => RepoAnalysisOutputSchema.parse(result)).not.toThrow();
    
    expect(result.summary).toBe('A simple Next.js application.');
    expect(result.technologies).toEqual(expect.arrayContaining(['Next.js', 'React']));
    expect(result.potentialBugs).toHaveLength(1);
    expect(result.potentialBugs[0].name).toBe('Missing Error Handling');
  });

  it('should handle an empty file list gracefully', async () => {
    // Arrange
    const input = {
      repoDescription: 'An empty repository.',
      filePaths: [],
    };

    // Act
    const result = await analyzeRepo(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.technologies).toBeInstanceOf(Array);
  });
});
