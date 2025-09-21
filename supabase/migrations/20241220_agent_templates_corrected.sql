-- Insert specialized agent templates into the marketplace
-- This migration populates the agent_templates table with pre-built specialized agents

-- Security Scanner Agent
INSERT INTO agent_templates (
  name,
  description,
  category,
  capabilities,
  version,
  configuration,
  requirements,
  is_public,
  downloads,
  rating
) VALUES (
  'Security Scanner Agent',
  'Advanced security scanning agent that performs vulnerability assessments, dependency checks, and security best practices validation for your codebase.',
  'Security',
  ARRAY['vulnerability-scanning', 'dependency-analysis', 'security-audit', 'compliance-check'],
  '1.2.0',
  '{
    "scanTypes": ["dependencies", "code", "secrets", "containers"],
    "severity": ["critical", "high", "medium", "low"],
    "frameworks": ["OWASP", "CIS", "NIST"],
    "reportFormat": "json",
    "autoFix": true
  }'::jsonb,
  '{
    "tools": ["snyk", "semgrep", "bandit"],
    "permissions": ["read:code", "write:reports"],
    "resources": {"memory": "512MB", "cpu": "1 core"}
  }'::jsonb,
  true,
  1250,
  4.7
);

-- Code Review Assistant
INSERT INTO agent_templates (
  name,
  description,
  category,
  capabilities,
  version,
  configuration,
  requirements,
  is_public,
  downloads,
  rating
) VALUES (
  'Code Review Assistant',
  'Intelligent code review agent that analyzes pull requests, suggests improvements, checks coding standards, and ensures best practices compliance.',
  'Development',
  ARRAY['code-analysis', 'style-checking', 'performance-review', 'best-practices'],
  '2.1.0',
  '{
    "languages": ["javascript", "typescript", "python", "java", "go"],
    "rules": ["eslint", "prettier", "sonarjs"],
    "complexity": {"maxCyclomaticComplexity": 10},
    "performance": true,
    "suggestions": true
  }'::jsonb,
  '{
    "tools": ["eslint", "sonarqube", "codeclimate"],
    "permissions": ["read:code", "write:comments"],
    "resources": {"memory": "1GB", "cpu": "2 cores"}
  }'::jsonb,
  true,
  2100,
  4.8
);

-- Documentation Generator
INSERT INTO agent_templates (
  name,
  description,
  category,
  capabilities,
  version,
  configuration,
  requirements,
  is_public,
  downloads,
  rating
) VALUES (
  'Documentation Generator',
  'Automated documentation agent that generates comprehensive README files, API documentation, code comments, and user guides from your codebase.',
  'Documentation',
  ARRAY['readme-generation', 'api-docs', 'code-comments', 'user-guides'],
  '1.5.0',
  '{
    "formats": ["markdown", "html", "pdf"],
    "includeExamples": true,
    "apiDocStyle": "openapi",
    "commentStyle": "jsdoc",
    "generateDiagrams": true
  }'::jsonb,
  '{
    "tools": ["jsdoc", "swagger", "mermaid"],
    "permissions": ["read:code", "write:docs"],
    "resources": {"memory": "512MB", "cpu": "1 core"}
  }'::jsonb,
  true,
  890,
  4.5
);

-- Testing Agent
INSERT INTO agent_templates (
  name,
  description,
  category,
  capabilities,
  version,
  configuration,
  requirements,
  is_public,
  downloads,
  rating
) VALUES (
  'Testing Agent',
  'Comprehensive testing agent that generates unit tests, integration tests, performs coverage analysis, and ensures code quality through automated testing.',
  'Testing',
  ARRAY['unit-testing', 'integration-testing', 'coverage-analysis', 'test-generation'],
  '1.8.0',
  '{
    "testFrameworks": ["jest", "mocha", "pytest", "junit"],
    "coverageThreshold": 80,
    "testTypes": ["unit", "integration", "e2e"],
    "mockGeneration": true,
    "parallelExecution": true
  }'::jsonb,
  '{
    "tools": ["jest", "cypress", "selenium"],
    "permissions": ["read:code", "write:tests"],
    "resources": {"memory": "1GB", "cpu": "2 cores"}
  }'::jsonb,
  true,
  1560,
  4.6
);

-- Deployment Agent
INSERT INTO agent_templates (
  name,
  description,
  category,
  capabilities,
  version,
  configuration,
  requirements,
  is_public,
  downloads,
  rating
) VALUES (
  'Deployment Agent',
  'Advanced deployment agent that handles CI/CD pipelines, containerization, cloud deployment, and infrastructure management with zero-downtime deployments.',
  'DevOps',
  ARRAY['ci-cd', 'containerization', 'cloud-deployment', 'infrastructure'],
  '2.0.0',
  '{
    "platforms": ["aws", "gcp", "azure", "vercel"],
    "containers": ["docker", "kubernetes"],
    "cicd": ["github-actions", "gitlab-ci", "jenkins"],
    "monitoring": true,
    "rollback": true
  }'::jsonb,
  '{
    "tools": ["docker", "kubectl", "terraform"],
    "permissions": ["read:code", "write:deployment"],
    "resources": {"memory": "2GB", "cpu": "2 cores"}
  }'::jsonb,
  true,
  980,
  4.4
);

-- Performance Agent
INSERT INTO agent_templates (
  name,
  description,
  category,
  capabilities,
  version,
  configuration,
  requirements,
  is_public,
  downloads,
  rating
) VALUES (
  'Performance Agent',
  'Performance optimization agent that analyzes code performance, identifies bottlenecks, suggests optimizations, and monitors application metrics.',
  'Performance',
  ARRAY['performance-analysis', 'bottleneck-detection', 'optimization', 'monitoring'],
  '1.6.0',
  '{
    "metrics": ["response-time", "memory-usage", "cpu-usage", "throughput"],
    "profiling": true,
    "benchmarking": true,
    "alerting": true,
    "optimization": ["database", "frontend", "backend"]
  }'::jsonb,
  '{
    "tools": ["lighthouse", "webpack-bundle-analyzer", "clinic.js"],
    "permissions": ["read:code", "read:metrics"],
    "resources": {"memory": "1GB", "cpu": "2 cores"}
  }'::jsonb,
  true,
  720,
  4.3
);

-- Update installation counts and ratings for existing templates
UPDATE agent_templates SET 
  installation_count = downloads,
  average_rating = rating
WHERE name IN (
  'Security Scanner Agent',
  'Code Review Assistant', 
  'Documentation Generator',
  'Testing Agent',
  'Deployment Agent',
  'Performance Agent'
);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON agent_templates TO anon;
GRANT ALL PRIVILEGES ON agent_templates TO authenticated;