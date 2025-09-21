-- Insert specialized agent templates into the marketplace

-- Security Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Security Scanner Agent',
  'Advanced security analysis agent that performs vulnerability scanning, dependency checks, and security best practices validation. Integrates with popular security tools and provides detailed security reports.',
  'security',
  ARRAY['vulnerability-scanning', 'dependency-analysis', 'security-audit', 'compliance-check', 'threat-detection'],
  ARRAY['security', 'vulnerability', 'audit', 'compliance', 'scanning'],
  '1.0.0',
  'ChimeraGPT Team',
  '{
    "scan_types": ["sast", "dast", "dependency", "secrets"],
    "severity_threshold": "medium",
    "auto_fix": false,
    "report_format": "json",
    "integrations": ["snyk", "sonarqube", "bandit", "eslint-security"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Code Review Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Code Review Assistant',
  'Intelligent code review agent that analyzes code quality, performance, maintainability, and adherence to best practices. Provides detailed feedback and suggestions for improvement.',
  'code-review',
  ARRAY['static-analysis', 'code-quality', 'performance-analysis', 'best-practices', 'refactoring-suggestions'],
  ARRAY['code-review', 'quality', 'analysis', 'refactoring', 'best-practices'],
  '1.2.0',
  'ChimeraGPT Team',
  '{
    "languages": ["javascript", "typescript", "python", "java", "go", "rust"],
    "rules": ["complexity", "duplication", "naming", "performance", "security"],
    "auto_suggest_fixes": true,
    "severity_levels": ["info", "warning", "error", "critical"],
    "integrations": ["eslint", "prettier", "sonarjs", "jshint"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Documentation Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Documentation Generator',
  'Automated documentation agent that generates comprehensive README files, API documentation, code comments, and user guides. Supports multiple documentation formats and styles.',
  'documentation',
  ARRAY['readme-generation', 'api-docs', 'code-comments', 'user-guides', 'changelog-generation'],
  ARRAY['documentation', 'readme', 'api-docs', 'comments', 'guides'],
  '1.1.0',
  'ChimeraGPT Team',
  '{
    "formats": ["markdown", "html", "pdf", "confluence"],
    "doc_types": ["readme", "api", "user-guide", "changelog", "contributing"],
    "auto_update": true,
    "include_examples": true,
    "style_guide": "standard",
    "integrations": ["jsdoc", "sphinx", "gitbook", "swagger"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Testing Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Automation Agent',
  'Comprehensive testing agent that generates unit tests, integration tests, and end-to-end tests. Provides test coverage analysis and automated test execution.',
  'testing',
  ARRAY['unit-testing', 'integration-testing', 'e2e-testing', 'coverage-analysis', 'test-generation'],
  ARRAY['testing', 'unit-tests', 'integration', 'e2e', 'coverage'],
  '1.3.0',
  'ChimeraGPT Team',
  '{
    "test_types": ["unit", "integration", "e2e", "performance", "accessibility"],
    "frameworks": ["jest", "mocha", "cypress", "playwright", "selenium"],
    "coverage_threshold": 80,
    "auto_run": true,
    "parallel_execution": true,
    "integrations": ["jest", "cypress", "playwright", "codecov"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Deployment Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Deployment Orchestrator',
  'Advanced deployment agent that handles CI/CD pipeline setup, containerization, cloud deployment, and infrastructure management. Supports multiple cloud providers and deployment strategies.',
  'deployment',
  ARRAY['ci-cd-setup', 'containerization', 'cloud-deployment', 'infrastructure-management', 'rollback-management'],
  ARRAY['deployment', 'ci-cd', 'docker', 'kubernetes', 'cloud'],
  '1.4.0',
  'ChimeraGPT Team',
  '{
    "platforms": ["aws", "gcp", "azure", "vercel", "netlify", "heroku"],
    "strategies": ["blue-green", "canary", "rolling", "recreate"],
    "containerization": true,
    "auto_scaling": true,
    "monitoring": true,
    "integrations": ["github-actions", "gitlab-ci", "jenkins", "docker", "kubernetes"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Performance Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Performance Optimizer',
  'Performance analysis and optimization agent that identifies bottlenecks, suggests optimizations, and monitors application performance. Provides detailed performance reports and recommendations.',
  'performance',
  ARRAY['performance-analysis', 'bottleneck-detection', 'optimization-suggestions', 'monitoring', 'profiling'],
  ARRAY['performance', 'optimization', 'monitoring', 'profiling', 'analysis'],
  '1.2.0',
  'ChimeraGPT Team',
  '{
    "metrics": ["response-time", "throughput", "memory-usage", "cpu-usage", "network"],
    "thresholds": {
      "response_time": 200,
      "memory_usage": 80,
      "cpu_usage": 70
    },
    "auto_optimize": false,
    "profiling_tools": ["lighthouse", "webpagetest", "gtmetrix", "new-relic"],
    "integrations": ["lighthouse", "webpack-bundle-analyzer", "chrome-devtools"]
  }'::jsonb,
  true,
  NOW(),
  NOW()
);

-- Database Optimization Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Database Optimizer',
  'Database performance and optimization agent that analyzes queries, suggests indexes, optimizes schema design, and monitors database performance metrics.',
  'performance',
  ARRAY['query-optimization', 'index-suggestions', 'schema-analysis', 'performance-monitoring', 'migration-assistance'],
  ARRAY['database', 'optimization', 'queries', 'indexes', 'performance'],
  '1.0.0',
  'ChimeraGPT Team',
  '{
    "databases": ["postgresql", "mysql", "mongodb", "redis", "sqlite"],
    "analysis_types": ["slow-queries", "missing-indexes", "schema-issues", "deadlocks"],
    "auto_apply_suggestions": false,
    "monitoring_interval": 300,
    "integrations": ["pg_stat_statements", "mysql-slow-log", "mongodb-profiler"]
  }'::jsonb,
  false,
  NOW(),
  NOW()
);

-- API Testing Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'API Test Generator',
  'Specialized API testing agent that generates comprehensive API tests, validates responses, checks performance, and ensures API contract compliance.',
  'testing',
  ARRAY['api-testing', 'contract-testing', 'load-testing', 'response-validation', 'documentation-testing'],
  ARRAY['api', 'testing', 'rest', 'graphql', 'validation'],
  '1.1.0',
  'ChimeraGPT Team',
  '{
    "api_types": ["rest", "graphql", "grpc", "websocket"],
    "test_types": ["functional", "contract", "load", "security", "documentation"],
    "auto_generate_from_spec": true,
    "response_validation": true,
    "integrations": ["postman", "insomnia", "swagger", "pact", "k6"]
  }'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Accessibility Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Accessibility Auditor',
  'Accessibility compliance agent that audits web applications for WCAG compliance, identifies accessibility issues, and provides remediation suggestions.',
  'testing',
  ARRAY['accessibility-audit', 'wcag-compliance', 'screen-reader-testing', 'color-contrast-analysis', 'keyboard-navigation'],
  ARRAY['accessibility', 'wcag', 'a11y', 'compliance', 'audit'],
  '1.0.0',
  'ChimeraGPT Team',
  '{
    "standards": ["wcag-2.1-aa", "wcag-2.1-aaa", "section-508"],
    "test_types": ["automated", "manual", "screen-reader", "keyboard"],
    "severity_levels": ["minor", "moderate", "serious", "critical"],
    "auto_fix_suggestions": true,
    "integrations": ["axe-core", "lighthouse", "wave", "pa11y"]
  }'::jsonb,
  false,
  NOW(),
  NOW()
);

-- SEO Optimization Agent Template
INSERT INTO agent_templates (
  id,
  name,
  description,
  category,
  capabilities,
  tags,
  version,
  author,
  config,
  featured,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'SEO Optimizer',
  'SEO analysis and optimization agent that audits web pages for search engine optimization, suggests improvements, and monitors SEO performance metrics.',
  'performance',
  ARRAY['seo-audit', 'keyword-analysis', 'meta-optimization', 'performance-seo', 'content-analysis'],
  ARRAY['seo', 'optimization', 'keywords', 'meta-tags', 'performance'],
  '1.0.0',
  'ChimeraGPT Team',
  '{
    "audit_types": ["technical", "content", "performance", "mobile", "local"],
    "metrics": ["page-speed", "mobile-friendly", "meta-tags", "structured-data"],
    "keyword_research": true,
    "competitor_analysis": false,
    "integrations": ["google-search-console", "lighthouse", "screaming-frog"]
  }'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Update installation counts and ratings for some templates
UPDATE agent_templates 
SET installation_count = FLOOR(RANDOM() * 1000) + 100,
    average_rating = ROUND((RANDOM() * 2 + 3)::numeric, 1),
    rating_count = FLOOR(RANDOM() * 200) + 50
WHERE featured = true;

UPDATE agent_templates 
SET installation_count = FLOOR(RANDOM() * 500) + 10,
    average_rating = ROUND((RANDOM() * 2 + 3)::numeric, 1),
    rating_count = FLOOR(RANDOM() * 100) + 10
WHERE featured = false;