import { BaseAgent } from '../base/agent';
import { createClient } from '@supabase/supabase-js';

interface CodeReviewConfig {
  checkSecurity: boolean;
  checkPerformance: boolean;
  checkBestPractices: boolean;
  checkAccessibility: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frameworks: string[];
  languages: string[];
}

interface CodeIssue {
  type: 'security' | 'performance' | 'best-practice' | 'accessibility' | 'bug';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion: string;
  rule: string;
  evidence: string;
}

interface CodeReviewResult {
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    score: number; // 0-100
  };
  issues: CodeIssue[];
  recommendations: string[];
  metrics: {
    complexity: number;
    maintainability: number;
    testCoverage?: number;
    duplicateCode?: number;
  };
}

export class CodeReviewAgent extends BaseAgent {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  constructor(config?: any) {
    super({
      name: 'Code Review Agent',
      description: 'Analyzes code for security vulnerabilities, performance issues, and best practices',
      version: '1.0.0',
      capabilities: ['code-analysis', 'security-scan', 'performance-analysis', 'quality-assessment'],
      ...config
    });
  }

  async execute(task: any): Promise<any> {
    try {
      const { code, files, config } = task.input as {
        code?: string;
        files?: { path: string; content: string }[];
        config?: CodeReviewConfig;
      };

      if (!code && !files) {
        throw new Error('Either code string or files array is required');
      }

      const reviewConfig: CodeReviewConfig = {
        checkSecurity: true,
        checkPerformance: true,
        checkBestPractices: true,
        checkAccessibility: false,
        severity: 'medium',
        frameworks: ['react', 'next.js', 'express'],
        languages: ['typescript', 'javascript'],
        ...config
      };

      let reviewResult: CodeReviewResult;

      if (code) {
        reviewResult = await this.reviewCode(code, 'inline-code', reviewConfig);
      } else {
        reviewResult = await this.reviewFiles(files!, reviewConfig);
      }

      // Store results in database
      await this.storeReviewResults(task.id, reviewResult);

      return {
        success: true,
        data: reviewResult,
        message: `Code review completed. Found ${reviewResult.summary.totalIssues} issues with score ${reviewResult.summary.score}/100`,
        metadata: {
          executionTime: Date.now() - task.startTime!,
          issuesFound: reviewResult.summary.totalIssues,
          score: reviewResult.summary.score
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during code review',
        data: null
      };
    }
  }

  private async reviewCode(code: string, filename: string, config: CodeReviewConfig): Promise<CodeReviewResult> {
    const issues: CodeIssue[] = [];
    const recommendations: string[] = [];

    // Security checks
    if (config.checkSecurity) {
      issues.push(...await this.checkSecurity(code, filename));
    }

    // Performance checks
    if (config.checkPerformance) {
      issues.push(...await this.checkPerformance(code, filename));
    }

    // Best practices checks
    if (config.checkBestPractices) {
      issues.push(...await this.checkBestPractices(code, filename));
    }

    // Accessibility checks
    if (config.checkAccessibility) {
      issues.push(...await this.checkAccessibility(code, filename));
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(code);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(issues, metrics));

    // Calculate summary
    const summary = this.calculateSummary(issues);

    return {
      summary,
      issues,
      recommendations,
      metrics
    };
  }

  private async reviewFiles(files: { path: string; content: string }[], config: CodeReviewConfig): Promise<CodeReviewResult> {
    const allIssues: CodeIssue[] = [];
    const allRecommendations: string[] = [];
    let totalComplexity = 0;
    let totalMaintainability = 0;

    for (const file of files) {
      const fileResult = await this.reviewCode(file.content, file.path, config);
      allIssues.push(...fileResult.issues);
      allRecommendations.push(...fileResult.recommendations);
      totalComplexity += fileResult.metrics.complexity;
      totalMaintainability += fileResult.metrics.maintainability;
    }

    const avgComplexity = totalComplexity / files.length;
    const avgMaintainability = totalMaintainability / files.length;

    return {
      summary: this.calculateSummary(allIssues),
      issues: allIssues,
      recommendations: [...new Set(allRecommendations)], // Remove duplicates
      metrics: {
        complexity: avgComplexity,
        maintainability: avgMaintainability
      }
    };
  }

  private async checkSecurity(code: string, filename: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Check for common security vulnerabilities
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        rule: 'no-eval',
        message: 'Use of eval() is dangerous and should be avoided',
        suggestion: 'Use JSON.parse() or other safe alternatives',
        severity: 'critical' as const
      },
      {
        pattern: /innerHTML\s*=/g,
        rule: 'no-inner-html',
        message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
        suggestion: 'Use textContent or sanitize HTML content',
        severity: 'high' as const
      },
      {
        pattern: /document\.write\s*\(/g,
        rule: 'no-document-write',
        message: 'document.write() can be exploited for XSS attacks',
        suggestion: 'Use DOM manipulation methods instead',
        severity: 'high' as const
      },
      {
        pattern: /process\.env\.[A-Z_]+/g,
        rule: 'env-var-exposure',
        message: 'Environment variables may be exposed in client-side code',
        suggestion: 'Ensure sensitive env vars are only used server-side',
        severity: 'medium' as const
      }
    ];

    securityPatterns.forEach(({ pattern, rule, message, suggestion, severity }) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'security',
          severity,
          file: filename,
          line: lineNumber,
          message,
          suggestion,
          rule,
          evidence: match[0]
        });
      }
    });

    return issues;
  }

  private async checkPerformance(code: string, filename: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Check for performance anti-patterns
    const performancePatterns = [
      {
        pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[^}]*}\s*,\s*\[\s*\]\s*\)/g,
        rule: 'unnecessary-effect',
        message: 'Empty dependency array in useEffect may indicate unnecessary re-renders',
        suggestion: 'Consider if this effect is necessary or use useMemo/useCallback',
        severity: 'medium' as const
      },
      {
        pattern: /\.map\s*\([^)]*\)\.filter\s*\(/g,
        rule: 'inefficient-chaining',
        message: 'Chaining map and filter can be inefficient for large arrays',
        suggestion: 'Consider using reduce or a single iteration',
        severity: 'low' as const
      },
      {
        pattern: /console\.(log|warn|error|info)/g,
        rule: 'console-statements',
        message: 'Console statements should be removed in production',
        suggestion: 'Use a proper logging library or remove console statements',
        severity: 'low' as const
      }
    ];

    performancePatterns.forEach(({ pattern, rule, message, suggestion, severity }) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'performance',
          severity,
          file: filename,
          line: lineNumber,
          message,
          suggestion,
          rule,
          evidence: match[0]
        });
      }
    });

    return issues;
  }

  private async checkBestPractices(code: string, filename: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Check for best practice violations
    const bestPracticePatterns = [
      {
        pattern: /var\s+/g,
        rule: 'no-var',
        message: 'Use let or const instead of var',
        suggestion: 'Replace var with let or const for better scoping',
        severity: 'medium' as const
      },
      {
        pattern: /==\s*[^=]/g,
        rule: 'strict-equality',
        message: 'Use strict equality (===) instead of loose equality (==)',
        suggestion: 'Replace == with === for type-safe comparisons',
        severity: 'medium' as const
      },
      {
        pattern: /function\s+[A-Z]/g,
        rule: 'component-naming',
        message: 'React components should be arrow functions or use PascalCase',
        suggestion: 'Use arrow functions for components or ensure PascalCase naming',
        severity: 'low' as const
      }
    ];

    bestPracticePatterns.forEach(({ pattern, rule, message, suggestion, severity }) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'best-practice',
          severity,
          file: filename,
          line: lineNumber,
          message,
          suggestion,
          rule,
          evidence: match[0]
        });
      }
    });

    return issues;
  }

  private async checkAccessibility(code: string, filename: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Check for accessibility issues
    const a11yPatterns = [
      {
        pattern: /<img(?![^>]*alt=)/g,
        rule: 'img-alt',
        message: 'Images should have alt attributes for accessibility',
        suggestion: 'Add alt attribute to describe the image content',
        severity: 'medium' as const
      },
      {
        pattern: /<button(?![^>]*aria-label)(?![^>]*>\s*\w)/g,
        rule: 'button-label',
        message: 'Buttons should have accessible labels',
        suggestion: 'Add aria-label or ensure button has text content',
        severity: 'medium' as const
      }
    ];

    a11yPatterns.forEach(({ pattern, rule, message, suggestion, severity }) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        issues.push({
          type: 'accessibility',
          severity,
          file: filename,
          line: lineNumber,
          message,
          suggestion,
          rule,
          evidence: match[0]
        });
      }
    });

    return issues;
  }

  private async calculateMetrics(code: string) {
    // Simple complexity calculation based on cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
    let complexity = 1; // Base complexity

    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    // Simple maintainability calculation
    const lines = code.split('\n').length;
    const functions = (code.match(/function|=>/g) || []).length;
    const maintainability = Math.max(0, 100 - (complexity * 2) - (lines / 10) + (functions * 5));

    return {
      complexity,
      maintainability: Math.round(maintainability)
    };
  }

  private generateRecommendations(issues: CodeIssue[], metrics: any): string[] {
    const recommendations: string[] = [];

    if (issues.filter(i => i.type === 'security').length > 0) {
      recommendations.push('Review and fix security vulnerabilities immediately');
    }

    if (metrics.complexity > 10) {
      recommendations.push('Consider breaking down complex functions into smaller, more manageable pieces');
    }

    if (metrics.maintainability < 50) {
      recommendations.push('Improve code maintainability by reducing complexity and adding documentation');
    }

    if (issues.filter(i => i.severity === 'critical').length > 0) {
      recommendations.push('Address critical issues before deploying to production');
    }

    return recommendations;
  }

  private calculateSummary(issues: CodeIssue[]) {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;
    const lowIssues = issues.filter(i => i.severity === 'low').length;
    const totalIssues = issues.length;

    // Calculate score (0-100, lower is better for issues)
    const score = Math.max(0, 100 - (criticalIssues * 25) - (highIssues * 10) - (mediumIssues * 5) - (lowIssues * 1));

    return {
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      score
    };
  }

  private async storeReviewResults(taskId: number, result: CodeReviewResult) {
    try {
      await this.supabase
        .from('agent_task_results')
        .insert({
          task_id: taskId,
          result_type: 'code_review',
          result_data: result,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store code review results:', error);
    }
  }
}