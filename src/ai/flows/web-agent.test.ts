/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { performWebTask } from './web-agent';
import { ai } from '@/ai/genkit';
import { WebTaskInputSchema, WebTaskOutputSchema } from '@/lib/schema';
import * as webFetcher from '@/lib/web-fetcher';
import * as search from '@/lib/search';

// Mock the AI call
vi.mock('@/ai/genkit', () => {
    const mockOutput = {
        result: 'The summary of the page is...'
    };

    const prompt = vi.fn().mockResolvedValue({
        output: () => mockOutput,
        text: () => JSON.stringify(mockOutput),
    });

    const generate = vi.fn().mockResolvedValue({
        text: () => 'A description of the image.',
    });
    
    const definePrompt = vi.fn().mockReturnValue(prompt);
    const defineTool = vi.fn((config, func) => func);

    return {
        ai: {
            defineFlow: vi.fn((config, flow) => flow),
            definePrompt: definePrompt,
            defineTool: defineTool,
            generate: generate,
        },
    };
});


// Mock the web-fetcher and search modules
vi.mock('@/lib/web-fetcher', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        fetchUrlContent: vi.fn().mockResolvedValue('<html><body><h1>Test Page</h1></body></html>'),
        extractImageUrls: vi.fn().mockReturnValue(['https://example.com/image.jpg']),
        fetchImageAsDataUri: vi.fn().mockResolvedValue('data:image/jpeg;base64,xxxx'),
    };
});

vi.mock('@/lib/search', () => ({
    searchGoogle: vi.fn().mockResolvedValue({
        items: [{ title: 'Search Result', snippet: 'A result from search.', link: 'https://example.com/search' }]
    }),
}));

describe('performWebTask Flow', () => {
    it('should return a valid result for a given URL and task', async () => {
        // Arrange
        const input = {
            url: 'https://example.com',
            task: 'Summarize this page.',
        };

        // Act
        const result = await performWebTask(input);

        // Assert
        expect(() => WebTaskInputSchema.parse(input)).not.toThrow();
        expect(() => WebTaskOutputSchema.parse(result)).not.toThrow();

        // Check if the correct functions were called
        expect(webFetcher.fetchUrlContent).toHaveBeenCalledWith(input.url);
        
        // Check if the prompt was called with the sanitized content
        const prompt = ai.definePrompt({name: 'mock', output: { schema: WebTaskOutputSchema }});
        expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
            task: input.task,
            pageContent: expect.stringContaining('Test Page')
        }));

        // Check the final result
        expect(result.result).toBe('The summary of the page is...');
    });
});
