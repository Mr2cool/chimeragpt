'use server';
/**
 * @fileOverview A flow to generate a video from a text prompt.
 *
 * - generateVideo - A function that takes a prompt and returns a video data URI.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GenerateVideoInputSchema, GenerateVideoOutputSchema, type GenerateVideoInput, type GenerateVideoOutput } from '@/lib/schema';

export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    const generateVideoFlow = ai.defineFlow(
        {
            name: 'generateVideoFlow',
            inputSchema: GenerateVideoInputSchema,
            outputSchema: GenerateVideoOutputSchema,
        },
        async (input) => {
            let { operation } = await ai.generate({
                model: googleAI.model('veo-2.0-generate-001'),
                prompt: input.prompt,
                config: {
                    durationSeconds: 5,
                    aspectRatio: '16:9',
                },
            });

            if (!operation) {
                throw new Error('Expected the model to return an operation');
            }

            // Poll for completion
            while (!operation.done) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                operation = await ai.checkOperation(operation);
            }

            if (operation.error) {
                throw new Error('Failed to generate video: ' + operation.error.message);
            }

            const video = operation.output?.message?.content.find((p) => !!p.media);
            if (!video || !video.media?.url) {
                throw new Error('Failed to find the generated video in the operation output');
            }
            
            // The URL from Veo is temporary and needs the API key to be accessed.
            // We fetch it server-side and convert it to a data URI to send to the client.
            const fetch = (await import('node-fetch')).default;
            const videoDownloadResponse = await fetch(
                `${video.media.url}&key=${process.env.GEMINI_API_KEY}`
            );

            if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
                throw new Error('Failed to download the generated video file.');
            }

            const videoBuffer = await videoDownloadResponse.arrayBuffer();
            const base64Video = Buffer.from(videoBuffer).toString('base64');
            const contentType = video.media.contentType || 'video/mp4';

            return {
                videoUrl: `data:${contentType};base64,${base64Video}`,
            };
        }
    );
    return generateVideoFlow(input);
}
