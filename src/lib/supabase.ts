import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Export createClient function for components
export const createClient = () => createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Export singleton instance
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'online' | 'away' | 'busy' | 'offline';
  last_active: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  settings: {
    is_public: boolean;
    allow_invites: boolean;
    default_role: 'member' | 'viewer';
    notifications: {
      mentions: boolean;
      messages: boolean;
      projects: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: 'general' | 'project' | 'private';
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'file' | 'code' | 'system';
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
  reactions?: {
    emoji: string;
    users: string[];
  }[];
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  progress: number;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'lead' | 'member' | 'viewer';
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  project_id: string;
  name: string;
  url: string;
  description?: string;
  language: string;
  stars: number;
  forks: number;
  last_analyzed: string;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface RepositoryAnalysis {
  id: string;
  repository_id: string;
  agent_type: 'security' | 'performance' | 'architecture' | 'quality' | 'dependencies';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: {
    score: number;
    issues: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      file?: string;
      line?: number;
      suggestion?: string;
    }[];
    metrics: Record<string, number>;
    recommendations: string[];
  };
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  config: {
    agents: {
      type: string;
      config: Record<string, any>;
    }[];
    triggers: {
      type: 'manual' | 'schedule' | 'webhook' | 'repository_update';
      config: Record<string, any>;
    }[];
    steps: {
      id: string;
      type: string;
      config: Record<string, any>;
      dependencies: string[];
    }[];
  };
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results?: Record<string, any>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsData {
  id: string;
  workspace_id: string;
  metric_type: 'repository_analysis' | 'team_activity' | 'workflow_performance' | 'code_quality';
  metric_name: string;
  value: number;
  metadata?: Record<string, any>;
  timestamp: string;
  created_at: string;
}

// Helper functions for Supabase operations
export const supabaseHelpers = {
  // User operations
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as User;
  },

  // Workspace operations
  async getWorkspaces(userId: string) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name,
          description,
          owner_id,
          settings,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  },

  async getWorkspaceMembers(workspaceId: string) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        *,
        users (
          id,
          email,
          name,
          avatar_url,
          status,
          last_active
        )
      `)
      .eq('workspace_id', workspaceId);
    
    if (error) throw error;
    return data;
  },

  // Channel operations
  async getChannels(workspaceId: string) {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as Channel[];
  },

  async getMessages(channelId: string, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Project operations
  async getProjects(workspaceId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Project[];
  },

  // Repository operations
  async getRepositories(projectId: string) {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Repository[];
  },

  async getRepositoryAnalyses(repositoryId: string) {
    const { data, error } = await supabase
      .from('repository_analyses')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as RepositoryAnalysis[];
  },

  // Analytics operations
  async getAnalyticsData(workspaceId: string, metricType?: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('analytics_data')
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (metricType) {
      query = query.eq('metric_type', metricType);
    }
    
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }
    
    const { data, error } = await query.order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data as AnalyticsData[];
  },

  // Real-time subscriptions
  subscribeToMessages(channelId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToAnalyses(repositoryId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`analyses:${repositoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repository_analyses',
          filter: `repository_id=eq.${repositoryId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToWorkflowExecutions(workflowId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`executions:${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_executions',
          filter: `workflow_id=eq.${workflowId}`,
        },
        callback
      )
      .subscribe();
  }
};