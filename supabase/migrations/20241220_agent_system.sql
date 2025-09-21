-- Enhanced Agent System Migration
-- This migration creates tables for the comprehensive multi-agent system

-- Enable RLS
ALTER DATABASE postgres SET row_security = on;

-- Agents table (enhanced)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'error', 'stopped')),
  capabilities TEXT[] DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  memory JSONB DEFAULT '{}',
  version TEXT DEFAULT '1.0.0',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Tasks table (enhanced)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  input JSONB NOT NULL,
  output JSONB,
  error TEXT,
  dependencies TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Collaborations table
CREATE TABLE IF NOT EXISTS agent_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  collaboration_type TEXT NOT NULL CHECK (collaboration_type IN ('data_sharing', 'task_delegation', 'result_validation', 'knowledge_exchange')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Agent Metrics table
CREATE TABLE IF NOT EXISTS agent_metrics (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  average_execution_time FLOAT DEFAULT 0,
  success_rate FLOAT DEFAULT 100,
  performance_score FLOAT DEFAULT 100,
  resource_usage JSONB DEFAULT '{"cpu": 0, "memory": 0, "network": 0}',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Templates table (for marketplace)
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  author TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  capabilities TEXT[] DEFAULT '{}',
  configuration_schema JSONB DEFAULT '{}',
  default_configuration JSONB DEFAULT '{}',
  installation_count INTEGER DEFAULT 0,
  rating FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  documentation TEXT,
  changelog TEXT,
  requirements JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Installations table
CREATE TABLE IF NOT EXISTS agent_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  installed_by TEXT,
  configuration JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, agent_id)
);

-- Agent Ratings table
CREATE TABLE IF NOT EXISTS agent_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Workflows table (enhanced)
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed', 'cancelled')),
  steps JSONB NOT NULL DEFAULT '[]',
  configuration JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  version TEXT DEFAULT '1.0.0',
  is_template BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER DEFAULT 0,
  step_results JSONB DEFAULT '[]',
  input JSONB DEFAULT '{}',
  output JSONB,
  error TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Communications table
CREATE TABLE IF NOT EXISTS agent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  receiver_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('request', 'response', 'notification', 'broadcast')),
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- System Logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  component TEXT,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (for RBAC)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'developer', 'viewer', 'agent_operator')),
  organization_id TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  subscription_plan TEXT DEFAULT 'free',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access Logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_last_active ON agents(last_active);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at ON tasks(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_collaborations_initiator ON agent_collaborations(initiator_agent_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_target ON agent_collaborations(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON agent_collaborations(status);

CREATE INDEX IF NOT EXISTS idx_templates_type ON agent_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON agent_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_rating ON agent_templates(rating);

CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_template ON workflows(is_template);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);

CREATE INDEX IF NOT EXISTS idx_communications_sender ON agent_communications(sender_agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_receiver ON agent_communications(receiver_agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON agent_communications(message_type);

CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_logs_agent_id ON system_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (development mode)
-- Note: In production, these should be more restrictive

-- Agents policies
CREATE POLICY "Allow all operations on agents" ON agents
  FOR ALL USING (true) WITH CHECK (true);

-- Tasks policies
CREATE POLICY "Allow all operations on tasks" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

-- Agent collaborations policies
CREATE POLICY "Allow all operations on agent_collaborations" ON agent_collaborations
  FOR ALL USING (true) WITH CHECK (true);

-- Agent metrics policies
CREATE POLICY "Allow all operations on agent_metrics" ON agent_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- Agent templates policies
CREATE POLICY "Allow read access to public templates" ON agent_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Allow all operations on agent_templates" ON agent_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Agent installations policies
CREATE POLICY "Allow all operations on agent_installations" ON agent_installations
  FOR ALL USING (true) WITH CHECK (true);

-- Agent ratings policies
CREATE POLICY "Allow all operations on agent_ratings" ON agent_ratings
  FOR ALL USING (true) WITH CHECK (true);

-- Workflows policies
CREATE POLICY "Allow all operations on workflows" ON workflows
  FOR ALL USING (true) WITH CHECK (true);

-- Workflow executions policies
CREATE POLICY "Allow all operations on workflow_executions" ON workflow_executions
  FOR ALL USING (true) WITH CHECK (true);

-- Agent communications policies
CREATE POLICY "Allow all operations on agent_communications" ON agent_communications
  FOR ALL USING (true) WITH CHECK (true);

-- System logs policies
CREATE POLICY "Allow all operations on system_logs" ON system_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Users policies
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Organizations policies
CREATE POLICY "Allow all operations on organizations" ON organizations
  FOR ALL USING (true) WITH CHECK (true);

-- Access logs policies
CREATE POLICY "Allow all operations on access_logs" ON access_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON agent_collaborations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at BEFORE UPDATE ON agent_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON agent_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installations_updated_at BEFORE UPDATE ON agent_installations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON agent_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_executions_updated_at BEFORE UPDATE ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default organization first
INSERT INTO organizations (name, description, created_by) VALUES
('Default Organization', 'Default organization for ChimeraGPT', 'system');

-- Insert default admin user
INSERT INTO users (email, name, role, organization_id) 
SELECT 'admin@chimeragpt.com', 'System Administrator', 'super_admin', id 
FROM organizations WHERE name = 'Default Organization';

-- Insert default agent templates
INSERT INTO agent_templates (name, description, type, category, capabilities, default_configuration, is_public, is_verified, documentation) VALUES
('Code Review Agent', 'Automated code review with security, performance, and best practices analysis', 'code_review', 'Development', 
 ARRAY['security_analysis', 'performance_analysis', 'best_practices_check', 'code_quality_assessment'], 
 '{"rules": {"security": ["no-eval", "no-dangerous-html"], "performance": ["no-inefficient-loops"], "style": ["consistent-naming"]}, "severity_levels": ["error", "warning", "info"]}', 
 true, true, 'Comprehensive code review agent that analyzes code for security vulnerabilities, performance issues, and adherence to best practices.'),

('Documentation Agent', 'Automatic documentation generation for code and APIs', 'documentation', 'Development',
 ARRAY['readme_generation', 'api_documentation', 'code_comments'],
 '{"output_format": "markdown", "include_examples": true, "include_installation": true}',
 true, true, 'Generates comprehensive documentation including README files, API documentation, and code comments.'),

('Testing Agent', 'Automated test generation and execution', 'testing', 'Quality Assurance',
 ARRAY['unit_test_generation', 'integration_test_generation', 'test_coverage_analysis'],
 '{"test_framework": "jest", "coverage_threshold": 80, "generate_mocks": true}',
 true, true, 'Generates unit tests, integration tests, and analyzes test coverage for your codebase.'),

('Deployment Agent', 'CI/CD and deployment automation', 'deployment', 'DevOps',
 ARRAY['ci_cd_setup', 'containerization', 'cloud_deployment'],
 '{"platform": "vercel", "environment": "production", "auto_deploy": false}',
 true, true, 'Handles deployment processes including CI/CD setup, containerization, and cloud deployment.'),

('Performance Agent', 'Performance analysis and optimization', 'performance', 'Optimization',
 ARRAY['performance_analysis', 'optimization_suggestions', 'monitoring_setup'],
 '{"metrics": ["response_time", "memory_usage", "cpu_usage"], "thresholds": {"response_time": 200}}',
 true, true, 'Analyzes application performance and provides optimization recommendations.'),

('Security Agent', 'Security scanning and compliance checking', 'security', 'Security',
 ARRAY['vulnerability_scanning', 'dependency_audit', 'compliance_checking'],
 '{"compliance_standards": ["OWASP", "SOC2"], "scan_dependencies": true, "check_secrets": true}',
 true, true, 'Performs security scans, vulnerability assessments, and compliance checking.');

COMMIT;