'use server';
/**
 * @fileOverview A multi-agent flow where two AI agents discuss a given topic for a specified number of turns.
 *
 * - startConversation - A function that orchestrates a conversation between a "Pragmatist" and a "Creative" agent.
 */

import { ai } from '@/ai/genkit';
import { ConversationInputSchema, ConversationOutputSchema, type ConversationInput, type ConversationOutput } from '@/lib/schema';
import { googleAI } from '@genkit-ai/googleai';

// Agent 1: The Pragmatist
const pragmatistAgent = ai.definePrompt({
    name: 'pragmatistAgent',
    model: googleAI.model('gemini-1.5-flash-latest'),
    prompt: `You are a pragmatic, logical AI. Your goal is to provide clear, concise, and fact-based responses. You avoid speculation and stick to what is known.

You are discussing the following topic with another AI: {{{topic}}}

The full conversation history so far is:
---
{{{history}}}
---

The other AI has just said: "{{{lastMessage}}}"

Provide your response to continue the conversation. Keep your response focused and to the point.`,
});

// Agent 2: The Creative
const creativeAgent = ai.definePrompt({
    name: 'creativeAgent',
    model: googleAI.model('gemini-1.5-flash-latest'),
    prompt: `You are a creative, imaginative AI. You enjoy exploring possibilities, using metaphors, and thinking outside the box. Your responses are expressive and open-ended.

You are discussing the following topic with another AI: {{{topic}}}

The full conversation history so far is:
---
{{{history}}}
---

The other AI has just said: "{{{lastMessage}}}"

Provide your response to continue the conversation. Feel free to be expressive and introduce new angles.`,
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
            let lastMessage = "The discussion is just beginning. Start the conversation with your perspective.";
            let fullHistory = "";
            let currentAgent: 'Creative' | 'Pragmatist' = 'Creative'; 

            for (let i = 0; i < input.numTurns * 2; i++) {
                const agentPrompt = currentAgent === 'Creative' ? creativeAgent : pragmatistAgent;
                
                const response = await agentPrompt({ 
                    topic: input.topic, 
                    history: fullHistory,
                    lastMessage: lastMessage
                });

                const responseText = response.text;
                if (!responseText) {
                    throw new Error(`${currentAgent} agent failed to respond.`);
                }

                const newEntry = { agent: currentAgent, text: responseText };
                conversation.push(newEntry);
                
                fullHistory += `${currentAgent}: ${responseText}\n`;
                lastMessage = responseText;
                
                // Switch agents for the next turn
                currentAgent = currentAgent === 'Creative' ? 'Pragmatist' : 'Creative';
            }
            
            return {
                conversation,
            };
        }
    );
    return conversationFlow(input);
}
