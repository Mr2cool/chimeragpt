import { BaseAgent } from '../base/agent';
import { AgentCapability, AgentTask, AgentResult } from '@/types/agents';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

interface DocumentationConfig {
  type: 'readme' | 'api' | 'code-comments' | 'user-guide' | 'technical-spec';
  format: 'markdown' | 'html' | 'json' | 'yaml';
  includeExamples: boolean;
  includeInstallation: boolean;
  includeUsage: boolean;
  includeAPI: boolean;
  includeTesting: boolean;
  includeContributing: boolean;
  style: 'minimal' | 'detailed' | 'comprehensive';
  audience: 'developer' | 'user' | 'technical' | 'business';
}

interface CodeAnalysis {
  functions: {
    name: string;
    parameters: { name: string; type: string; description?: string }[];
    returnType: string;
    description: string;
    examples: string[];
  }[];
  classes: {
    name: string;
    methods: { name: string; description: string }[];
    properties: { name: string; type: string; description: string }[];
    description: string;
  }[];
  interfaces: {
    name: string;
    properties: { name: string; type: string; description: string }[];
    description: string;
  }[];
  exports: string[];
  imports: string[];
  dependencies: string[];
}

interface DocumentationResult {
  content: string;
  format: string;
  sections: {
    title: string;
    content: string;
    order: number;
  }[];
  metadata: {
    generatedAt: string;
    version: string;
    wordCount: number;
    estimatedReadTime: number;
  };
  suggestions: string[];
}

export class DocumentationAgent extends BaseAgent {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor() {
    super({
      id: 'documentation-agent',
      name: 'Documentation Agent',
      type: 'specialized',
      description: 'Generates comprehensive documentation including README files, API docs, and code comments',
      capabilities: [
        AgentCapability.DOCUMENTATION,
        AgentCapability.CODE_ANALYSIS,
        AgentCapability.CONTENT_GENERATION,
        AgentCapability.FILE_OPERATIONS
      ],
      version: '1.0.0'
    });
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    try {
      const { files, projectInfo, config } = task.input as {
        files?: { path: string; content: string }[];
        projectInfo?: {
          name: string;
          description: string;
          version: string;
          author: string;
          license: string;
          repository?: string;
        };
        config?: DocumentationConfig;
      };

      if (!files && !projectInfo) {
        throw new Error('Either files or project info is required');
      }

      const docConfig: DocumentationConfig = {
        type: 'readme',
        format: 'markdown',
        includeExamples: true,
        includeInstallation: true,
        includeUsage: true,
        includeAPI: true,
        includeTesting: true,
        includeContributing: true,
        style: 'detailed',
        audience: 'developer',
        ...config
      };

      let documentationResult: DocumentationResult;

      switch (docConfig.type) {
        case 'readme':
          documentationResult = await this.generateReadme(files, projectInfo, docConfig);
          break;
        case 'api':
          documentationResult = await this.generateAPIDocumentation(files!, docConfig);
          break;
        case 'code-comments':
          documentationResult = await this.generateCodeComments(files!, docConfig);
          break;
        case 'user-guide':
          documentationResult = await this.generateUserGuide(projectInfo!, docConfig);
          break;
        case 'technical-spec':
          documentationResult = await this.generateTechnicalSpec(files, projectInfo, docConfig);
          break;
        default:
          throw new Error(`Unsupported documentation type: ${docConfig.type}`);
      }

      // Store results in database
      await this.storeDocumentationResults(task.id, documentationResult);

      return {
        success: true,
        data: documentationResult,
        message: `${docConfig.type} documentation generated successfully (${documentationResult.metadata.wordCount} words)`,
        metadata: {
          executionTime: Date.now() - task.startTime!,
          wordCount: documentationResult.metadata.wordCount,
          sections: documentationResult.sections.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during documentation generation',
        data: null
      };
    }
  }

  private async generateReadme(
    files?: { path: string; content: string }[],
    projectInfo?: any,
    config: DocumentationConfig
  ): Promise<DocumentationResult> {
    const sections: { title: string; content: string; order: number }[] = [];
    let order = 1;

    // Project title and description
    const title = projectInfo?.name || 'Project';
    const description = projectInfo?.description || 'A modern web application';
    
    sections.push({
      title: 'Header',
      content: `# ${title}\n\n${description}`,
      order: order++
    });

    // Badges (if repository info available)
    if (projectInfo?.repository) {
      const badges = this.generateBadges(projectInfo);
      sections.push({
        title: 'Badges',
        content: badges,
        order: order++
      });
    }

    // Table of Contents
    const toc = this.generateTableOfContents(config);
    sections.push({
      title: 'Table of Contents',
      content: toc,
      order: order++
    });

    // Installation
    if (config.includeInstallation) {
      const installation = await this.generateInstallationSection(files);
      sections.push({
        title: 'Installation',
        content: installation,
        order: order++
      });
    }

    // Usage
    if (config.includeUsage) {
      const usage = await this.generateUsageSection(files);
      sections.push({
        title: 'Usage',
        content: usage,
        order: order++
      });
    }

    // API Documentation
    if (config.includeAPI && files) {
      const api = await this.generateAPISection(files);
      sections.push({
        title: 'API Reference',
        content: api,
        order: order++
      });
    }

    // Examples
    if (config.includeExamples) {
      const examples = await this.generateExamplesSection(files);
      sections.push({
        title: 'Examples',
        content: examples,
        order: order++
      });
    }

    // Testing
    if (config.includeTesting) {
      const testing = this.generateTestingSection();
      sections.push({
        title: 'Testing',
        content: testing,
        order: order++
      });
    }

    // Contributing
    if (config.includeContributing) {
      const contributing = this.generateContributingSection();
      sections.push({
        title: 'Contributing',
        content: contributing,
        order: order++
      });
    }

    // License
    const license = this.generateLicenseSection(projectInfo?.license || 'MIT');
    sections.push({
      title: 'License',
      content: license,
      order: order++
    });

    const content = sections
      .sort((a, b) => a.order - b.order)
      .map(section => section.content)
      .join('\n\n');

    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // Average reading speed

    return {
      content,
      format: config.format,
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: projectInfo?.version || '1.0.0',
        wordCount,
        estimatedReadTime
      },
      suggestions: this.generateSuggestions(sections, config)
    };
  }

  private async generateAPIDocumentation(
    files: { path: string; content: string }[],
    config: DocumentationConfig
  ): Promise<DocumentationResult> {
    const sections: { title: string; content: string; order: number }[] = [];
    let order = 1;

    // Analyze code to extract API information
    const analysis = await this.analyzeCode(files);

    // API Overview
    sections.push({
      title: 'API Overview',
      content: '# API Documentation\n\nThis document describes the available API endpoints and functions.',
      order: order++
    });

    // Functions
    if (analysis.functions.length > 0) {
      const functionsDoc = this.generateFunctionsDocumentation(analysis.functions);
      sections.push({
        title: 'Functions',
        content: functionsDoc,
        order: order++
      });
    }

    // Classes
    if (analysis.classes.length > 0) {
      const classesDoc = this.generateClassesDocumentation(analysis.classes);
      sections.push({
        title: 'Classes',
        content: classesDoc,
        order: order++
      });
    }

    // Interfaces
    if (analysis.interfaces.length > 0) {
      const interfacesDoc = this.generateInterfacesDocumentation(analysis.interfaces);
      sections.push({
        title: 'Interfaces',
        content: interfacesDoc,
        order: order++
      });
    }

    const content = sections
      .sort((a, b) => a.order - b.order)
      .map(section => section.content)
      .join('\n\n');

    const wordCount = content.split(/\s+/).length;

    return {
      content,
      format: config.format,
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        wordCount,
        estimatedReadTime: Math.ceil(wordCount / 200)
      },
      suggestions: ['Consider adding more detailed examples', 'Add error handling documentation']
    };
  }

  private async generateCodeComments(
    files: { path: string; content: string }[],
    config: DocumentationConfig
  ): Promise<DocumentationResult> {
    const sections: { title: string; content: string; order: number }[] = [];
    let totalComments = 0;

    for (const file of files) {
      const commentedCode = await this.addCodeComments(file.content, file.path);
      const commentsAdded = (commentedCode.match(/\/\*\*|\*\/|\/\//g) || []).length;
      totalComments += commentsAdded;

      sections.push({
        title: `Comments for ${file.path}`,
        content: `## ${file.path}\n\n\`\`\`typescript\n${commentedCode}\n\`\`\``,
        order: sections.length + 1
      });
    }

    const content = sections.map(section => section.content).join('\n\n');
    const wordCount = content.split(/\s+/).length;

    return {
      content,
      format: config.format,
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        wordCount,
        estimatedReadTime: Math.ceil(wordCount / 200)
      },
      suggestions: [`Added ${totalComments} comments to improve code readability`]
    };
  }

  private async generateUserGuide(
    projectInfo: any,
    config: DocumentationConfig
  ): Promise<DocumentationResult> {
    const sections: { title: string; content: string; order: number }[] = [];
    let order = 1;

    // Introduction
    sections.push({
      title: 'Introduction',
      content: `# ${projectInfo.name} User Guide\n\nWelcome to ${projectInfo.name}! This guide will help you get started and make the most of the application.`,
      order: order++
    });

    // Getting Started
    sections.push({
      title: 'Getting Started',
      content: this.generateGettingStartedSection(),
      order: order++
    });

    // Features
    sections.push({
      title: 'Features',
      content: this.generateFeaturesSection(),
      order: order++
    });

    // Troubleshooting
    sections.push({
      title: 'Troubleshooting',
      content: this.generateTroubleshootingSection(),
      order: order++
    });

    const content = sections
      .sort((a, b) => a.order - b.order)
      .map(section => section.content)
      .join('\n\n');

    const wordCount = content.split(/\s+/).length;

    return {
      content,
      format: config.format,
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: projectInfo.version || '1.0.0',
        wordCount,
        estimatedReadTime: Math.ceil(wordCount / 200)
      },
      suggestions: ['Consider adding screenshots', 'Add video tutorials']
    };
  }

  private async generateTechnicalSpec(
    files?: { path: string; content: string }[],
    projectInfo?: any,
    config: DocumentationConfig
  ): Promise<DocumentationResult> {
    const sections: { title: string; content: string; order: number }[] = [];
    let order = 1;

    // Architecture Overview
    sections.push({
      title: 'Architecture',
      content: '# Technical Specification\n\n## Architecture Overview\n\nThis document outlines the technical architecture and implementation details.',
      order: order++
    });

    // Technology Stack
    if (files) {
      const techStack = await this.analyzeTechnologyStack(files);
      sections.push({
        title: 'Technology Stack',
        content: techStack,
        order: order++
      });
    }

    // Database Schema
    sections.push({
      title: 'Database Schema',
      content: this.generateDatabaseSchemaSection(),
      order: order++
    });

    // API Endpoints
    sections.push({
      title: 'API Endpoints',
      content: this.generateAPIEndpointsSection(),
      order: order++
    });

    const content = sections
      .sort((a, b) => a.order - b.order)
      .map(section => section.content)
      .join('\n\n');

    const wordCount = content.split(/\s+/).length;

    return {
      content,
      format: config.format,
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: projectInfo?.version || '1.0.0',
        wordCount,
        estimatedReadTime: Math.ceil(wordCount / 200)
      },
      suggestions: ['Add deployment diagrams', 'Include performance benchmarks']
    };
  }

  private async analyzeCode(files: { path: string; content: string }[]): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      functions: [],
      classes: [],
      interfaces: [],
      exports: [],
      imports: [],
      dependencies: []
    };

    for (const file of files) {
      // Extract functions
      const functionMatches = file.content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g);
      if (functionMatches) {
        functionMatches.forEach(match => {
          const name = match.match(/function\s+(\w+)/)?.[1] || 'unknown';
          analysis.functions.push({
            name,
            parameters: [],
            returnType: 'unknown',
            description: `Function ${name}`,
            examples: []
          });
        });
      }

      // Extract classes
      const classMatches = file.content.match(/(?:export\s+)?class\s+(\w+)/g);
      if (classMatches) {
        classMatches.forEach(match => {
          const name = match.match(/class\s+(\w+)/)?.[1] || 'unknown';
          analysis.classes.push({
            name,
            methods: [],
            properties: [],
            description: `Class ${name}`
          });
        });
      }

      // Extract interfaces
      const interfaceMatches = file.content.match(/(?:export\s+)?interface\s+(\w+)/g);
      if (interfaceMatches) {
        interfaceMatches.forEach(match => {
          const name = match.match(/interface\s+(\w+)/)?.[1] || 'unknown';
          analysis.interfaces.push({
            name,
            properties: [],
            description: `Interface ${name}`
          });
        });
      }

      // Extract imports
      const importMatches = file.content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const module = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
          if (module && !analysis.imports.includes(module)) {
            analysis.imports.push(module);
          }
        });
      }
    }

    return analysis;
  }

  private generateBadges(projectInfo: any): string {
    const badges = [
      `![Version](https://img.shields.io/badge/version-${projectInfo.version}-blue.svg)`,
      `![License](https://img.shields.io/badge/license-${projectInfo.license}-green.svg)`,
      `![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)`
    ];

    return badges.join(' ');
  }

  private generateTableOfContents(config: DocumentationConfig): string {
    const sections = ['Installation', 'Usage'];
    
    if (config.includeAPI) sections.push('API Reference');
    if (config.includeExamples) sections.push('Examples');
    if (config.includeTesting) sections.push('Testing');
    if (config.includeContributing) sections.push('Contributing');
    
    sections.push('License');

    return '## Table of Contents\n\n' + 
      sections.map(section => `- [${section}](#${section.toLowerCase().replace(/\s+/g, '-')})`).join('\n');
  }

  private async generateInstallationSection(files?: { path: string; content: string }[]): Promise<string> {
    let packageManager = 'npm';
    
    // Check if project uses pnpm or yarn
    if (files?.some(f => f.path.includes('pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (files?.some(f => f.path.includes('yarn.lock'))) {
      packageManager = 'yarn';
    }

    return `## Installation\n\n\`\`\`bash\n${packageManager} install\n\`\`\``;
  }

  private async generateUsageSection(files?: { path: string; content: string }[]): Promise<string> {
    return `## Usage\n\n\`\`\`bash\nnpm run dev\n\`\`\`\n\nOpen [http://localhost:3000](http://localhost:3000) to view the application.`;
  }

  private async generateAPISection(files: { path: string; content: string }[]): Promise<string> {
    const apiFiles = files.filter(f => f.path.includes('/api/') || f.path.includes('route.ts'));
    
    if (apiFiles.length === 0) {
      return '## API Reference\n\nNo API endpoints found.';
    }

    return '## API Reference\n\nThe following API endpoints are available:\n\n' +
      apiFiles.map(f => `- \`${f.path}\``).join('\n');
  }

  private async generateExamplesSection(files?: { path: string; content: string }[]): Promise<string> {
    return `## Examples\n\n### Basic Usage\n\n\`\`\`typescript\n// Example code here\n\`\`\``;
  }

  private generateTestingSection(): string {
    return `## Testing\n\n\`\`\`bash\nnpm test\n\`\`\``;
  }

  private generateContributingSection(): string {
    return `## Contributing\n\n1. Fork the repository\n2. Create a feature branch\n3. Make your changes\n4. Submit a pull request`;
  }

  private generateLicenseSection(license: string): string {
    return `## License\n\nThis project is licensed under the ${license} License.`;
  }

  private generateFunctionsDocumentation(functions: any[]): string {
    return '## Functions\n\n' + 
      functions.map(fn => `### ${fn.name}\n\n${fn.description}`).join('\n\n');
  }

  private generateClassesDocumentation(classes: any[]): string {
    return '## Classes\n\n' + 
      classes.map(cls => `### ${cls.name}\n\n${cls.description}`).join('\n\n');
  }

  private generateInterfacesDocumentation(interfaces: any[]): string {
    return '## Interfaces\n\n' + 
      interfaces.map(iface => `### ${iface.name}\n\n${iface.description}`).join('\n\n');
  }

  private async addCodeComments(code: string, filename: string): Promise<string> {
    // Simple comment addition logic
    const lines = code.split('\n');
    const commentedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Add comments for function declarations
      if (line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+/)) {
        commentedLines.push('/**');
        commentedLines.push(' * Function description');
        commentedLines.push(' */');
      }
      
      commentedLines.push(line);
    }

    return commentedLines.join('\n');
  }

  private generateGettingStartedSection(): string {
    return `## Getting Started\n\n1. Install the application\n2. Configure your settings\n3. Start using the features`;
  }

  private generateFeaturesSection(): string {
    return `## Features\n\n- Feature 1: Description\n- Feature 2: Description\n- Feature 3: Description`;
  }

  private generateTroubleshootingSection(): string {
    return `## Troubleshooting\n\n### Common Issues\n\n**Issue 1**: Description\n**Solution**: Steps to resolve`;
  }

  private async analyzeTechnologyStack(files: { path: string; content: string }[]): Promise<string> {
    const technologies: string[] = [];
    
    // Analyze package.json if available
    const packageFile = files.find(f => f.path.includes('package.json'));
    if (packageFile) {
      try {
        const packageData = JSON.parse(packageFile.content);
        const deps = { ...packageData.dependencies, ...packageData.devDependencies };
        
        if (deps.react) technologies.push('React');
        if (deps.next) technologies.push('Next.js');
        if (deps.typescript) technologies.push('TypeScript');
        if (deps.tailwindcss) technologies.push('Tailwind CSS');
        if (deps['@supabase/supabase-js']) technologies.push('Supabase');
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return `## Technology Stack\n\n` + technologies.map(tech => `- ${tech}`).join('\n');
  }

  private generateDatabaseSchemaSection(): string {
    return `## Database Schema\n\n### Tables\n\n- agents\n- agent_tasks\n- workflows\n- workflow_executions`;
  }

  private generateAPIEndpointsSection(): string {
    return `## API Endpoints\n\n### Agents\n- GET /api/agents\n- POST /api/agents\n\n### Tasks\n- GET /api/tasks\n- POST /api/tasks`;
  }

  private generateSuggestions(sections: any[], config: DocumentationConfig): string[] {
    const suggestions: string[] = [];
    
    if (sections.length < 5) {
      suggestions.push('Consider adding more sections for comprehensive documentation');
    }
    
    if (config.style === 'minimal') {
      suggestions.push('Consider expanding to detailed style for better coverage');
    }
    
    return suggestions;
  }

  private async storeDocumentationResults(taskId: number, result: DocumentationResult) {
    try {
      await this.supabase
        .from('agent_task_results')
        .insert({
          task_id: taskId,
          result_type: 'documentation',
          result_data: result,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store documentation results:', error);
    }
  }
}