/**
 * @fileoverview Shared Zod schemas for Genkit flows.
 */
import { z } from 'zod';

// Schema for src/ai/flows/readme-enhancement.ts
export const EnhanceReadmeInputSchema = z.object({
  repoDescription: z.string().describe('The description of the GitHub repository.'),
  readmeContent: z.string().describe('The content of the README.md file.'),
  repoUrl: z.string().describe('The URL of the GitHub repository.'),
});
export type EnhanceReadmeInput = z.infer<typeof EnhanceReadmeInputSchema>;

export const EnhanceReadmeOutputSchema = z.object({
  enhancedReadme: z.string().describe('The enhanced README content with the AI-generated introduction.'),
});
export type EnhanceReadmeOutput = z.infer<typeof EnhanceReadmeOutputSchema>;


// Schema for src/ai/flows/repo-analysis.ts
export const RepoAnalysisInputSchema = z.object({
  filePaths: z.array(z.string()).describe('A list of all file paths in the repository.'),
  repoDescription: z.string().describe('The description of the GitHub repository.'),
});
export type RepoAnalysisInput = z.infer<typeof RepoAnalysisInputSchema>;

const IssueSchema = z.object({
    name: z.string().describe('A short, descriptive name for the issue.'),
    reason: z.string().describe('A detailed explanation of the issue and its potential impact.'),
});

export const RepoAnalysisOutputSchema = z.object({
  technologies: z.array(z.string()).describe('A list of languages, frameworks, and key libraries identified in the repository.'),
  summary: z.string().describe('A summary of the project\'s likely purpose and architecture based on its file structure.'),
  potentialBugs: z.array(IssueSchema).describe('A list of potential bugs or issues found in the code.'),
  securityVulnerabilities: z.array(IssueSchema).describe('A list of potential security vulnerabilities.'),
  architecturalLimitations: z.array(IssueSchema).describe('A list of architectural limitations or scalability concerns.'),
});
export type RepoAnalysisOutput = z.infer<typeof RepoAnalysisOutputSchema>;


// Schema for src/ai/flows/framework-design.ts
export const DesignFrameworkInputSchema = z.object({
  goal: z.string().min(10, { message: "Goal must be at least 10 characters."}).describe('The high-level goal of the multi-agent system.'),
});
export type DesignFrameworkInput = z.infer<typeof DesignFrameworkInputSchema>;

export const DesignFrameworkOutputSchema = z.object({
  architecture: z.string().describe('A markdown-formatted document describing the proposed conceptual architecture for the new framework.'),
});
export type DesignFrameworkOutput = z.infer<typeof DesignFrameworkOutputSchema>;


// Schema for src/ai/flows/web-agent.ts
export const WebTaskInputSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to analyze.'),
  task: z. string().describe('The task to perform on the webpage.'),
});
export type WebTaskInput = z.infer<typeof WebTaskInputSchema>;

export const WebTaskOutputSchema = z.object({
  result: z.string().describe('The result of the task, formatted as a markdown document.'),
});
export type WebTaskOutput = z.infer<typeof WebTaskOutputSchema>;


// Schema for src/ai/flows/video-generation.ts
export const GenerateVideoInputSchema = z.object({
  prompt: z.string().describe('A text description of the video to generate.'),
});
export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

export const GenerateVideoOutputSchema = z.object({
  videoUrl: z.string().describe('The data URI of the generated video.'),
});
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;


// Schema for src/ai/flows/app-ideation.ts
export const AppIdeationInputSchema = z.object({
  repoName: z.string().describe("The name of the source repository."),
  repoDescription: z.string().describe("The description of the source repository."),
  filePaths: z.array(z.string()).describe("The list of file paths from the source repository."),
});
export type AppIdeationInput = z.infer<typeof AppIdeationInputSchema>;

export const AppIdeationOutputSchema = z.object({
  ideas: z.array(
    z.object({
      name: z.string().describe("The name of the modernization plan."),
      description: z.string().describe("A detailed one-paragraph description of the proposed modernization."),
      techStack: z.array(z.string()).describe("A list of recommended technologies for the upgrade."),
      agents: z.array(
        z.object({
          name: z.string().describe("The name of a new AI agent to integrate."),
          description: z.string().describe("The description of the new AI agent's role."),
        })
      ).describe("A list of new AI agents that could be integrated into the modernized application."),
      todoList: z.array(z.string()).describe("A high-level list of actionable to-do items for the modernization project."),
    })
  ).describe("A list of generated modernization plans."),
});
export type AppIdeationOutput = z.infer<typeof AppIdeationOutputSchema>;


// Schema for src/ai/flows/readme-qna.ts
export const ReadmeQnaInputSchema = z.object({
  readmeContent: z.string().describe("The full content of the README.md file."),
  question: z.string().min(5, "Question must be at least 5 characters.").describe("The user's question about the README."),
});
export type ReadmeQnaInput = z.infer<typeof ReadmeQnaInputSchema>;

export const ReadmeQnaOutputSchema = z.object({
  answer: z.string().describe("The AI-generated answer to the user's question."),
});
export type ReadmeQnaOutput = z.infer<typeof ReadmeQnaOutputSchema>;


// Schema for src/ai/flows/conversation-flow.ts
export const ConversationInputSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters.").describe("The topic for the AI agents to discuss."),
  numTurns: z.number().int().min(1).max(5).describe("The number of conversational turns."),
});
export type ConversationInput = z.infer<typeof ConversationInputSchema>;

export const ConversationOutputSchema = z.object({
  conversation: z.array(
    z.object({
      agent: z.enum(["Creative", "Pragmatist"]),
      text: z.string(),
    })
  ).describe("The full conversation history between the two agents."),
});
export type ConversationOutput = z.infer<typeof ConversationOutputSchema>;


// Schema for src/ai/flows/story-creator.ts
export const StoryCreatorInputSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters long.").describe("The user's prompt for the story."),
});
export type StoryCreatorInput = z.infer<typeof StoryCreatorInputSchema>;

export const StoryCreatorOutputSchema = z.object({
  story: z.string().describe("The generated short story."),
  imageUrl: z.string().url().describe("The URL of the generated cover image."),
});
export type StoryCreatorOutput = z.infer<typeof StoryCreatorOutputSchema>;
