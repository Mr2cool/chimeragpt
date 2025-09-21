-- ChimeraGPT Database Schema
-- Drop existing unrelated tables if they exist
DROP TABLE IF EXISTS portfolio_holdings CASCADE;
DROP TABLE IF EXISTS trading_pairs CASCADE;
DROP TABLE IF EXISTS market_data CASCADE;
DROP TABLE IF EXISTS agent_sessions CASCADE;
DROP TABLE IF EXISTS compliance_records CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS compliance_rules CASCADE;
DROP TABLE IF EXISTS agent_configurations CASCADE;
DROP TABLE IF EXISTS system_health CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS tool_registry CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tool_executions CASCADE;
DROP TABLE IF EXISTS execution_logs CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS clinical_notes CASCADE;
DROP TABLE IF EXISTS extractions CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS diagnoses CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- Create teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_url TEXT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    last_analyzed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analyses table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    configuration JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create insights table
CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    configuration JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create executions table
CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    input_data JSONB,
    output_data JSONB,
    metrics JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_repository_id ON analyses(repository_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_insights_analysis_id ON insights(analysis_id);
CREATE INDEX idx_insights_agent_type ON insights(agent_type);
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_repositories_github_url ON repositories(github_url);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Teams policies
CREATE POLICY "Users can view teams they belong to" ON teams
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" ON teams
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams" ON teams
    FOR UPDATE USING (owner_id = auth.uid());

-- Repositories policies
CREATE POLICY "Anyone can view repositories" ON repositories
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create repositories" ON repositories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Analyses policies
CREATE POLICY "Users can view their own analyses" ON analyses
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create analyses" ON analyses
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analyses" ON analyses
    FOR UPDATE USING (user_id = auth.uid());

-- Insights policies
CREATE POLICY "Users can view insights from their analyses" ON insights
    FOR SELECT USING (
        analysis_id IN (
            SELECT id FROM analyses WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create insights" ON insights
    FOR INSERT WITH CHECK (true);

-- Workflows policies
CREATE POLICY "Users can view their own workflows" ON workflows
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create workflows" ON workflows
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workflows" ON workflows
    FOR UPDATE USING (user_id = auth.uid());

-- Agents policies
CREATE POLICY "Anyone can view active agents" ON agents
    FOR SELECT USING (is_active = true);

CREATE POLICY "System can manage agents" ON agents
    FOR ALL WITH CHECK (true);

-- Executions policies
CREATE POLICY "Users can view executions from their workflows" ON executions
    FOR SELECT USING (
        workflow_id IN (
            SELECT id FROM workflows WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create executions" ON executions
    FOR INSERT WITH CHECK (true);

-- Grant permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON teams TO authenticated;
GRANT SELECT ON teams TO anon;

GRANT SELECT, INSERT, UPDATE ON repositories TO authenticated;
GRANT SELECT ON repositories TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT ON workspaces TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON analyses TO authenticated;
GRANT SELECT ON analyses TO anon;

GRANT SELECT, INSERT ON insights TO authenticated;
GRANT SELECT ON insights TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON workflows TO authenticated;
GRANT SELECT ON workflows TO anon;

GRANT SELECT ON agents TO authenticated;
GRANT SELECT ON agents TO anon;

GRANT SELECT, INSERT, UPDATE ON executions TO authenticated;
GRANT SELECT ON executions TO anon;

-- Insert default agents
INSERT INTO agents (name, type, configuration) VALUES
('Repository Analyzer', 'repo-analyzer', '{"model": "gemini-1.5-pro", "temperature": 0.3}'),
('Security Auditor', 'security-auditor', '{"model": "gemini-1.5-pro", "temperature": 0.1}'),
('Architecture Reviewer', 'architecture-reviewer', '{"model": "gemini-1.5-pro", "temperature": 0.2}'),
('Code Quality Assessor', 'code-quality', '{"model": "gemini-1.5-pro", "temperature": 0.3}'),
('Performance Analyzer', 'performance-analyzer', '{"model": "gemini-1.5-pro", "temperature": 0.2}'),
('Documentation Generator', 'doc-generator', '{"model": "gemini-1.5-pro", "temperature": 0.4}');