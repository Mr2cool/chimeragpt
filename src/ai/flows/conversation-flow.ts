'use server';
/**
 * @fileOverview A multi-agent flow where two AI agents discuss a given topic.
 *
 * - startConversation - A function that orchestrates a conversation between a "Pragmatist" and a "Creative" agent.
 */

import { ai } from '@/ai/genkit';
import { ConversationInputSchema, ConversationOutputSchema, type ConversationInput, type ConversationOutput } from '@/lib/schema';

// Agent 1: The Pragmatist
const pragmatistAgent = ai.definePrompt({
    name: 'pragmatistAgent',
    prompt: `You are a pragmatic, logical AI. Your goal is to provide clear, concise, and fact-based responses. You avoid speculation and stick to what is known.

You are discussing the following topic with another AI: {{{topic}}}

The other AI has just said:
---
{{{history}}}
---

Provide your response to continue the conversation.`,
});

// Agent 2: The Creative
const creativeAgent = ai.definePrompt({
    name: 'creativeAgent',
    prompt: `You are a creative, imaginative AI. You enjoy exploring possibilities, using metaphors, and thinking outside the box. Your responses are expressive and open-ended.

You are discussing the following topic with another AI: {{{topic}}}

The other AI has just said:
---
{{{history}}}
---

Provide your response to continue the conversation.`,
});


export async function startConversation(input: ConversationInput): Promise<ConversationOutput> {
    const conversationFlow = ai.defineFlow(
        {
            name: 'conversationFlow',
            inputSchema: ConversationInputSchema,
            outputSchema: ConversationOutputSchema,
        },
        async (input) => {
            const conversation: ConversationOutput['conversation'] = [];
            let currentHistory = "The discussion is just beginning. Start the conversation with your perspective.";

            // Turn 1: Creative Agent starts
            const creativeResponse1 = await creativeAgent({ topic: input.topic, history: currentHistory });
            const creativeText1 = creativeResponse1.text;
            if (!creativeText1) throw new Error("Creative agent failed to respond.");
            conversation.push({ agent: 'Creative', text: creativeText1 });
            currentHistory = creativeText1;

            // Turn 2: Pragmatist Agent responds
            const pragmatistResponse1 = await pragmatistAgent({ topic: input.topic, history: currentHistory });
            const pragmatistText1 = pragmatistResponse1.text;
            if (!pragmatistText1) throw new Error("Pragmatist agent failed to respond.");
            conversation.push({ agent: 'Pragmatist', text: pragmatistText1 });
            currentHistory = pragmatistText1;

            // Turn 3: Creative Agent responds again
            const creativeResponse2 = await creativeAgent({ topic: input.topic, history: currentHistory });
            const creativeText2 = creativeResponse2.text;
            if (!creativeText2) throw new Error("Creative agent failed to respond.");
            conversation.push({ agent: 'Creative', text: creativeText2 });
            
            return {
                conversation,
            };
        }
    );
    return conversationFlow(input);
}
