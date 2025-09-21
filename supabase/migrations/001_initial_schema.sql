-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE user_status AS ENUM ('online', 'away', 'busy', 'offline');
CREATE TYPE channel_type AS ENUM ('general', 'project', 'private');
CREATE TYPE message_type AS ENUM ('text', 'file', 'code', 'system');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'paused', 'archived');
CREATE TYPE analysis_status AS ENUM ('pending', 'analyzing', 'completed', 'failed');
CREATE TYPE agent_type AS ENUM ('security', 'performance', 'architecture', 'quality', 'dependencies');
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE metric_type AS ENUM ('repository_analysis', 'team_activity', 'workflow_performance', 'code_quality');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'member',
    status user_status DEFAULT 'offline',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{
        "is_public": false,
        "allow_invites": true,
        "default_role": "member",
        "notifications": {
            "mentions": true,
            "messages": true,
            "projects": true
        }
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members table
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Channels table
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type channel_type DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Channel members table
CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    reactions JSONB DEFAULT '[]',
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'active',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members table
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Repositories table
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    language TEXT,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    last_analyzed TIMESTAMPTZ,
    analysis_status analysis_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repository analyses table
CREATE TABLE repository_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    agent_type agent_type NOT NULL,
    status execution_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    results JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent workflows table
CREATE TABLE agent_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    status workflow_status DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions table
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    status execution_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    results JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics data table
CREATE TABLE analytics_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    metric_type metric_type NOT NULL,
    metric_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_repositories_project_id ON repositories(project_id);
CREATE INDEX idx_repository_analyses_repository_id ON repository_analyses(repository_id);
CREATE INDEX idx_repository_analyses_agent_type ON repository_analyses(agent_type);
CREATE INDEX idx_agent_workflows_workspace_id ON agent_workflows(workspace_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_analytics_data_workspace_id ON analytics_data(workspace_id);
CREATE INDEX idx_analytics_data_metric_type ON analytics_data(metric_type);
CREATE INDEX idx_analytics_data_timestamp ON analytics_data(timestamp);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channel_members_updated_at BEFORE UPDATE ON channel_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON project_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repository_analyses_updated_at BEFORE UPDATE ON repository_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_workflows_updated_at BEFORE UPDATE ON agent_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON workflow_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view profiles of workspace members" ON users FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm1
        JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
        WHERE wm1.user_id = auth.uid() AND wm2.user_id = users.id
    )
);

-- Workspaces policies
CREATE POLICY "Users can view workspaces they are members of" ON workspaces FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
);
CREATE POLICY "Workspace owners can update their workspaces" ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view workspace members of their workspaces" ON workspace_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
    )
);
CREATE POLICY "Workspace owners and admins can manage members" ON workspace_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        JOIN workspaces w ON wm.workspace_id = w.id
        WHERE wm.workspace_id = workspace_members.workspace_id 
        AND wm.user_id = auth.uid() 
        AND (wm.role IN ('owner', 'admin') OR w.owner_id = auth.uid())
    )
);

-- Channels policies
CREATE POLICY "Users can view channels in their workspaces" ON channels FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()
    )
);
CREATE POLICY "Workspace members can create channels" ON channels FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()
    ) AND created_by = auth.uid()
);

-- Messages policies
CREATE POLICY "Users can view messages in channels they have access to" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM channels c
        JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
        WHERE c.id = messages.channel_id AND wm.user_id = auth.uid()
    )
);
CREATE POLICY "Users can send messages to channels they have access to" ON messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM channels c
        JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
        WHERE c.id = messages.channel_id AND wm.user_id = auth.uid()
    ) AND sender_id = auth.uid()
);
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (sender_id = auth.uid());

-- Projects policies
CREATE POLICY "Users can view projects in their workspaces" ON projects FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()
    )
);
CREATE POLICY "Workspace members can create projects" ON projects FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()
    ) AND created_by = auth.uid()
);

-- Repositories policies
CREATE POLICY "Users can view repositories in projects they have access to" ON repositories FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
        WHERE p.id = repositories.project_id AND wm.user_id = auth.uid()
    )
);

-- Repository analyses policies
CREATE POLICY "Users can view analyses for repositories they have access to" ON repository_analyses FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM repositories r
        JOIN projects p ON r.project_id = p.id
        JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
        WHERE r.id = repository_analyses.repository_id AND wm.user_id = auth.uid()
    )
);

-- Analytics data policies
CREATE POLICY "Users can view analytics for their workspaces" ON analytics_data FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = analytics_data.workspace_id AND user_id = auth.uid()
    )
);

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon users (for public access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON workspaces TO anon;