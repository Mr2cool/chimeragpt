import { supabase } from '@/lib/supabase';
import { agentOrchestrator } from '@/services/agent-orchestrator';

// Base Agent Interface
export interface BaseAgent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped';
  capabilities: string[];
  configuration: Record<string, any>;
  memory: Record<string, any>;
}

// Code Review Agent
export class CodeReviewAgent implements BaseAgent {
  id: string;
  name: string;
  type = 'code_review';
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped' = 'idle';
  capabilities = [
    'security_analysis',
    'performance_analysis',
    'best_practices_check',
    'code_quality_assessment',
    'vulnerability_scanning',
    'dependency_analysis'
  ];
  configuration: Record<string, any>;
  memory: Record<string, any> = {};

  constructor(id: string, name: string, config: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.configuration = {
      rules: {
        security: ['no-eval', 'no-dangerous-html', 'secure-random'],
        performance: ['no-inefficient-loops', 'optimize-queries', 'cache-usage'],
        style: ['consistent-naming', 'proper-indentation', 'comment-coverage'],
        complexity: ['max-cyclomatic-complexity', 'max-function-length']
      },
      severity_levels: ['error', 'warning', 'info'],
      auto_fix: false,
      ...config
    };
  }

  async reviewCode(codeContent: string, filePath: string): Promise<{
    issues: Array<{
      type: 'security' | 'performance' | 'style' | 'complexity';
      severity: 'error' | 'warning' | 'info';
      message: string;
      line?: number;
      column?: number;
      suggestion?: string;
    }>;
    score: number;
    summary: string;
  }> {
    this.status = 'running';
    
    try {
      const issues = [];
      let score = 100;

      // Security Analysis
      const securityIssues = await this.analyzeSecurityIssues(codeContent);
      issues.push(...securityIssues);
      score -= securityIssues.filter(i => i.severity === 'error').length * 10;
      score -= securityIssues.filter(i => i.severity === 'warning').length * 5;

      // Performance Analysis
      const performanceIssues = await this.analyzePerformance(codeContent);
      issues.push(...performanceIssues);
      score -= performanceIssues.filter(i => i.severity === 'error').length * 8;
      score -= performanceIssues.filter(i => i.severity === 'warning').length * 4;

      // Best Practices Check
      const styleIssues = await this.checkBestPractices(codeContent);
      issues.push(...styleIssues);
      score -= styleIssues.filter(i => i.severity === 'error').length * 5;
      score -= styleIssues.filter(i => i.severity === 'warning').length * 2;

      // Complexity Analysis
      const complexityIssues = await this.analyzeComplexity(codeContent);
      issues.push(...complexityIssues);
      score -= complexityIssues.filter(i => i.severity === 'error').length * 7;
      score -= complexityIssues.filter(i => i.severity === 'warning').length * 3;

      const summary = this.generateSummary(issues, score);
      
      this.status = 'idle';
      return { issues, score: Math.max(0, score), summary };
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  private async analyzeSecurityIssues(code: string) {
    const issues = [];
    
    // Check for eval usage
    if (code.includes('eval(')) {
      issues.push({
        type: 'security' as const,
        severity: 'error' as const,
        message: 'Use of eval() is dangerous and should be avoided',
        suggestion: 'Use JSON.parse() or other safe alternatives'
      });
    }

    // Check for innerHTML usage
    if (code.includes('.innerHTML')) {
      issues.push({
        type: 'security' as const,
        severity: 'warning' as const,
        message: 'Direct innerHTML usage can lead to XSS vulnerabilities',
        suggestion: 'Use textContent or sanitize HTML content'
      });
    }

    // Check for hardcoded secrets
    const secretPatterns = [
      /api[_-]?key[\s]*[:=][\s]*['"][^'"]+['"]/i,
      /password[\s]*[:=][\s]*['"][^'"]+['"]/i,
      /secret[\s]*[:=][\s]*['"][^'"]+['"]/i
    ];

    secretPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        issues.push({
          type: 'security' as const,
          severity: 'error' as const,
          message: 'Hardcoded secrets detected',
          suggestion: 'Use environment variables or secure configuration'
        });
      }
    });

    return issues;
  }

  private async analyzePerformance(code: string) {
    const issues = [];

    // Check for inefficient loops
    if (code.includes('for') && code.includes('.length')) {
      const forLoopPattern = /for\s*\([^)]*\.length[^)]*\)/g;
      if (forLoopPattern.test(code)) {
        issues.push({
          type: 'performance' as const,
          severity: 'warning' as const,
          message: 'Consider caching array length in loops',
          suggestion: 'Store array.length in a variable before the loop'
        });
      }
    }

    // Check for synchronous operations that could be async
    if (code.includes('fs.readFileSync') || code.includes('fs.writeFileSync')) {
      issues.push({
        type: 'performance' as const,
        severity: 'warning' as const,
        message: 'Synchronous file operations can block the event loop',
        suggestion: 'Use async file operations (fs.readFile, fs.writeFile)'
      });
    }

    return issues;
  }

  private async checkBestPractices(code: string) {
    const issues = [];

    // Check for console.log in production code
    if (code.includes('console.log')) {
      issues.push({
        type: 'style' as const,
        severity: 'info' as const,
        message: 'Console.log statements should be removed from production code',
        suggestion: 'Use a proper logging library or remove debug statements'
      });
    }

    // Check for var usage
    if (code.includes('var ')) {
      issues.push({
        type: 'style' as const,
        severity: 'warning' as const,
        message: 'Use let or const instead of var',
        suggestion: 'Replace var with let for mutable variables or const for constants'
      });
    }

    return issues;
  }

  private async analyzeComplexity(code: string) {
    const issues = [];

    // Simple complexity check based on nested structures
    const nestingLevel = this.calculateNestingLevel(code);
    if (nestingLevel > 4) {
      issues.push({
        type: 'complexity' as const,
        severity: 'warning' as const,
        message: `High nesting level detected (${nestingLevel})`,
        suggestion: 'Consider breaking down into smaller functions'
      });
    }

    // Check function length
    const functionLengths = this.calculateFunctionLengths(code);
    functionLengths.forEach(({ name, length }) => {
      if (length > 50) {
        issues.push({
          type: 'complexity' as const,
          severity: 'warning' as const,
          message: `Function '${name}' is too long (${length} lines)`,
          suggestion: 'Consider breaking down into smaller functions'
        });
      }
    });

    return issues;
  }

  private calculateNestingLevel(code: string): number {
    let maxLevel = 0;
    let currentLevel = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentLevel++;
        maxLevel = Math.max(maxLevel, currentLevel);
      } else if (char === '}') {
        currentLevel--;
      }
    }
    
    return maxLevel;
  }

  private calculateFunctionLengths(code: string): Array<{ name: string; length: number }> {
    const functionPattern = /function\s+(\w+)\s*\([^)]*\)\s*\{([^}]*)\}/g;
    const results = [];
    let match;

    while ((match = functionPattern.exec(code)) !== null) {
      const functionName = match[1];
      const functionBody = match[2];
      const lineCount = functionBody.split('\n').length;
      results.push({ name: functionName, length: lineCount });
    }

    return results;
  }

  private generateSummary(issues: any[], score: number): string {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    let summary = `Code review completed with a score of ${score}/100. `;
    
    if (errorCount > 0) {
      summary += `Found ${errorCount} critical issues that need immediate attention. `;
    }
    
    if (warningCount > 0) {
      summary += `Found ${warningCount} warnings that should be addressed. `;
    }
    
    if (infoCount > 0) {
      summary += `Found ${infoCount} suggestions for improvement. `;
    }
    
    if (issues.length === 0) {
      summary += 'No issues found - excellent code quality!';
    }

    return summary;
  }
}

// Documentation Agent
export class DocumentationAgent implements BaseAgent {
  id: string;
  name: string;
  type = 'documentation';
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped' = 'idle';
  capabilities = [
    'readme_generation',
    'api_documentation',
    'code_comments',
    'changelog_generation',
    'user_guides',
    'technical_specs'
  ];
  configuration: Record<string, any>;
  memory: Record<string, any> = {};

  constructor(id: string, name: string, config: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.configuration = {
      output_format: 'markdown',
      include_examples: true,
      include_installation: true,
      include_usage: true,
      include_api_reference: true,
      ...config
    };
  }

  async generateReadme(projectInfo: {
    name: string;
    description: string;
    features: string[];
    installation: string[];
    usage: string;
    api?: any[];
    contributing?: string;
    license?: string;
  }): Promise<string> {
    this.status = 'running';
    
    try {
      let readme = `# ${projectInfo.name}\n\n`;
      readme += `${projectInfo.description}\n\n`;
      
      if (projectInfo.features.length > 0) {
        readme += '## Features\n\n';
        projectInfo.features.forEach(feature => {
          readme += `- ${feature}\n`;
        });
        readme += '\n';
      }
      
      if (projectInfo.installation.length > 0) {
        readme += '## Installation\n\n';
        readme += '```bash\n';
        projectInfo.installation.forEach(step => {
          readme += `${step}\n`;
        });
        readme += '```\n\n';
      }
      
      if (projectInfo.usage) {
        readme += '## Usage\n\n';
        readme += projectInfo.usage + '\n\n';
      }
      
      if (projectInfo.api && projectInfo.api.length > 0) {
        readme += '## API Reference\n\n';
        projectInfo.api.forEach(endpoint => {
          readme += `### ${endpoint.method} ${endpoint.path}\n\n`;
          readme += `${endpoint.description}\n\n`;
          if (endpoint.parameters) {
            readme += '**Parameters:**\n\n';
            endpoint.parameters.forEach((param: any) => {
              readme += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
            });
            readme += '\n';
          }
        });
      }
      
      if (projectInfo.contributing) {
        readme += '## Contributing\n\n';
        readme += projectInfo.contributing + '\n\n';
      }
      
      if (projectInfo.license) {
        readme += '## License\n\n';
        readme += `This project is licensed under the ${projectInfo.license} License.\n`;
      }
      
      this.status = 'idle';
      return readme;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async generateApiDocs(apiEndpoints: any[]): Promise<string> {
    this.status = 'running';
    
    try {
      let docs = '# API Documentation\n\n';
      
      apiEndpoints.forEach(endpoint => {
        docs += `## ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        docs += `${endpoint.description}\n\n`;
        
        if (endpoint.parameters) {
          docs += '### Parameters\n\n';
          docs += '| Name | Type | Required | Description |\n';
          docs += '|------|------|----------|-------------|\n';
          endpoint.parameters.forEach((param: any) => {
            docs += `| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description} |\n`;
          });
          docs += '\n';
        }
        
        if (endpoint.responses) {
          docs += '### Responses\n\n';
          Object.entries(endpoint.responses).forEach(([code, response]: [string, any]) => {
            docs += `**${code}**: ${response.description}\n\n`;
            if (response.example) {
              docs += '```json\n';
              docs += JSON.stringify(response.example, null, 2);
              docs += '\n```\n\n';
            }
          });
        }
        
        docs += '---\n\n';
      });
      
      this.status = 'idle';
      return docs;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
}

// Testing Agent
export class TestingAgent implements BaseAgent {
  id: string;
  name: string;
  type = 'testing';
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped' = 'idle';
  capabilities = [
    'unit_test_generation',
    'integration_test_generation',
    'test_coverage_analysis',
    'test_execution',
    'mock_generation',
    'e2e_test_generation'
  ];
  configuration: Record<string, any>;
  memory: Record<string, any> = {};

  constructor(id: string, name: string, config: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.configuration = {
      test_framework: 'jest',
      coverage_threshold: 80,
      generate_mocks: true,
      test_types: ['unit', 'integration'],
      ...config
    };
  }

  async generateUnitTests(functionCode: string, functionName: string): Promise<string> {
    this.status = 'running';
    
    try {
      const testCases = this.analyzeFunction(functionCode, functionName);
      let testCode = `import { ${functionName} } from './path-to-module';\n\n`;
      testCode += `describe('${functionName}', () => {\n`;
      
      testCases.forEach(testCase => {
        testCode += `  test('${testCase.description}', () => {\n`;
        testCode += `    ${testCase.setup || ''}\n`;
        testCode += `    const result = ${functionName}(${testCase.input});\n`;
        testCode += `    expect(result).${testCase.assertion};\n`;
        testCode += `  });\n\n`;
      });
      
      testCode += '});\n';
      
      this.status = 'idle';
      return testCode;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  private analyzeFunction(code: string, functionName: string): Array<{
    description: string;
    input: string;
    assertion: string;
    setup?: string;
  }> {
    // Simple analysis - in a real implementation, this would be more sophisticated
    return [
      {
        description: `should return expected result for valid input`,
        input: `'test'`,
        assertion: `toBeDefined()`
      },
      {
        description: `should handle null input`,
        input: `null`,
        assertion: `toBeNull()`
      },
      {
        description: `should handle undefined input`,
        input: `undefined`,
        assertion: `toBeUndefined()`
      }
    ];
  }
}

// Deployment Agent
export class DeploymentAgent implements BaseAgent {
  id: string;
  name: string;
  type = 'deployment';
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped' = 'idle';
  capabilities = [
    'ci_cd_setup',
    'containerization',
    'cloud_deployment',
    'environment_management',
    'rollback_management',
    'monitoring_setup'
  ];
  configuration: Record<string, any>;
  memory: Record<string, any> = {};

  constructor(id: string, name: string, config: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.configuration = {
      platform: 'vercel',
      environment: 'production',
      auto_deploy: false,
      rollback_enabled: true,
      ...config
    };
  }

  async generateDockerfile(projectType: string): Promise<string> {
    this.status = 'running';
    
    try {
      let dockerfile = '';
      
      switch (projectType) {
        case 'node':
          dockerfile = `FROM node:18-alpine\n\n`;
          dockerfile += `WORKDIR /app\n\n`;
          dockerfile += `COPY package*.json ./\n`;
          dockerfile += `RUN npm ci --only=production\n\n`;
          dockerfile += `COPY . .\n\n`;
          dockerfile += `EXPOSE 3000\n\n`;
          dockerfile += `CMD ["npm", "start"]\n`;
          break;
        
        case 'python':
          dockerfile = `FROM python:3.9-slim\n\n`;
          dockerfile += `WORKDIR /app\n\n`;
          dockerfile += `COPY requirements.txt .\n`;
          dockerfile += `RUN pip install --no-cache-dir -r requirements.txt\n\n`;
          dockerfile += `COPY . .\n\n`;
          dockerfile += `EXPOSE 8000\n\n`;
          dockerfile += `CMD ["python", "app.py"]\n`;
          break;
        
        default:
          throw new Error(`Unsupported project type: ${projectType}`);
      }
      
      this.status = 'idle';
      return dockerfile;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async generateCIConfig(platform: string): Promise<string> {
    this.status = 'running';
    
    try {
      let config = '';
      
      switch (platform) {
        case 'github':
          config = `name: CI/CD Pipeline\n\n`;
          config += `on:\n`;
          config += `  push:\n`;
          config += `    branches: [ main ]\n`;
          config += `  pull_request:\n`;
          config += `    branches: [ main ]\n\n`;
          config += `jobs:\n`;
          config += `  test:\n`;
          config += `    runs-on: ubuntu-latest\n`;
          config += `    steps:\n`;
          config += `    - uses: actions/checkout@v3\n`;
          config += `    - name: Setup Node.js\n`;
          config += `      uses: actions/setup-node@v3\n`;
          config += `      with:\n`;
          config += `        node-version: '18'\n`;
          config += `    - run: npm ci\n`;
          config += `    - run: npm test\n`;
          config += `    - run: npm run build\n`;
          break;
        
        default:
          throw new Error(`Unsupported CI platform: ${platform}`);
      }
      
      this.status = 'idle';
      return config;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
}

// Performance Agent
export class PerformanceAgent implements BaseAgent {
  id: string;
  name: string;
  type = 'performance';
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped' = 'idle';
  capabilities = [
    'performance_analysis',
    'optimization_suggestions',
    'monitoring_setup',
    'profiling',
    'load_testing',
    'resource_optimization'
  ];
  configuration: Record<string, any>;
  memory: Record<string, any> = {};

  constructor(id: string, name: string, config: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.configuration = {
      metrics: ['response_time', 'memory_usage', 'cpu_usage', 'throughput'],
      thresholds: {
        response_time: 200, // ms
        memory_usage: 512, // MB
        cpu_usage: 80 // %
      },
      ...config
    };
  }

  async analyzePerformance(codeContent: string): Promise<{
    issues: Array<{
      type: 'memory' | 'cpu' | 'network' | 'database';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      suggestion: string;
      line?: number;
    }>;
    score: number;
    recommendations: string[];
  }> {
    this.status = 'running';
    
    try {
      const issues = [];
      const recommendations = [];
      let score = 100;

      // Memory analysis
      if (codeContent.includes('new Array(') || codeContent.includes('Array.from(')) {
        issues.push({
          type: 'memory' as const,
          severity: 'medium' as const,
          message: 'Large array allocation detected',
          suggestion: 'Consider using streaming or pagination for large datasets'
        });
        score -= 10;
      }

      // CPU analysis
      if (codeContent.includes('while(true)') || codeContent.includes('for(;;)')) {
        issues.push({
          type: 'cpu' as const,
          severity: 'high' as const,
          message: 'Infinite loop detected',
          suggestion: 'Add proper exit conditions to prevent infinite loops'
        });
        score -= 20;
      }

      // Network analysis
      if (codeContent.includes('fetch(') && !codeContent.includes('await')) {
        issues.push({
          type: 'network' as const,
          severity: 'medium' as const,
          message: 'Synchronous network calls detected',
          suggestion: 'Use async/await for network operations'
        });
        score -= 15;
      }

      // Generate recommendations
      if (issues.length === 0) {
        recommendations.push('Code appears to be well-optimized');
      } else {
        recommendations.push('Consider implementing caching mechanisms');
        recommendations.push('Use performance monitoring tools');
        recommendations.push('Implement lazy loading where appropriate');
      }

      this.status = 'idle';
      return { issues, score: Math.max(0, score), recommendations };
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
}

// Security Agent
export class SecurityAgent implements BaseAgent {
  id: string;
  name: string;
  type = 'security';
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped' = 'idle';
  capabilities = [
    'vulnerability_scanning',
    'dependency_audit',
    'compliance_checking',
    'security_policy_enforcement',
    'threat_detection',
    'security_reporting'
  ];
  configuration: Record<string, any>;
  memory: Record<string, any> = {};

  constructor(id: string, name: string, config: Record<string, any> = {}) {
    this.id = id;
    this.name = name;
    this.configuration = {
      compliance_standards: ['OWASP', 'SOC2', 'GDPR'],
      scan_dependencies: true,
      check_secrets: true,
      validate_inputs: true,
      ...config
    };
  }

  async scanVulnerabilities(codeContent: string): Promise<{
    vulnerabilities: Array<{
      id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      recommendation: string;
      cwe_id?: string;
      line?: number;
    }>;
    riskScore: number;
    complianceStatus: Record<string, boolean>;
  }> {
    this.status = 'running';
    
    try {
      const vulnerabilities = [];
      let riskScore = 0;

      // Check for SQL injection vulnerabilities
      if (codeContent.includes('SELECT') && codeContent.includes('+')) {
        vulnerabilities.push({
          id: 'sql-injection-001',
          severity: 'high' as const,
          type: 'SQL Injection',
          description: 'Potential SQL injection vulnerability detected',
          recommendation: 'Use parameterized queries or prepared statements',
          cwe_id: 'CWE-89'
        });
        riskScore += 30;
      }

      // Check for XSS vulnerabilities
      if (codeContent.includes('.innerHTML') && !codeContent.includes('sanitize')) {
        vulnerabilities.push({
          id: 'xss-001',
          severity: 'medium' as const,
          type: 'Cross-Site Scripting (XSS)',
          description: 'Potential XSS vulnerability in DOM manipulation',
          recommendation: 'Sanitize user input before inserting into DOM',
          cwe_id: 'CWE-79'
        });
        riskScore += 20;
      }

      // Check for insecure random number generation
      if (codeContent.includes('Math.random()')) {
        vulnerabilities.push({
          id: 'weak-random-001',
          severity: 'low' as const,
          type: 'Weak Random Number Generation',
          description: 'Math.random() is not cryptographically secure',
          recommendation: 'Use crypto.randomBytes() for security-sensitive operations',
          cwe_id: 'CWE-338'
        });
        riskScore += 10;
      }

      // Compliance checking
      const complianceStatus = {
        OWASP: vulnerabilities.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
        SOC2: vulnerabilities.length < 5,
        GDPR: !codeContent.includes('personal_data') || codeContent.includes('encrypt')
      };

      this.status = 'idle';
      return { vulnerabilities, riskScore, complianceStatus };
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
}

// Agent Factory
export class AgentFactory {
  static createAgent(type: string, id: string, name: string, config: Record<string, any> = {}): BaseAgent {
    switch (type) {
      case 'code_review':
        return new CodeReviewAgent(id, name, config);
      case 'documentation':
        return new DocumentationAgent(id, name, config);
      case 'testing':
        return new TestingAgent(id, name, config);
      case 'deployment':
        return new DeploymentAgent(id, name, config);
      case 'performance':
        return new PerformanceAgent(id, name, config);
      case 'security':
        return new SecurityAgent(id, name, config);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  static getAvailableAgentTypes(): string[] {
    return [
      'code_review',
      'documentation',
      'testing',
      'deployment',
      'performance',
      'security'
    ];
  }

  static getAgentCapabilities(type: string): string[] {
    const agent = this.createAgent(type, 'temp', 'temp');
    return agent.capabilities;
  }
}

// Agents are already exported as classes above