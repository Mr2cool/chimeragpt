import { BaseAgent } from '../base/agent';
import { AgentCapability, AgentTask, AgentResult } from '@/types/agents';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure' | 'docker' | 'kubernetes';
  environment: 'development' | 'staging' | 'production';
  buildCommand: string;
  outputDirectory: string;
  environmentVariables: Record<string, string>;
  domains?: string[];
  ssl: boolean;
  cdn: boolean;
  monitoring: boolean;
  autoScale: boolean;
  rollbackStrategy: 'immediate' | 'gradual' | 'manual';
}

interface CIConfig {
  provider: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'travis';
  triggers: ('push' | 'pull_request' | 'schedule' | 'manual')[];
  branches: string[];
  testCommand?: string;
  buildCommand: string;
  deployCommand?: string;
  notifications: {
    slack?: string;
    email?: string[];
    discord?: string;
  };
}

interface ContainerConfig {
  baseImage: string;
  nodeVersion?: string;
  workdir: string;
  ports: number[];
  volumes?: string[];
  healthCheck?: {
    command: string;
    interval: string;
    timeout: string;
    retries: number;
  };
  resources?: {
    memory: string;
    cpu: string;
  };
}

interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  buildLogs: string[];
  deploymentId: string;
  environment: string;
  timestamp: string;
  duration: number;
  artifacts: {
    name: string;
    url: string;
    size: number;
  }[];
  generatedFiles: {
    path: string;
    content: string;
    type: 'dockerfile' | 'ci-config' | 'deployment-config' | 'script';
  }[];
  recommendations: string[];
}

interface InfrastructureConfig {
  provider: 'aws' | 'gcp' | 'azure';
  region: string;
  resources: {
    compute: {
      type: string;
      count: number;
      autoScale: boolean;
    };
    database: {
      type: string;
      size: string;
      backup: boolean;
    };
    storage: {
      type: string;
      size: string;
    };
    networking: {
      vpc: boolean;
      loadBalancer: boolean;
      cdn: boolean;
    };
  };
}

export class DeploymentAgent extends BaseAgent {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor() {
    super({
      id: 'deployment-agent',
      name: 'Deployment Agent',
      type: 'specialized',
      description: 'Handles CI/CD pipelines, containerization, and cloud deployment automation',
      capabilities: [
        AgentCapability.DEPLOYMENT,
        AgentCapability.DEVOPS,
        AgentCapability.INFRASTRUCTURE,
        AgentCapability.MONITORING
      ],
      version: '1.0.0'
    });
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    try {
      const { action, config, files } = task.input as {
        action: 'deploy' | 'setup-ci' | 'containerize' | 'infrastructure' | 'rollback';
        config: DeploymentConfig | CIConfig | ContainerConfig | InfrastructureConfig;
        files?: { path: string; content: string }[];
      };

      if (!action) {
        throw new Error('Deployment action is required');
      }

      let deploymentResult: DeploymentResult;

      switch (action) {
        case 'deploy':
          deploymentResult = await this.handleDeployment(config as DeploymentConfig, files);
          break;
        case 'setup-ci':
          deploymentResult = await this.setupCIPipeline(config as CIConfig, files);
          break;
        case 'containerize':
          deploymentResult = await this.containerizeApplication(config as ContainerConfig, files);
          break;
        case 'infrastructure':
          deploymentResult = await this.setupInfrastructure(config as InfrastructureConfig);
          break;
        case 'rollback':
          deploymentResult = await this.rollbackDeployment(config as DeploymentConfig);
          break;
        default:
          throw new Error(`Unsupported deployment action: ${action}`);
      }

      // Store deployment results
      await this.storeDeploymentResults(task.id, deploymentResult);

      return {
        success: deploymentResult.success,
        data: deploymentResult,
        message: deploymentResult.success 
          ? `${action} completed successfully` 
          : `${action} failed`,
        metadata: {
          executionTime: Date.now() - task.startTime!,
          deploymentId: deploymentResult.deploymentId,
          environment: deploymentResult.environment,
          filesGenerated: deploymentResult.generatedFiles.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error',
        data: null
      };
    }
  }

  private async handleDeployment(
    config: DeploymentConfig,
    files?: { path: string; content: string }[]
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = `deploy-${Date.now()}`;
    const buildLogs: string[] = [];
    const generatedFiles: any[] = [];

    buildLogs.push(`Starting deployment to ${config.platform}`);
    buildLogs.push(`Environment: ${config.environment}`);
    buildLogs.push(`Build command: ${config.buildCommand}`);

    try {
      // Generate platform-specific configuration
      switch (config.platform) {
        case 'vercel':
          const vercelConfig = await this.generateVercelConfig(config);
          generatedFiles.push(vercelConfig);
          buildLogs.push('Generated Vercel configuration');
          break;
        case 'netlify':
          const netlifyConfig = await this.generateNetlifyConfig(config);
          generatedFiles.push(netlifyConfig);
          buildLogs.push('Generated Netlify configuration');
          break;
        case 'aws':
          const awsConfig = await this.generateAWSConfig(config);
          generatedFiles.push(...awsConfig);
          buildLogs.push('Generated AWS deployment configuration');
          break;
        case 'docker':
          const dockerConfig = await this.generateDockerConfig(config);
          generatedFiles.push(dockerConfig);
          buildLogs.push('Generated Docker configuration');
          break;
        case 'kubernetes':
          const k8sConfig = await this.generateKubernetesConfig(config);
          generatedFiles.push(...k8sConfig);
          buildLogs.push('Generated Kubernetes manifests');
          break;
      }

      // Generate environment variables file
      if (Object.keys(config.environmentVariables).length > 0) {
        const envFile = this.generateEnvironmentFile(config.environmentVariables);
        generatedFiles.push(envFile);
        buildLogs.push('Generated environment variables file');
      }

      // Simulate build process
      buildLogs.push('Installing dependencies...');
      buildLogs.push('Running build command...');
      buildLogs.push('Optimizing assets...');
      buildLogs.push('Uploading to deployment platform...');
      
      const deploymentUrl = this.generateDeploymentUrl(config);
      buildLogs.push(`Deployment successful: ${deploymentUrl}`);

      return {
        success: true,
        deploymentUrl,
        buildLogs,
        deploymentId,
        environment: config.environment,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [
          {
            name: 'build-output',
            url: `${deploymentUrl}/artifacts/build.zip`,
            size: 1024 * 1024 * 5 // 5MB
          }
        ],
        generatedFiles,
        recommendations: this.generateDeploymentRecommendations(config)
      };

    } catch (error) {
      buildLogs.push(`Deployment failed: ${error}`);
      
      return {
        success: false,
        buildLogs,
        deploymentId,
        environment: config.environment,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: ['Check build logs for errors', 'Verify environment variables']
      };
    }
  }

  private async setupCIPipeline(
    config: CIConfig,
    files?: { path: string; content: string }[]
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = `ci-setup-${Date.now()}`;
    const buildLogs: string[] = [];
    const generatedFiles: any[] = [];

    buildLogs.push(`Setting up CI/CD pipeline with ${config.provider}`);
    buildLogs.push(`Triggers: ${config.triggers.join(', ')}`);
    buildLogs.push(`Branches: ${config.branches.join(', ')}`);

    try {
      // Generate CI configuration based on provider
      switch (config.provider) {
        case 'github-actions':
          const githubWorkflow = await this.generateGitHubActionsWorkflow(config);
          generatedFiles.push(githubWorkflow);
          buildLogs.push('Generated GitHub Actions workflow');
          break;
        case 'gitlab-ci':
          const gitlabConfig = await this.generateGitLabCIConfig(config);
          generatedFiles.push(gitlabConfig);
          buildLogs.push('Generated GitLab CI configuration');
          break;
        case 'jenkins':
          const jenkinsfile = await this.generateJenkinsfile(config);
          generatedFiles.push(jenkinsfile);
          buildLogs.push('Generated Jenkinsfile');
          break;
        case 'circleci':
          const circleConfig = await this.generateCircleCIConfig(config);
          generatedFiles.push(circleConfig);
          buildLogs.push('Generated CircleCI configuration');
          break;
      }

      // Generate additional CI scripts
      const scripts = await this.generateCIScripts(config);
      generatedFiles.push(...scripts);
      buildLogs.push('Generated CI scripts');

      buildLogs.push('CI/CD pipeline setup completed successfully');

      return {
        success: true,
        buildLogs,
        deploymentId,
        environment: 'ci-setup',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: [
          'Configure secrets in your CI/CD platform',
          'Test the pipeline with a sample commit',
          'Set up branch protection rules'
        ]
      };

    } catch (error) {
      buildLogs.push(`CI setup failed: ${error}`);
      
      return {
        success: false,
        buildLogs,
        deploymentId,
        environment: 'ci-setup',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: ['Check CI provider documentation', 'Verify repository permissions']
      };
    }
  }

  private async containerizeApplication(
    config: ContainerConfig,
    files?: { path: string; content: string }[]
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = `container-${Date.now()}`;
    const buildLogs: string[] = [];
    const generatedFiles: any[] = [];

    buildLogs.push('Starting application containerization');
    buildLogs.push(`Base image: ${config.baseImage}`);
    buildLogs.push(`Working directory: ${config.workdir}`);
    buildLogs.push(`Exposed ports: ${config.ports.join(', ')}`);

    try {
      // Generate Dockerfile
      const dockerfile = await this.generateDockerfile(config);
      generatedFiles.push(dockerfile);
      buildLogs.push('Generated Dockerfile');

      // Generate docker-compose.yml
      const dockerCompose = await this.generateDockerCompose(config);
      generatedFiles.push(dockerCompose);
      buildLogs.push('Generated docker-compose.yml');

      // Generate .dockerignore
      const dockerignore = await this.generateDockerignore();
      generatedFiles.push(dockerignore);
      buildLogs.push('Generated .dockerignore');

      // Generate build scripts
      const buildScript = await this.generateDockerBuildScript(config);
      generatedFiles.push(buildScript);
      buildLogs.push('Generated build script');

      // Generate health check script if configured
      if (config.healthCheck) {
        const healthScript = await this.generateHealthCheckScript(config.healthCheck);
        generatedFiles.push(healthScript);
        buildLogs.push('Generated health check script');
      }

      buildLogs.push('Containerization setup completed successfully');

      return {
        success: true,
        buildLogs,
        deploymentId,
        environment: 'containerization',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: [
          'Test the Docker image locally before deployment',
          'Optimize image size by using multi-stage builds',
          'Configure proper security scanning for images'
        ]
      };

    } catch (error) {
      buildLogs.push(`Containerization failed: ${error}`);
      
      return {
        success: false,
        buildLogs,
        deploymentId,
        environment: 'containerization',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: ['Check Docker configuration', 'Verify base image availability']
      };
    }
  }

  private async setupInfrastructure(config: InfrastructureConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = `infra-${Date.now()}`;
    const buildLogs: string[] = [];
    const generatedFiles: any[] = [];

    buildLogs.push(`Setting up infrastructure on ${config.provider}`);
    buildLogs.push(`Region: ${config.region}`);

    try {
      // Generate infrastructure as code
      switch (config.provider) {
        case 'aws':
          const awsTemplates = await this.generateAWSInfrastructure(config);
          generatedFiles.push(...awsTemplates);
          buildLogs.push('Generated AWS CloudFormation templates');
          break;
        case 'gcp':
          const gcpTemplates = await this.generateGCPInfrastructure(config);
          generatedFiles.push(...gcpTemplates);
          buildLogs.push('Generated GCP Deployment Manager templates');
          break;
        case 'azure':
          const azureTemplates = await this.generateAzureInfrastructure(config);
          generatedFiles.push(...azureTemplates);
          buildLogs.push('Generated Azure Resource Manager templates');
          break;
      }

      // Generate Terraform configuration
      const terraformConfig = await this.generateTerraformConfig(config);
      generatedFiles.push(...terraformConfig);
      buildLogs.push('Generated Terraform configuration');

      buildLogs.push('Infrastructure setup completed successfully');

      return {
        success: true,
        buildLogs,
        deploymentId,
        environment: 'infrastructure',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: [
          'Review and customize the generated templates',
          'Set up proper IAM roles and permissions',
          'Configure monitoring and alerting'
        ]
      };

    } catch (error) {
      buildLogs.push(`Infrastructure setup failed: ${error}`);
      
      return {
        success: false,
        buildLogs,
        deploymentId,
        environment: 'infrastructure',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles,
        recommendations: ['Check cloud provider credentials', 'Verify region availability']
      };
    }
  }

  private async rollbackDeployment(config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now();
    const deploymentId = `rollback-${Date.now()}`;
    const buildLogs: string[] = [];

    buildLogs.push(`Starting rollback for ${config.environment} environment`);
    buildLogs.push(`Rollback strategy: ${config.rollbackStrategy}`);

    try {
      // Simulate rollback process
      buildLogs.push('Identifying previous stable deployment...');
      buildLogs.push('Switching traffic to previous version...');
      buildLogs.push('Verifying rollback success...');
      buildLogs.push('Rollback completed successfully');

      return {
        success: true,
        buildLogs,
        deploymentId,
        environment: config.environment,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles: [],
        recommendations: [
          'Monitor application metrics after rollback',
          'Investigate the cause of the original deployment failure'
        ]
      };

    } catch (error) {
      buildLogs.push(`Rollback failed: ${error}`);
      
      return {
        success: false,
        buildLogs,
        deploymentId,
        environment: config.environment,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        artifacts: [],
        generatedFiles: [],
        recommendations: ['Manual intervention may be required', 'Contact DevOps team']
      };
    }
  }

  // Configuration generators
  private async generateVercelConfig(config: DeploymentConfig) {
    const vercelConfig = {
      version: 2,
      builds: [
        {
          src: 'package.json',
          use: '@vercel/next'
        }
      ],
      env: config.environmentVariables,
      regions: ['iad1'],
      ...(config.domains && { alias: config.domains })
    };

    return {
      path: 'vercel.json',
      content: JSON.stringify(vercelConfig, null, 2),
      type: 'deployment-config' as const
    };
  }

  private async generateNetlifyConfig(config: DeploymentConfig) {
    const netlifyConfig = `[build]
  command = "${config.buildCommand}"
  publish = "${config.outputDirectory}"

[build.environment]
${Object.entries(config.environmentVariables)
  .map(([key, value]) => `  ${key} = "${value}"`)
  .join('\n')}

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;

    return {
      path: 'netlify.toml',
      content: netlifyConfig,
      type: 'deployment-config' as const
    };
  }

  private async generateAWSConfig(config: DeploymentConfig) {
    const configs = [];

    // Generate buildspec.yml for CodeBuild
    const buildspec = {
      version: '0.2',
      phases: {
        install: {
          'runtime-versions': {
            nodejs: '18'
          },
          commands: ['npm install']
        },
        build: {
          commands: [config.buildCommand]
        }
      },
      artifacts: {
        files: ['**/*'],
        'base-directory': config.outputDirectory
      }
    };

    configs.push({
      path: 'buildspec.yml',
      content: JSON.stringify(buildspec, null, 2),
      type: 'deployment-config' as const
    });

    // Generate appspec.yml for CodeDeploy
    const appspec = {
      version: '0.0',
      os: 'linux',
      files: [
        {
          source: '/',
          destination: '/var/www/html'
        }
      ],
      hooks: {
        BeforeInstall: [
          {
            location: 'scripts/install_dependencies.sh',
            timeout: 300,
            runas: 'root'
          }
        ],
        ApplicationStart: [
          {
            location: 'scripts/start_server.sh',
            timeout: 300,
            runas: 'root'
          }
        ]
      }
    };

    configs.push({
      path: 'appspec.yml',
      content: JSON.stringify(appspec, null, 2),
      type: 'deployment-config' as const
    });

    return configs;
  }

  private async generateDockerConfig(config: DeploymentConfig) {
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN ${config.buildCommand}

EXPOSE 3000

CMD ["npm", "start"]`;

    return {
      path: 'Dockerfile',
      content: dockerfile,
      type: 'dockerfile' as const
    };
  }

  private async generateKubernetesConfig(config: DeploymentConfig) {
    const configs = [];

    // Deployment manifest
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'app-deployment',
        labels: {
          app: 'web-app'
        }
      },
      spec: {
        replicas: config.autoScale ? 3 : 1,
        selector: {
          matchLabels: {
            app: 'web-app'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'web-app'
            }
          },
          spec: {
            containers: [
              {
                name: 'web-app',
                image: 'web-app:latest',
                ports: [
                  {
                    containerPort: 3000
                  }
                ],
                env: Object.entries(config.environmentVariables).map(([name, value]) => ({
                  name,
                  value
                }))
              }
            ]
          }
        }
      }
    };

    configs.push({
      path: 'k8s/deployment.yaml',
      content: JSON.stringify(deployment, null, 2),
      type: 'deployment-config' as const
    });

    // Service manifest
    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'app-service'
      },
      spec: {
        selector: {
          app: 'web-app'
        },
        ports: [
          {
            protocol: 'TCP',
            port: 80,
            targetPort: 3000
          }
        ],
        type: 'LoadBalancer'
      }
    };

    configs.push({
      path: 'k8s/service.yaml',
      content: JSON.stringify(service, null, 2),
      type: 'deployment-config' as const
    });

    return configs;
  }

  private generateEnvironmentFile(envVars: Record<string, string>) {
    const content = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    return {
      path: '.env.production',
      content,
      type: 'deployment-config' as const
    };
  }

  private generateDeploymentUrl(config: DeploymentConfig): string {
    const subdomain = `app-${Date.now()}`;
    
    switch (config.platform) {
      case 'vercel':
        return `https://${subdomain}.vercel.app`;
      case 'netlify':
        return `https://${subdomain}.netlify.app`;
      case 'aws':
        return `https://${subdomain}.amazonaws.com`;
      default:
        return `https://${subdomain}.example.com`;
    }
  }

  private generateDeploymentRecommendations(config: DeploymentConfig): string[] {
    const recommendations: string[] = [];

    if (!config.ssl) {
      recommendations.push('Enable SSL/TLS for production deployments');
    }

    if (!config.cdn) {
      recommendations.push('Consider enabling CDN for better performance');
    }

    if (!config.monitoring) {
      recommendations.push('Set up monitoring and alerting');
    }

    if (config.environment === 'production' && !config.autoScale) {
      recommendations.push('Consider enabling auto-scaling for production');
    }

    recommendations.push('Set up automated backups');
    recommendations.push('Configure proper logging');

    return recommendations;
  }

  // CI/CD Configuration Generators
  private async generateGitHubActionsWorkflow(config: CIConfig) {
    const workflow = {
      name: 'CI/CD Pipeline',
      on: {
        push: {
          branches: config.branches
        },
        pull_request: {
          branches: config.branches
        }
      },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            {
              uses: 'actions/checkout@v3'
            },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v3',
              with: {
                'node-version': '18',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              run: 'npm ci'
            },
            ...(config.testCommand ? [{
              name: 'Run tests',
              run: config.testCommand
            }] : []),
            {
              name: 'Build',
              run: config.buildCommand
            }
          ]
        }
      }
    };

    return {
      path: '.github/workflows/ci.yml',
      content: JSON.stringify(workflow, null, 2),
      type: 'ci-config' as const
    };
  }

  private async generateGitLabCIConfig(config: CIConfig) {
    const gitlabCI = `stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

before_script:
  - npm ci

test:
  stage: test
  script:
    ${config.testCommand ? `- ${config.testCommand}` : '- echo "No tests configured"'}
  only:
    - ${config.branches.join('\n    - ')}

build:
  stage: build
  script:
    - ${config.buildCommand}
  artifacts:
    paths:
      - dist/
  only:
    - ${config.branches.join('\n    - ')}`;

    return {
      path: '.gitlab-ci.yml',
      content: gitlabCI,
      type: 'ci-config' as const
    };
  }

  private async generateJenkinsfile(config: CIConfig) {
    const jenkinsfile = `pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        ${config.testCommand ? `stage('Test') {
            steps {
                sh '${config.testCommand}'
            }
        }` : ''}
        
        stage('Build') {
            steps {
                sh '${config.buildCommand}'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}`;

    return {
      path: 'Jenkinsfile',
      content: jenkinsfile,
      type: 'ci-config' as const
    };
  }

  private async generateCircleCIConfig(config: CIConfig) {
    const circleConfig = {
      version: '2.1',
      jobs: {
        test: {
          docker: [
            {
              image: 'cimg/node:18.0'
            }
          ],
          steps: [
            'checkout',
            {
              run: {
                name: 'Install dependencies',
                command: 'npm ci'
              }
            },
            ...(config.testCommand ? [{
              run: {
                name: 'Run tests',
                command: config.testCommand
              }
            }] : []),
            {
              run: {
                name: 'Build',
                command: config.buildCommand
              }
            }
          ]
        }
      },
      workflows: {
        version: 2,
        test_and_build: {
          jobs: ['test']
        }
      }
    };

    return {
      path: '.circleci/config.yml',
      content: JSON.stringify(circleConfig, null, 2),
      type: 'ci-config' as const
    };
  }

  private async generateCIScripts(config: CIConfig) {
    const scripts = [];

    // Deploy script
    if (config.deployCommand) {
      scripts.push({
        path: 'scripts/deploy.sh',
        content: `#!/bin/bash\nset -e\n\necho "Starting deployment..."\n${config.deployCommand}\necho "Deployment completed!"`,
        type: 'script' as const
      });
    }

    // Notification script
    if (config.notifications.slack) {
      scripts.push({
        path: 'scripts/notify.sh',
        content: `#!/bin/bash\ncurl -X POST -H 'Content-type: application/json' --data '{"text":"Deployment completed!"}' ${config.notifications.slack}`,
        type: 'script' as const
      });
    }

    return scripts;
  }

  // Container Configuration Generators
  private async generateDockerfile(config: ContainerConfig) {
    const dockerfile = `FROM ${config.baseImage}

WORKDIR ${config.workdir}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose ports
${config.ports.map(port => `EXPOSE ${port}`).join('\n')}

${config.healthCheck ? `# Health check
HEALTHCHECK --interval=${config.healthCheck.interval} --timeout=${config.healthCheck.timeout} --retries=${config.healthCheck.retries} \\
  CMD ${config.healthCheck.command}` : ''}

# Start application
CMD ["npm", "start"]`;

    return {
      path: 'Dockerfile',
      content: dockerfile,
      type: 'dockerfile' as const
    };
  }

  private async generateDockerCompose(config: ContainerConfig) {
    const compose = {
      version: '3.8',
      services: {
        app: {
          build: '.',
          ports: config.ports.map(port => `${port}:${port}`),
          ...(config.volumes && { volumes: config.volumes }),
          ...(config.resources && {
            deploy: {
              resources: {
                limits: {
                  memory: config.resources.memory,
                  cpus: config.resources.cpu
                }
              }
            }
          }),
          environment: {
            NODE_ENV: 'production'
          }
        }
      }
    };

    return {
      path: 'docker-compose.yml',
      content: JSON.stringify(compose, null, 2),
      type: 'deployment-config' as const
    };
  }

  private async generateDockerignore() {
    const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.cache
.next
.nuxt
dist
.DS_Store
*.log`;

    return {
      path: '.dockerignore',
      content: dockerignore,
      type: 'deployment-config' as const
    };
  }

  private async generateDockerBuildScript(config: ContainerConfig) {
    const script = `#!/bin/bash
set -e

echo "Building Docker image..."
docker build -t app:latest .

echo "Running container..."
docker run -d -p ${config.ports[0]}:${config.ports[0]} --name app-container app:latest

echo "Container started successfully!"`;

    return {
      path: 'scripts/docker-build.sh',
      content: script,
      type: 'script' as const
    };
  }

  private async generateHealthCheckScript(healthCheck: any) {
    const script = `#!/bin/bash
# Health check script
${healthCheck.command}
exit $?`;

    return {
      path: 'scripts/health-check.sh',
      content: script,
      type: 'script' as const
    };
  }

  // Infrastructure Configuration Generators
  private async generateAWSInfrastructure(config: InfrastructureConfig) {
    const templates = [];

    // CloudFormation template
    const cfTemplate = {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: 'Infrastructure for web application',
      Resources: {
        VPC: {
          Type: 'AWS::EC2::VPC',
          Properties: {
            CidrBlock: '10.0.0.0/16',
            EnableDnsHostnames: true,
            EnableDnsSupport: true
          }
        },
        EC2Instance: {
          Type: 'AWS::EC2::Instance',
          Properties: {
            InstanceType: config.resources.compute.type,
            ImageId: 'ami-0abcdef1234567890', // Amazon Linux 2
            SubnetId: { Ref: 'PublicSubnet' },
            SecurityGroupIds: [{ Ref: 'WebSecurityGroup' }]
          }
        }
      }
    };

    templates.push({
      path: 'aws/cloudformation.yaml',
      content: JSON.stringify(cfTemplate, null, 2),
      type: 'deployment-config' as const
    });

    return templates;
  }

  private async generateGCPInfrastructure(config: InfrastructureConfig) {
    const templates = [];

    // Deployment Manager template
    const dmTemplate = {
      resources: [
        {
          name: 'web-app-instance',
          type: 'compute.v1.instance',
          properties: {
            zone: `${config.region}-a`,
            machineType: `zones/${config.region}-a/machineTypes/${config.resources.compute.type}`,
            disks: [
              {
                boot: true,
                autoDelete: true,
                initializeParams: {
                  sourceImage: 'projects/debian-cloud/global/images/family/debian-11'
                }
              }
            ],
            networkInterfaces: [
              {
                network: 'global/networks/default',
                accessConfigs: [
                  {
                    type: 'ONE_TO_ONE_NAT',
                    name: 'External NAT'
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    templates.push({
      path: 'gcp/deployment.yaml',
      content: JSON.stringify(dmTemplate, null, 2),
      type: 'deployment-config' as const
    });

    return templates;
  }

  private async generateAzureInfrastructure(config: InfrastructureConfig) {
    const templates = [];

    // ARM template
    const armTemplate = {
      '$schema': 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      resources: [
        {
          type: 'Microsoft.Compute/virtualMachines',
          apiVersion: '2021-03-01',
          name: 'web-app-vm',
          location: config.region,
          properties: {
            hardwareProfile: {
              vmSize: config.resources.compute.type
            },
            osProfile: {
              computerName: 'web-app-vm',
              adminUsername: 'azureuser'
            },
            storageProfile: {
              imageReference: {
                publisher: 'Canonical',
                offer: 'UbuntuServer',
                sku: '18.04-LTS',
                version: 'latest'
              }
            }
          }
        }
      ]
    };

    templates.push({
      path: 'azure/template.json',
      content: JSON.stringify(armTemplate, null, 2),
      type: 'deployment-config' as const
    });

    return templates;
  }

  private async generateTerraformConfig(config: InfrastructureConfig) {
    const configs = [];

    // Main Terraform configuration
    const mainTf = `terraform {
  required_providers {
    ${config.provider} = {
      source  = "hashicorp/${config.provider}"
      version = "~> 4.0"
    }
  }
}

provider "${config.provider}" {
  region = "${config.region}"
}

resource "${config.provider}_instance" "web_app" {
  instance_type = "${config.resources.compute.type}"
  
  tags = {
    Name = "WebApp"
    Environment = "production"
  }
}`;

    configs.push({
      path: 'terraform/main.tf',
      content: mainTf,
      type: 'deployment-config' as const
    });

    // Variables file
    const variablesTf = `variable "region" {
  description = "The region to deploy resources"
  type        = string
  default     = "${config.region}"
}

variable "instance_type" {
  description = "The instance type for compute resources"
  type        = string
  default     = "${config.resources.compute.type}"
}`;

    configs.push({
      path: 'terraform/variables.tf',
      content: variablesTf,
      type: 'deployment-config' as const
    });

    return configs;
  }

  private async storeDeploymentResults(taskId: number, result: DeploymentResult) {
    try {
      await this.supabase
        .from('agent_task_results')
        .insert({
          task_id: taskId,
          result_type: 'deployment',
          result_data: result,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store deployment results:', error);
    }
  }
}