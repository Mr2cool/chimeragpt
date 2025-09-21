-- Additional tables for the agent system
-- This migration adds missing tables for the comprehensive agent system

-- Tasks table for agent task management
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  dependencies UUID[] DEFAULT '{}',
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent collaborations table
CREATE TABLE IF NOT EXISTS agent_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  target_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  collaboration_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed')),
  context JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent metrics table
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Agent templates table
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0.0',
  configuration JSONB NOT NULL DEFAULT '{}',
  capabilities TEXT[] DEFAULT '{}',
  requirements JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent installations table
CREATE TABLE IF NOT EXISTS agent_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  configuration JSONB DEFAULT '{}',
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent ratings table
CREATE TABLE IF NOT EXISTS agent_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table (extending existing workflows)
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent communications table
CREATE TABLE IF NOT EXISTS agent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  receiver_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  component VARCHAR(100),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'developer', 'viewer', 'agent_operator')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_collaborations_initiator ON agent_collaborations(initiator_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_collaborations_target ON agent_collaborations(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id ON agent_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_timestamp ON agent_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_public ON agent_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_agent_installations_template ON agent_installations(template_id);
CREATE INDEX IF NOT EXISTS idx_agent_installations_user ON agent_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_template ON agent_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_communications_sender ON agent_communications(sender_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_communications_receiver ON agent_communications(receiver_agent_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Tasks policies
CREATE POLICY "Users can view all tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete tasks" ON tasks FOR DELETE USING (true);

-- Agent collaborations policies
CREATE POLICY "Users can view all collaborations" ON agent_collaborations FOR SELECT USING (true);
CREATE POLICY "Users can insert collaborations" ON agent_collaborations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update collaborations" ON agent_collaborations FOR UPDATE USING (true);
CREATE POLICY "Users can delete collaborations" ON agent_collaborations FOR DELETE USING (true);

-- Agent metrics policies
CREATE POLICY "Users can view all metrics" ON agent_metrics FOR SELECT USING (true);
CREATE POLICY "Users can insert metrics" ON agent_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update metrics" ON agent_metrics FOR UPDATE USING (true);
CREATE POLICY "Users can delete metrics" ON agent_metrics FOR DELETE USING (true);

-- Agent templates policies
CREATE POLICY "Users can view public templates" ON agent_templates FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "Users can insert templates" ON agent_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own templates" ON agent_templates FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own templates" ON agent_templates FOR DELETE USING (auth.uid() = created_by);

-- Agent installations policies
CREATE POLICY "Users can view own installations" ON agent_installations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own installations" ON agent_installations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own installations" ON agent_installations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own installations" ON agent_installations FOR DELETE USING (auth.uid() = user_id);

-- Agent ratings policies
CREATE POLICY "Users can view all ratings" ON agent_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own ratings" ON agent_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON agent_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON agent_ratings FOR DELETE USING (auth.uid() = user_id);

-- Workflow executions policies
CREATE POLICY "Users can view all workflow executions" ON workflow_executions FOR SELECT USING (true);
CREATE POLICY "Users can insert workflow executions" ON workflow_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update workflow executions" ON workflow_executions FOR UPDATE USING (true);
CREATE POLICY "Users can delete workflow executions" ON workflow_executions FOR DELETE USING (true);

-- Agent communications policies
CREATE POLICY "Users can view all communications" ON agent_communications FOR SELECT USING (true);
CREATE POLICY "Users can insert communications" ON agent_communications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update communications" ON agent_communications FOR UPDATE USING (true);
CREATE POLICY "Users can delete communications" ON agent_communications FOR DELETE USING (true);

-- System logs policies
CREATE POLICY "Users can view all system logs" ON system_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert system logs" ON system_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update system logs" ON system_logs FOR UPDATE USING (true);
CREATE POLICY "Users can delete system logs" ON system_logs FOR DELETE USING (true);

-- Organizations policies
CREATE POLICY "Users can view all organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Users can insert organizations" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update organizations" ON organizations FOR UPDATE USING (true);
CREATE POLICY "Users can delete organizations" ON organizations FOR DELETE USING (true);

-- User roles policies
CREATE POLICY "Users can view all user roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert user roles" ON user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update user roles" ON user_roles FOR UPDATE USING (true);
CREATE POLICY "Users can delete user roles" ON user_roles FOR DELETE USING (true);

-- Access logs policies
CREATE POLICY "Users can view all access logs" ON access_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert access logs" ON access_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update access logs" ON access_logs FOR UPDATE USING (true);
CREATE POLICY "Users can delete access logs" ON access_logs FOR DELETE USING (true);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_collaborations_updated_at BEFORE UPDATE ON agent_collaborations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON workflow_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data
-- Default organization
INSERT INTO organizations (name, description, settings) VALUES 
('Default Organization', 'Default organization for ChimeraGPT', '{"features": ["agents", "workflows", "analytics"]}');

-- Default agent templates
INSERT INTO agent_templates (name, description, category, configuration, capabilities, requirements, is_public) VALUES 
('Code Review Agent', 'Automated code review and analysis', 'development', 
 '{"model": "gpt-4", "max_tokens": 2000, "temperature": 0.1}', 
 ARRAY['code_analysis', 'security_scan', 'performance_check'], 
 '{"languages": ["javascript", "typescript", "python", "java"]}', true),

('Documentation Agent', 'Automatic documentation generation', 'development', 
 '{"model": "gpt-4", "max_tokens": 3000, "temperature": 0.3}', 
 ARRAY['doc_generation', 'api_docs', 'readme_creation'], 
 '{"formats": ["markdown", "html", "pdf"]}', true),

('Testing Agent', 'Automated test generation and execution', 'testing', 
 '{"model": "gpt-4", "max_tokens": 2500, "temperature": 0.2}', 
 ARRAY['unit_tests', 'integration_tests', 'coverage_analysis'], 
 '{"frameworks": ["jest", "mocha", "pytest", "junit"]}', true),

('Deployment Agent', 'CI/CD and deployment automation', 'devops', 
 '{"model": "gpt-4", "max_tokens": 2000, "temperature": 0.1}', 
 ARRAY['ci_cd', 'containerization', 'cloud_deployment'], 
 '{"platforms": ["docker", "kubernetes", "aws", "vercel"]}', true),

('Performance Agent', 'Performance monitoring and optimization', 'monitoring', 
 '{"model": "gpt-4", "max_tokens": 2000, "temperature": 0.1}', 
 ARRAY['performance_analysis', 'optimization', 'monitoring'], 
 '{"metrics": ["response_time", "memory_usage", "cpu_usage"]}', true),

('Security Agent', 'Security scanning and compliance', 'security', 
 '{"model": "gpt-4", "max_tokens": 2000, "temperature": 0.1}', 
 ARRAY['vulnerability_scan', 'compliance_check', 'security_audit'], 
 '{"standards": ["owasp", "pci_dss", "gdpr"]}', true);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;