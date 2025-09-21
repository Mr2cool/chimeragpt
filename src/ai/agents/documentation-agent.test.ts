import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentationAgent } from './documentation-agent';
import { createClient } from '@supabase/supabase-js';
import { AgentCapability, AgentTask } from '../types/agents';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }))
}));

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }
}));

describe('DocumentationAgent', () => {
  let agent: DocumentationAgent;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new DocumentationAgent();
    mockSupabase = createClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct default configuration', () => {
      expect(agent.id).toBe('documentation-agent');
      expect(agent.name).toBe('Documentation Agent');
      expect(agent.type).toBe('specialized');
      expect(agent.description).toBe('Generates comprehensive documentation including README files, API docs, and code comments');
      expect(agent.version).toBe('1.0.0');
      expect(agent.capabilities).toContain(AgentCapability.DOCUMENTATION);
      expect(agent.capabilities).toContain(AgentCapability.CODE_ANALYSIS);
      expect(agent.capabilities).toContain(AgentCapability.CONTENT_GENERATION);
      expect(agent.capabilities).toContain(AgentCapability.FILE_OPERATIONS);
    });
  });

  describe('executeTask', () => {
    const mockProjectInfo = {
      name: 'Test Project',
      description: 'A test project for documentation',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      repository: 'https://github.com/test/project'
    };

    const mockFiles = [
      {
        path: 'src/index.ts',
        content: `
          /**
           * Main application entry point
           */
          export function main() {
            console.log('Hello World');
          }
          
          export class TestClass {
            constructor(public name: string) {}
            
            greet(): string {
              return \`Hello, \${this.name}!\`;
            }
          }
        `
      },
      {
        path: 'src/utils.ts',
        content: `
          export interface User {
            id: number;
            name: string;
            email: string;
          }
          
          export function formatUser(user: User): string {
            return \`\${user.name} <\${user.email}>\`;
          }
        `
      }
    ];

    const baseTask: AgentTask = {
      id: 1,
      startTime: Date.now(),
      input: {
        projectInfo: mockProjectInfo,
        files: mockFiles,
        config: {
          type: 'readme' as const,
          format: 'markdown' as const,
          includeExamples: true,
          includeInstallation: true,
          includeUsage: true,
          includeAPI: true,
          includeTesting: true,
          includeContributing: true,
          style: 'detailed' as const,
          audience: 'developer' as const
        }
      }
    };

    it('should return error when no files or project info provided', async () => {
      const invalidTask = {
        ...baseTask,
        input: {}
      };

      const result = await agent.executeTask(invalidTask);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Either files or project info is required');
      expect(result.data).toBeNull();
    });

    it('should handle execution errors gracefully', async () => {
      const errorTask = {
        ...baseTask,
        input: {
          projectInfo: mockProjectInfo,
          config: {
            type: 'invalid-type' as any,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(errorTask);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported documentation type');
      expect(result.data).toBeNull();
    });
  });

  describe('README Generation', () => {
    const readmeTask: AgentTask = {
      id: 1,
      startTime: Date.now(),
      input: {
        projectInfo: {
          name: 'Awesome Project',
          description: 'An awesome project for testing',
          version: '2.1.0',
          author: 'John Doe',
          license: 'MIT',
          repository: 'https://github.com/johndoe/awesome-project'
        },
        files: [
          {
            path: 'src/api.ts',
            content: `
              export async function fetchData(url: string): Promise<any> {
                const response = await fetch(url);
                return response.json();
              }
            `
          }
        ],
        config: {
          type: 'readme' as const,
          format: 'markdown' as const,
          includeExamples: true,
          includeInstallation: true,
          includeUsage: true,
          includeAPI: true,
          includeTesting: true,
          includeContributing: true,
          style: 'detailed' as const,
          audience: 'developer' as const
        }
      }
    };

    it('should generate comprehensive README documentation', async () => {
      const result = await agent.executeTask(readmeTask);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.content).toContain('# Awesome Project');
      expect(result.data.content).toContain('An awesome project for testing');
      expect(result.data.format).toBe('markdown');
      expect(result.data.sections).toBeDefined();
      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.wordCount).toBeGreaterThan(0);
      expect(result.data.metadata.estimatedReadTime).toBeGreaterThan(0);
      expect(result.message).toContain('readme documentation generated successfully');
    });

    it('should include all requested sections', async () => {
      const result = await agent.executeTask(readmeTask);

      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).toContain('Header');
      expect(sectionTitles).toContain('Badges');
      expect(sectionTitles).toContain('Table of Contents');
      expect(sectionTitles).toContain('Installation');
      expect(sectionTitles).toContain('Usage');
      expect(sectionTitles).toContain('API Reference');
      expect(sectionTitles).toContain('Examples');
      expect(sectionTitles).toContain('Testing');
      expect(sectionTitles).toContain('Contributing');
      expect(sectionTitles).toContain('License');
    });

    it('should generate badges when repository info is available', async () => {
      const result = await agent.executeTask(readmeTask);

      const badgesSection = result.data.sections.find((s: any) => s.title === 'Badges');
      expect(badgesSection).toBeDefined();
      expect(badgesSection.content).toContain('![');
    });

    it('should respect configuration options', async () => {
      const minimalTask = {
        ...readmeTask,
        input: {
          ...readmeTask.input,
          config: {
            type: 'readme' as const,
            format: 'markdown' as const,
            includeExamples: false,
            includeInstallation: false,
            includeUsage: false,
            includeAPI: false,
            includeTesting: false,
            includeContributing: false,
            style: 'minimal' as const,
            audience: 'user' as const
          }
        }
      };

      const result = await agent.executeTask(minimalTask);

      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).not.toContain('Installation');
      expect(sectionTitles).not.toContain('Usage');
      expect(sectionTitles).not.toContain('API Reference');
      expect(sectionTitles).not.toContain('Examples');
      expect(sectionTitles).not.toContain('Testing');
      expect(sectionTitles).not.toContain('Contributing');
    });
  });

  describe('API Documentation Generation', () => {
    const apiTask: AgentTask = {
      id: 2,
      startTime: Date.now(),
      input: {
        files: [
          {
            path: 'src/api.ts',
            content: `
              /**
               * Fetches user data from the API
               * @param userId - The ID of the user
               * @returns Promise containing user data
               */
              export async function getUser(userId: number): Promise<User> {
                const response = await fetch(\`/api/users/\${userId}\`);
                return response.json();
              }
              
              export class UserService {
                constructor(private apiKey: string) {}
                
                async createUser(userData: CreateUserRequest): Promise<User> {
                  // Implementation
                }
                
                async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
                  // Implementation
                }
              }
              
              export interface User {
                id: number;
                name: string;
                email: string;
                createdAt: Date;
              }
              
              export interface CreateUserRequest {
                name: string;
                email: string;
              }
            `
          }
        ],
        config: {
          type: 'api' as const,
          format: 'markdown' as const,
          includeExamples: true,
          style: 'detailed' as const,
          audience: 'developer' as const
        }
      }
    };

    it('should generate API documentation', async () => {
      const result = await agent.executeTask(apiTask);

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('# API Documentation');
      expect(result.data.format).toBe('markdown');
      expect(result.data.sections.length).toBeGreaterThan(0);
    });

    it('should include functions, classes, and interfaces sections', async () => {
      const result = await agent.executeTask(apiTask);

      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).toContain('API Overview');
      expect(sectionTitles).toContain('Functions');
      expect(sectionTitles).toContain('Classes');
      expect(sectionTitles).toContain('Interfaces');
    });

    it('should provide helpful suggestions', async () => {
      const result = await agent.executeTask(apiTask);

      expect(result.data.suggestions).toBeDefined();
      expect(result.data.suggestions.length).toBeGreaterThan(0);
      expect(result.data.suggestions).toContain('Consider adding more detailed examples');
    });
  });

  describe('Code Comments Generation', () => {
    const commentsTask: AgentTask = {
      id: 3,
      startTime: Date.now(),
      input: {
        files: [
          {
            path: 'src/utils.ts',
            content: `
              function calculateTotal(items) {
                return items.reduce((sum, item) => sum + item.price, 0);
              }
              
              class ShoppingCart {
                constructor() {
                  this.items = [];
                }
                
                addItem(item) {
                  this.items.push(item);
                }
                
                getTotal() {
                  return calculateTotal(this.items);
                }
              }
            `
          }
        ],
        config: {
          type: 'code-comments' as const,
          format: 'markdown' as const,
          style: 'detailed' as const,
          audience: 'developer' as const
        }
      }
    };

    it('should generate code comments documentation', async () => {
      const result = await agent.executeTask(commentsTask);

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('src/utils.ts');
      expect(result.data.content).toContain('```typescript');
      expect(result.data.format).toBe('markdown');
    });

    it('should include comments count in suggestions', async () => {
      const result = await agent.executeTask(commentsTask);

      expect(result.data.suggestions).toBeDefined();
      expect(result.data.suggestions.some((s: string) => s.includes('comments'))).toBe(true);
    });
  });

  describe('User Guide Generation', () => {
    const userGuideTask: AgentTask = {
      id: 4,
      startTime: Date.now(),
      input: {
        projectInfo: {
          name: 'User App',
          description: 'A user-friendly application',
          version: '1.5.0',
          author: 'Team',
          license: 'MIT'
        },
        config: {
          type: 'user-guide' as const,
          format: 'markdown' as const,
          style: 'comprehensive' as const,
          audience: 'user' as const
        }
      }
    };

    it('should generate user guide documentation', async () => {
      const result = await agent.executeTask(userGuideTask);

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('# User App User Guide');
      expect(result.data.content).toContain('Welcome to User App');
      expect(result.data.format).toBe('markdown');
    });

    it('should include user-focused sections', async () => {
      const result = await agent.executeTask(userGuideTask);

      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).toContain('Introduction');
      expect(sectionTitles).toContain('Getting Started');
      expect(sectionTitles).toContain('Features');
      expect(sectionTitles).toContain('Troubleshooting');
    });

    it('should provide user-oriented suggestions', async () => {
      const result = await agent.executeTask(userGuideTask);

      expect(result.data.suggestions).toContain('Consider adding screenshots');
      expect(result.data.suggestions).toContain('Add video tutorials');
    });
  });

  describe('Technical Specification Generation', () => {
    const techSpecTask: AgentTask = {
      id: 5,
      startTime: Date.now(),
      input: {
        files: [
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'tech-project',
              dependencies: {
                'react': '^18.0.0',
                'typescript': '^4.9.0',
                'express': '^4.18.0'
              }
            })
          }
        ],
        projectInfo: {
          name: 'Tech Project',
          description: 'A technical project',
          version: '1.0.0',
          author: 'Tech Team',
          license: 'MIT'
        },
        config: {
          type: 'technical-spec' as const,
          format: 'markdown' as const,
          style: 'comprehensive' as const,
          audience: 'technical' as const
        }
      }
    };

    it('should generate technical specification', async () => {
      const result = await agent.executeTask(techSpecTask);

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('# Technical Specification');
      expect(result.data.content).toContain('Architecture Overview');
      expect(result.data.format).toBe('markdown');
    });

    it('should include technical sections', async () => {
      const result = await agent.executeTask(techSpecTask);

      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).toContain('Architecture');
      expect(sectionTitles).toContain('Technology Stack');
      expect(sectionTitles).toContain('Database Schema');
      expect(sectionTitles).toContain('API Endpoints');
    });
  });

  describe('Metadata Generation', () => {
    const metadataTask: AgentTask = {
      id: 6,
      startTime: Date.now(),
      input: {
        projectInfo: {
          name: 'Test Project',
          description: 'A test project',
          version: '1.0.0',
          author: 'Test Author',
          license: 'MIT'
        },
        config: {
          type: 'readme' as const,
          format: 'markdown' as const,
          style: 'minimal' as const,
          audience: 'developer' as const
        }
      }
    };

    it('should generate accurate metadata', async () => {
      const result = await agent.executeTask(metadataTask);

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.generatedAt).toBeDefined();
      expect(result.data.metadata.version).toBe('1.0.0');
      expect(result.data.metadata.wordCount).toBeGreaterThan(0);
      expect(result.data.metadata.estimatedReadTime).toBeGreaterThan(0);
    });

    it('should calculate word count correctly', async () => {
      const result = await agent.executeTask(metadataTask);

      const actualWordCount = result.data.content.split(/\s+/).length;
      expect(result.data.metadata.wordCount).toBe(actualWordCount);
    });

    it('should calculate estimated read time', async () => {
      const result = await agent.executeTask(metadataTask);

      const expectedReadTime = Math.ceil(result.data.metadata.wordCount / 200);
      expect(result.data.metadata.estimatedReadTime).toBe(expectedReadTime);
    });
  });

  describe('Database Integration', () => {
    it('should store documentation results in database', async () => {
      const task: AgentTask = {
        id: 123,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          },
          config: {
            type: 'readme' as const,
            format: 'markdown' as const
          }
        }
      };

      await agent.executeTask(task);

      expect(mockSupabase.from).toHaveBeenCalledWith('agent_task_results');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 123,
          result_type: 'documentation',
          result_data: expect.any(Object),
          created_at: expect.any(String)
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from().insert.mockRejectedValueOnce(new Error('Database error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          },
          config: {
            type: 'readme' as const,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      // Should still succeed even if database storage fails
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store documentation results:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Handling', () => {
    it('should use default configuration when none provided', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('markdown');
      // Should include default sections
      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).toContain('Installation');
      expect(sectionTitles).toContain('Usage');
      expect(sectionTitles).toContain('API Reference');
    });

    it('should merge custom configuration with defaults', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          },
          config: {
            type: 'readme' as const,
            includeInstallation: false,
            style: 'minimal' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      // Should respect custom config
      const sectionTitles = result.data.sections.map((s: any) => s.title);
      expect(sectionTitles).not.toContain('Installation');
      // Should use defaults for unspecified options
      expect(result.data.format).toBe('markdown');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file content gracefully', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          files: [
            {
              path: 'invalid.ts',
              content: null as any // Invalid content
            }
          ],
          config: {
            type: 'api' as const,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should handle missing project info gracefully', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          config: {
            type: 'user-guide' as const,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Either files or project info is required');
      expect(result.data).toBeNull();
    });
  });

  describe('Content Quality', () => {
    it('should generate non-empty content', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          },
          config: {
            type: 'readme' as const,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.content.length).toBeGreaterThan(100);
      expect(result.data.sections.length).toBeGreaterThan(0);
      expect(result.data.metadata.wordCount).toBeGreaterThan(10);
    });

    it('should generate well-structured markdown', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          },
          config: {
            type: 'readme' as const,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.data.content).toContain('# Test Project');
      expect(result.data.content).toContain('## ');
      expect(result.data.content).toMatch(/\n\n/); // Should have proper spacing
    });

    it('should provide helpful suggestions', async () => {
      const task: AgentTask = {
        id: 1,
        startTime: Date.now(),
        input: {
          projectInfo: {
            name: 'Test Project',
            description: 'A test project',
            version: '1.0.0',
            author: 'Test Author',
            license: 'MIT'
          },
          config: {
            type: 'readme' as const,
            format: 'markdown' as const
          }
        }
      };

      const result = await agent.executeTask(task);

      expect(result.data.suggestions).toBeDefined();
      expect(result.data.suggestions.length).toBeGreaterThan(0);
      expect(result.data.suggestions.every((s: string) => typeof s === 'string')).toBe(true);
    });
  });
});