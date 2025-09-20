
'use server';
/**
 * @fileOverview A flow to design a conceptual architecture for a new multi-agent framework.
 *
 * - designFramework - A function that generates a framework design based on a user's goal.
 */

import {ai} from '@/ai/genkit';
import { DesignFrameworkInputSchema, DesignFrameworkOutputSchema, type DesignFrameworkInput, type DesignFrameworkOutput } from '@/lib/schema';
import { googleAI } from '@genkit-ai/googleai';

export async function designFramework(input: DesignFrameworkInput): Promise<DesignFrameworkOutput> {
    const knownFrameworks = [
        { name: 'nanobot', description: 'An open-source MCP host for building dedicated chatbots with configurable models.' },
        { name: 'CAMEL', description: 'A multi-agent framework for studying communicative agents and their evolution.' },
        { name: 'Eigent', description: 'A multi-agent AI workforce for automating complex workflows through parallel execution.' },
        { name: 'LiteLLM', description: 'A unified API to call over 100+ LLM APIs in a consistent format.' },
        { name: 'Dolt', description: 'A version-controlled SQL database, like Git for data.' },
        { name: 'Mem0', description: 'A universal memory layer for AI agents to provide personalized interactions.' },
        { name: 'A2A Protocol', description: 'An open standard for enabling seamless communication and collaboration between AI agents.' },
        { name: 'AP2 Protocol', description: 'An extension to A2A for enabling secure, reliable, and interoperable agent commerce.' },
        { name: 'CrewAI', description: 'A framework for orchestrating autonomous AI agents to work collaboratively.' },
        { name: 'LangGraph', description: 'A framework for building stateful, multi-agent applications with cycles, built on LangChain.' },
        { name: 'LangFlow', description: 'A visual low-code tool for building and deploying AI-powered agents and workflows.' }
    ];

    const designFrameworkFlow = ai.defineFlow(
      {
        name: 'designFrameworkFlow',
        inputSchema: DesignFrameworkInputSchema,
        outputSchema: DesignFrameworkOutputSchema,
      },
      async input => {
        const prompt = ai.definePrompt({
          name: 'frameworkDesignPrompt',
          model: googleAI.model('gemini-2.5-flash-preview'),
          input: {schema: DesignFrameworkInputSchema},
          output: {schema: DesignFrameworkOutputSchema},
          prompt: `You are a world-class AI architect specializing in multi-agent systems. Your task is to design a high-level conceptual architecture for a **new, unified framework** that can handle multi-agent deployment, communication protocols, and collaboration.

The user has a specific goal for their system. Your design should be tailored to that goal.

**User's Goal:**
{{{goal}}}

**Available Technologies (Your Knowledge Base):**
You should consider how the following existing frameworks and protocols could be integrated or drawn upon as inspiration for your new framework design. Do not simply list them; explain how their concepts can be woven into a cohesive new architecture.
${knownFrameworks.map(f => `- **${f.name}:** ${f.description}`).join('\n')}

---
**EXAMPLE WORKFLOW (Learn from this high-quality example):**

Below is an example of a well-structured architectural proposal for a different goal ("an automated system for booking travel"). Use this as a template and guide for the structure, detail, and quality of your own output.

## Conceptual Overview
**Framework Name:** "Voyager"
**Core Principles:** Voyager is designed based on principles of modularity, asynchronous communication, and dynamic composition. It allows for the creation of a decentralized network of specialized travel agents that can be composed on-the-fly to handle complex user requests.

## Core Components
*   **Agent Core:** A lightweight, containerized execution environment for individual agents (e.g., FlightSearchAgent, HotelBookingAgent).
*   **Orchestration Layer (inspired by CrewAI):** A central service that receives user goals, decomposes them into tasks, and assigns them to the appropriate agents.
*   **Communication Bus (inspired by A2A Protocol):** A message broker (e.g., RabbitMQ or NATS) that facilitates asynchronous, standardized communication between agents using a defined message schema.
*   **Shared Memory & State (inspired by Mem0):** A distributed cache (e.g., Redis) that stores the state of ongoing travel plans, user preferences, and shared context, allowing agents to access information without direct coupling.
*   **Tool & Service Integration (inspired by LiteLLM):** A unified interface for agents to access external APIs (e.g., airline booking systems, hotel APIs, payment gateways like AP2).

## Communication Protocol
*   **Message Structure:** Messages follow a standard format: \`{ "sender": "agent_id", "receiver": "agent_id", "task_id": "uuid", "payload": { ... } }\`.
*   **Security:** Communication is secured using JWTs, with each agent having its own credentials. AP2 principles are used for any payment-related messages to ensure non-repudiation.

## Example Workflow (for "book a trip to Paris")
1.  User submits goal: "Book a round-trip flight to Paris and a 3-night hotel for next month."
2.  **Orchestrator** receives the goal, creates a \`trip_id\`, and dispatches two tasks: \`find_flights\` to \`FlightSearchAgent\` and \`find_hotels\` to \`HotelBookingAgent\`.
3.  **FlightSearchAgent** queries external airline APIs and publishes a list of flight options to the \`trip_id\` topic on the **Communication Bus**.
4.  **HotelBookingAgent** similarly queries hotel APIs and publishes options.
5.  **Orchestrator** consumes these options, combines them, and presents them to the user for approval.
6.  Upon user approval, the Orchestrator dispatches \`book_flight\` and \`book_hotel\` tasks, which use the **Tool & Service Integration** layer (and AP2) to complete the bookings.
---

**YOUR TASK: Generate a similar, detailed architectural proposal for the user's goal stated above.** Your output must be a markdown document with the same sections as the example.
`,
        });
        const {output} = await prompt(input);
        return output!;
      }
    );
    return designFrameworkFlow(input);
}
