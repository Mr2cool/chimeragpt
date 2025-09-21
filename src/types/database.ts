export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          settings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          settings?: Json
          created_at?: string
        }
      }
      repositories: {
        Row: {
          id: string
          github_url: string
          name: string
          full_name: string
          metadata: Json
          last_analyzed: string | null
          created_at: string
        }
        Insert: {
          id?: string
          github_url: string
          name: string
          full_name: string
          metadata?: Json
          last_analyzed?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          github_url?: string
          name?: string
          full_name?: string
          metadata?: Json
          last_analyzed?: string | null
          created_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          team_id: string | null
          name: string
          description: string | null
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          name: string
          description?: string | null
          settings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          name?: string
          description?: string | null
          settings?: Json
          created_at?: string
        }
      }
      analyses: {
        Row: {
          id: string
          user_id: string
          repository_id: string
          workspace_id: string | null
          status: 'pending' | 'running' | 'completed' | 'failed'
          configuration: Json
          results: Json
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          repository_id: string
          workspace_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          configuration?: Json
          results?: Json
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          repository_id?: string
          workspace_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          configuration?: Json
          results?: Json
          started_at?: string
          completed_at?: string | null
        }
      }
      insights: {
        Row: {
          id: string
          analysis_id: string
          agent_type: string
          category: string
          data: Json
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          agent_type: string
          category: string
          data: Json
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          agent_type?: string
          category?: string
          data?: Json
          confidence_score?: number | null
          created_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          definition: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          definition: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          definition?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          name: string
          type: string
          version: string
          configuration: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          version?: string
          configuration?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          version?: string
          configuration?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      executions: {
        Row: {
          id: string
          workflow_id: string
          agent_id: string
          status: 'queued' | 'running' | 'completed' | 'failed'
          input_data: Json | null
          output_data: Json | null
          metrics: Json
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workflow_id: string
          agent_id: string
          status?: 'queued' | 'running' | 'completed' | 'failed'
          input_data?: Json | null
          output_data?: Json | null
          metrics?: Json
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          workflow_id?: string
          agent_id?: string
          status?: 'queued' | 'running' | 'completed' | 'failed'
          input_data?: Json | null
          output_data?: Json | null
          metrics?: Json
          started_at?: string
          completed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}