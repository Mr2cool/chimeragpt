import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodeReviewAgent } from './code-review-agent';
import { createClient } from '@supabase/supabase-js';

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

describe('CodeReviewAgent', () => {
  let agent: CodeReviewAgent;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new CodeReviewAgent();
    mockSupabase = createClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct default configuration', () => {
      expect(agent.name).toBe('Code Review Agent');
      expect(agent.description).toBe('Analyzes code for security vulnerabilities, performance issues, and best practices');
      expect(agent.version).toBe('1.0.0');
      expect(agent.capabilities).toContain('code-analysis');
      expect(agent.capabilities).toContain('security-scan');
      expect(agent.capabilities).toContain('performance-analysis');
      expect(agent.capabilities).toContain('quality-assessment');
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        name: 'Custom Code Review Agent',
        version: '2.0.0'
      };
      const customAgent = new CodeReviewAgent(customConfig);
      expect(customAgent.name).toBe('Custom Code Review Agent');
      expect(customAgent.version).toBe('2.0.0');
    });
  });

  describe('execute', () => {
    const mockTask = {
      id: 1,
      startTime: Date.now(),
      input: {
        code: 'console.log("test");',
        config: {
          checkSecurity: true,
          checkPerformance: true,
          checkBestPractices: true,
          checkAccessibility: false,
          severity: 'medium' as const,
          frameworks: ['react'],
          languages: ['typescript']
        }
      }
    };

    it('should successfully review code and return results', async () => {
      const result = await agent.execute(mockTask);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.issues).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.metrics).toBeDefined();
      expect(result.message).toContain('Code review completed');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThan(0);
    });

    it('should handle file-based review', async () => {
      const fileTask = {
        ...mockTask,
        input: {
          files: [
            { path: 'test.ts', content: 'console.log("test");' },
            { path: 'app.ts', content: 'eval("dangerous code");' }
          ],
          config: mockTask.input.config
        }
      };

      const result = await agent.execute(fileTask);

      expect(result.success).toBe(true);
      expect(result.data.issues.length).toBeGreaterThan(0);
      expect(result.data.issues.some(issue => issue.rule === 'no-eval')).toBe(true);
    });

    it('should return error when no code or files provided', async () => {
      const invalidTask = {
        ...mockTask,
        input: {}
      };

      const result = await agent.execute(invalidTask);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Either code string or files array is required');
      expect(result.data).toBeNull();
    });

    it('should handle execution errors gracefully', async () => {
      // Mock an error in the review process
      const errorTask = {
        ...mockTask,
        input: {
          code: null // This should cause an error
        }
      };

      const result = await agent.execute(errorTask);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('Security Checks', () => {
    it('should detect eval usage', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'const result = eval("1 + 1");',
          config: { checkSecurity: true }
        }
      };

      const result = await agent.execute(task);

      expect(result.success).toBe(true);
      const evalIssue = result.data.issues.find((issue: any) => issue.rule === 'no-eval');
      expect(evalIssue).toBeDefined();
      expect(evalIssue.type).toBe('security');
      expect(evalIssue.severity).toBe('critical');
      expect(evalIssue.message).toContain('eval() is dangerous');
    });

    it('should detect innerHTML usage', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'element.innerHTML = userInput;',
          config: { checkSecurity: true }
        }
      };

      const result = await agent.execute(task);

      const innerHTMLIssue = result.data.issues.find((issue: any) => issue.rule === 'no-inner-html');
      expect(innerHTMLIssue).toBeDefined();
      expect(innerHTMLIssue.type).toBe('security');
      expect(innerHTMLIssue.severity).toBe('high');
    });

    it('should detect document.write usage', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'document.write("<script>alert(1)</script>");',
          config: { checkSecurity: true }
        }
      };

      const result = await agent.execute(task);

      const docWriteIssue = result.data.issues.find((issue: any) => issue.rule === 'no-document-write');
      expect(docWriteIssue).toBeDefined();
      expect(docWriteIssue.type).toBe('security');
      expect(docWriteIssue.severity).toBe('high');
    });

    it('should detect environment variable exposure', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'const apiKey = process.env.SECRET_API_KEY;',
          config: { checkSecurity: true }
        }
      };

      const result = await agent.execute(task);

      const envVarIssue = result.data.issues.find((issue: any) => issue.rule === 'env-var-exposure');
      expect(envVarIssue).toBeDefined();
      expect(envVarIssue.type).toBe('security');
      expect(envVarIssue.severity).toBe('medium');
    });
  });

  describe('Performance Checks', () => {
    it('should detect unnecessary useEffect', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'useEffect(() => { console.log("mounted"); }, []);',
          config: { checkPerformance: true }
        }
      };

      const result = await agent.execute(task);

      const effectIssue = result.data.issues.find((issue: any) => issue.rule === 'unnecessary-effect');
      expect(effectIssue).toBeDefined();
      expect(effectIssue.type).toBe('performance');
      expect(effectIssue.severity).toBe('medium');
    });

    it('should detect inefficient chaining', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'const result = items.map(x => x * 2).filter(x => x > 10);',
          config: { checkPerformance: true }
        }
      };

      const result = await agent.execute(task);

      const chainingIssue = result.data.issues.find((issue: any) => issue.rule === 'inefficient-chaining');
      expect(chainingIssue).toBeDefined();
      expect(chainingIssue.type).toBe('performance');
      expect(chainingIssue.severity).toBe('low');
    });

    it('should detect console statements', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'console.log("debug info"); console.error("error");',
          config: { checkPerformance: true }
        }
      };

      const result = await agent.execute(task);

      const consoleIssues = result.data.issues.filter((issue: any) => issue.rule === 'console-statements');
      expect(consoleIssues.length).toBe(2);
      expect(consoleIssues[0].type).toBe('performance');
      expect(consoleIssues[0].severity).toBe('low');
    });
  });

  describe('Best Practices Checks', () => {
    it('should detect var usage', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'var oldStyle = "should use let or const";',
          config: { checkBestPractices: true }
        }
      };

      const result = await agent.execute(task);

      const varIssue = result.data.issues.find((issue: any) => issue.rule === 'no-var');
      expect(varIssue).toBeDefined();
      expect(varIssue.type).toBe('best-practice');
      expect(varIssue.severity).toBe('medium');
    });

    it('should detect loose equality', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'if (value == "test") { return true; }',
          config: { checkBestPractices: true }
        }
      };

      const result = await agent.execute(task);

      const equalityIssue = result.data.issues.find((issue: any) => issue.rule === 'strict-equality');
      expect(equalityIssue).toBeDefined();
      expect(equalityIssue.type).toBe('best-practice');
      expect(equalityIssue.severity).toBe('medium');
    });

    it('should detect component naming issues', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'function MyComponent() { return <div>Hello</div>; }',
          config: { checkBestPractices: true }
        }
      };

      const result = await agent.execute(task);

      const namingIssue = result.data.issues.find((issue: any) => issue.rule === 'component-naming');
      expect(namingIssue).toBeDefined();
      expect(namingIssue.type).toBe('best-practice');
      expect(namingIssue.severity).toBe('low');
    });
  });

  describe('Accessibility Checks', () => {
    it('should detect missing alt attributes', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: '<img src="image.jpg" />',
          config: { checkAccessibility: true }
        }
      };

      const result = await agent.execute(task);

      const altIssue = result.data.issues.find((issue: any) => issue.rule === 'img-alt');
      expect(altIssue).toBeDefined();
      expect(altIssue.type).toBe('accessibility');
      expect(altIssue.severity).toBe('medium');
    });

    it('should detect missing button labels', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: '<button></button>',
          config: { checkAccessibility: true }
        }
      };

      const result = await agent.execute(task);

      const buttonIssue = result.data.issues.find((issue: any) => issue.rule === 'button-label');
      expect(buttonIssue).toBeDefined();
      expect(buttonIssue.type).toBe('accessibility');
      expect(buttonIssue.severity).toBe('medium');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate complexity correctly', async () => {
      const complexCode = `
        function complexFunction(x) {
          if (x > 0) {
            for (let i = 0; i < x; i++) {
              if (i % 2 === 0) {
                console.log(i);
              } else {
                console.log("odd");
              }
            }
          } else {
            return null;
          }
        }
      `;

      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: complexCode,
          config: { checkBestPractices: true }
        }
      };

      const result = await agent.execute(task);

      expect(result.data.metrics.complexity).toBeGreaterThan(5);
      expect(result.data.metrics.maintainability).toBeLessThan(100);
    });

    it('should calculate maintainability score', async () => {
      const simpleCode = 'const hello = "world";';

      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: simpleCode,
          config: {}
        }
      };

      const result = await agent.execute(task);

      expect(result.data.metrics.maintainability).toBeGreaterThan(80);
    });
  });

  describe('Summary Calculation', () => {
    it('should calculate summary correctly', async () => {
      const problematicCode = `
        eval("dangerous");
        var oldStyle = "bad";
        console.log("debug");
        element.innerHTML = userInput;
      `;

      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: problematicCode,
          config: {
            checkSecurity: true,
            checkPerformance: true,
            checkBestPractices: true
          }
        }
      };

      const result = await agent.execute(task);

      expect(result.data.summary.totalIssues).toBeGreaterThan(0);
      expect(result.data.summary.criticalIssues).toBeGreaterThan(0);
      expect(result.data.summary.score).toBeLessThan(100);
    });

    it('should generate appropriate recommendations', async () => {
      const securityIssueCode = 'eval("test");';

      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: securityIssueCode,
          config: { checkSecurity: true }
        }
      };

      const result = await agent.execute(task);

      expect(result.data.recommendations).toContain('Review and fix security vulnerabilities immediately');
      expect(result.data.recommendations).toContain('Address critical issues before deploying to production');
    });
  });

  describe('Database Integration', () => {
    it('should store review results in database', async () => {
      const task = {
        id: 123,
        startTime: Date.now(),
        input: {
          code: 'console.log("test");',
          config: {}
        }
      };

      await agent.execute(task);

      expect(mockSupabase.from).toHaveBeenCalledWith('agent_task_results');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 123,
          result_type: 'code_review',
          result_data: expect.any(Object),
          created_at: expect.any(String)
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from().insert.mockRejectedValueOnce(new Error('Database error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'console.log("test");',
          config: {}
        }
      };

      const result = await agent.execute(task);

      // Should still succeed even if database storage fails
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store code review results:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Handling', () => {
    it('should use default configuration when none provided', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'eval("test"); var x = 1; console.log(x);'
        }
      };

      const result = await agent.execute(task);

      // Should detect issues from all default checks
      expect(result.data.issues.some((issue: any) => issue.type === 'security')).toBe(true);
      expect(result.data.issues.some((issue: any) => issue.type === 'performance')).toBe(true);
      expect(result.data.issues.some((issue: any) => issue.type === 'best-practice')).toBe(true);
    });

    it('should respect disabled check types', async () => {
      const task = {
        id: 1,
        startTime: Date.now(),
        input: {
          code: 'eval("test"); var x = 1; console.log(x);',
          config: {
            checkSecurity: false,
            checkPerformance: true,
            checkBestPractices: true
          }
        }
      };

      const result = await agent.execute(task);

      // Should not detect security issues when disabled
      expect(result.data.issues.some((issue: any) => issue.type === 'security')).toBe(false);
      expect(result.data.issues.some((issue: any) => issue.type === 'performance')).toBe(true);
      expect(result.data.issues.some((issue: any) => issue.type === 'best-practice')).toBe(true);
    });
  });
});