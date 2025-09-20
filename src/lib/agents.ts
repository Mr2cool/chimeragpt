import { ai } from '@/ai/genkit';
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
  private memory: Memory;

  constructor(name: string, role: string, actions: BaseAction[] = []) {
    this.name = name;
    this.role = role;
    this.actions = actions;
    this.memory = new Memory();
  }

  async run(task: string): Promise<string> {
    const actionDescriptions = this.actions
      .map(action => `- ${action.name}: ${action.description}`)
      .join('\n');

    const prompt = ai.definePrompt({
        name: `${this.name.toLowerCase().replace(' ', '-')}-prompt`,
        prompt: `You are ${this.name}, a specialized AI agent with the role: "${this.role}".
Your task is: "${task}".

You have access to the following tools:
${actionDescriptions}
- Finish: Use this action when you have completed the task and have a final answer.

Conversation History:
---
${this.memory.getHistory()}
---

Based on the task and history, decide which action to take next.
Respond with the name of the action and the input for it in a single line, like this: "ActionName: input value".`,
    });

    const { text } = await prompt();
    if (!text) {
      throw new Error("Agent failed to generate a response.");
    }
    const [actionName, ...inputParts] = text.split(':');
    const input = inputParts.join(':').trim();

    this.memory.add(`Agent Thought: I will use the ${actionName} tool.`);

    if (actionName.toLowerCase() === 'finish') {
      this.memory.add(`Observation: Task finished. Final Answer: ${input}`);
      return input; // Task is complete
    }

    const action = this.actions.find(a => a.name === actionName);
    if (!action) {
      const error = `Error: Action "${actionName}" not found.`;
      this.memory.add(`Observation: ${error}`);
      return error;
    }
    
    try {
        const parsedInput = await action.inputSchema.parseAsync(input);
        const output = await action.execute(parsedInput);
        const observation = `Observation: ${JSON.stringify(output)}`;
        this.memory.add(observation);
        // This is a simplified loop for one step. A real implementation would loop until "Finish".
        return `Action Used: ${actionName}. Observation: ${JSON.stringify(output)}.`;
    } catch (e) {
        const error = `Error executing action ${actionName}: ${e instanceof Error ? e.message : 'Unknown error'}`;
        this.memory.add(`Observation: ${error}`);
        return error;
    }
  }
}

/**
 * A manager agent that can orchestrate a team of other agents.
 * It decomposes a task and delegates sub-tasks to its team members.
 */
export class ManagerAgent extends AIAgent {
    public team: AIAgent[];

    constructor(name: string, role: string, team: AIAgent[]) {
        // The manager's "actions" are its team members.
        const teamAsActions = team.map(agent => new (class extends BaseAction {
            name = agent.name;
            description = `Delegate a sub-task to this agent. Role: ${agent.role}`;
            inputSchema = z.string();
            outputSchema = z.string();
            async execute(subTask: string): Promise<string> {
                return agent.run(subTask);
            }
        })());

        super(name, role, teamAsActions);
        this.team = team;
    }

    // The manager's run method is inherited from AIAgent, but it uses its team members as its tools.
}
