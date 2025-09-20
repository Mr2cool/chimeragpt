import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

/**
 * @fileoverview Inspired by the AgentLite paper, this file defines a lightweight,
 * modular, and hierarchical agent system for the Chimera Framework.
 *
 * It includes base classes for Actions, AI Agents, and a Manager Agent that
 * can orchestrate a team of other agents to accomplish complex tasks.
 */

// Base class for all actions an agent can perform.
export abstract class BaseAction {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: z.ZodTypeAny;
  abstract outputSchema: z.ZodTypeAny;

  abstract execute(input: any): Promise<any>;
}

// A simple in-memory store for agent action-observation history.
class Memory {
  private history: string[] = [];

  add(entry: string) {
    this.history.push(entry);
  }

  getHistory(): string {
    return this.history.join('\n');
  }
}

/**
 * The base class for an individual AI agent. It encapsulates the core logic of
 * an agent: its role, a set of actions (tools), and memory.
 */
export class AIAgent {
  public name: string;
  public role: string;
  public actions: BaseAction[];
  protected memory: Memory;

  constructor(name: string, role: string, actions: BaseAction[] = []) {
    this.name = name;
    this.role = role;
    this.actions = actions;
    this.memory = new Memory();
  }

  protected getPrompt(task: string) {
    const actionDescriptions = this.actions
      .map(action => `- ${action.name}: ${action.description} (Input: ${action.inputSchema.description || 'string'})`)
      .join('\n');

    return ai.definePrompt({
        name: `${this.name.toLowerCase().replace(/\s+/g, '-')}-prompt`,
        model: googleAI.model('gemini-1.5-flash-latest'),
        prompt: `You are ${this.name}, a specialized AI agent with the role: "${this.role}".
Your overall task is: "${task}".

You have access to the following tools:
${actionDescriptions}
- Finish: Use this action when you have completed the task and have a final answer. Input should be your final answer.

Conversation History & Observations:
---
${this.memory.getHistory()}
---

Based on the task and history, decide which action to take next to make progress.
Respond with only the name of the action and the input for it in a single line, like this: "ActionName: input value".
If you have completed the task, use the "Finish" action.`,
    });
  }

  async run(task: string): Promise<string> {
     throw new Error("The 'run' method must be implemented by a subclass. Use AutonomousAgent for multi-step tasks.");
  }
}

/**
 * An autonomous agent that can perform multiple steps to complete a task.
 * It uses a loop to think, act, and observe until it decides to finish.
 */
export class AutonomousAgent extends AIAgent {
    private maxSteps: number;

    constructor(name: string, role: string, actions: BaseAction[] = [], maxSteps: number = 10) {
        super(name, role, actions);
        this.maxSteps = maxSteps;
    }

    async run(task: string): Promise<string> {
        this.memory.add(`Task started: ${task}`);
        const agentPrompt = this.getPrompt(task);
        
        for (let i = 0; i < this.maxSteps; i++) {
            const { text } = await agentPrompt();
            if (!text) {
                const error = "Agent failed to generate a response.";
                this.memory.add(`Observation: ${error}`);
                return error;
            }

            const [actionName, ...inputParts] = text.split(':');
            const input = inputParts.join(':').trim();

            this.memory.add(`Thought: I will use the ${actionName} tool. Input: "${input}"`);

            if (actionName.toLowerCase() === 'finish') {
                this.memory.add(`Observation: Task finished. Final Answer: ${input}`);
                return input; // Task is complete
            }

            const action = this.actions.find(a => a.name === actionName);
            if (!action) {
                const error = `Error: Action "${actionName}" not found. Available actions: ${this.actions.map(a => a.name).join(', ')}, Finish.`;
                this.memory.add(`Observation: ${error}`);
                continue; // Allow the agent to try again
            }
            
            try {
                // We don't validate schema here as the LLM output is freeform.
                const output = await action.execute(input);
                const observation = `Observation: ${JSON.stringify(output)}`;
                this.memory.add(observation);
            } catch (e) {
                const error = `Error executing action ${actionName}: ${e instanceof Error ? e.message : 'Unknown error'}`;
                this.memory.add(`Observation: ${error}`);
            }
        }
        const finalMessage = `Task failed to complete within ${this.maxSteps} steps.`;
        this.memory.add(finalMessage);
        return finalMessage;
    }
}


/**
 * A manager agent that can orchestrate a team of other agents.
 * It decomposes a task and delegates sub-tasks to its team members.
 */
export class ManagerAgent extends AutonomousAgent {
    public team: AIAgent[];

    constructor(name: string, role: string, team: AIAIAgent[], maxSteps: number = 10) {
        // The manager's "actions" are its team members.
        const teamAsActions = team.map(agent => new (class extends BaseAction {
            name = agent.name;
            description = `Delegate a sub-task to this agent. Role: ${agent.role}`;
            inputSchema = z.string().describe('The specific and actionable sub-task for the agent.');
            outputSchema = z.string();
            async execute(subTask: string): Promise<string> {
                // Ensure team members are autonomous to handle multi-step sub-tasks
                if (agent instanceof AutonomousAgent) {
                    return agent.run(subTask);
                }
                // Fallback for simple agents, though Autonomous is preferred for delegation.
                const simpleAgent = new AutonomousAgent(agent.name, agent.role, agent.actions, 5);
                return simpleAgent.run(subTask);
            }
        })());

        super(name, role, teamAsActions, maxSteps);
        this.team = team;
    }
}
