import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface CollaborationMessage {
  id: string;
  from_agent_id: string;
  to_agent_id?: string; // null for broadcast
  channel?: string;
  type: 'request' | 'response' | 'notification' | 'broadcast';
  content: any;
  metadata?: {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expires_at?: string;
    requires_response?: boolean;
    correlation_id?: string;
  };
  created_at: string;
  read_at?: string;
  responded_at?: string;
}

interface SharedResource {
  id: string;
  key: string;
  value: any;
  type: 'data' | 'file' | 'config' | 'state';
  owner_agent_id: string;
  permissions: {
    read: string[]; // agent IDs
    write: string[];
    delete: string[];
  };
  version: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  participants: string[]; // agent IDs
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  shared_context: any;
  created_at: string;
  updated_at: string;
}

interface AgentCapability {
  agent_id: string;
  capability: string;
  proficiency: number; // 0-100
  availability: boolean;
  cost_factor: number;
  metadata?: any;
}

interface CollaborationRequest {
  id: string;
  requester_agent_id: string;
  required_capabilities: string[];
  task_description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  budget?: number;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  matched_agents?: string[];
  created_at: string;
}

class AgentCollaborationService extends EventEmitter {
  private supabase: any;
  private activeSubscriptions: Map<string, any> = new Map();
  private messageHandlers: Map<string, Function> = new Map();
  private collaborationSessions: Map<string, CollaborationSession> = new Map();
  private agentCapabilities: Map<string, AgentCapability[]> = new Map();

  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.initializeRealtimeSubscriptions();
  }

  // Real-time Communication
  private initializeRealtimeSubscriptions() {
    // Subscribe to messages
    const messageSubscription = this.supabase
      .channel('agent_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'agent_messages' },
        (payload: any) => this.handleNewMessage(payload.new)
      )
      .subscribe();

    this.activeSubscriptions.set('messages', messageSubscription);

    // Subscribe to shared resource changes
    const resourceSubscription = this.supabase
      .channel('shared_resources')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'shared_resources' },
        (payload: any) => this.handleResourceChange(payload)
      )
      .subscribe();

    this.activeSubscriptions.set('resources', resourceSubscription);
  }

  private handleNewMessage(message: CollaborationMessage) {
    this.emit('message', message);
    
    // Handle specific message types
    switch (message.type) {
      case 'request':
        this.emit('collaboration_request', message);
        break;
      case 'response':
        this.emit('collaboration_response', message);
        break;
      case 'broadcast':
        this.emit('broadcast', message);
        break;
      case 'notification':
        this.emit('notification', message);
        break;
    }

    // Auto-respond to urgent messages if handler exists
    if (message.metadata?.priority === 'urgent') {
      const handler = this.messageHandlers.get(message.to_agent_id || '');
      if (handler) {
        handler(message);
      }
    }
  }

  private handleResourceChange(payload: any) {
    this.emit('resource_change', {
      event: payload.eventType,
      resource: payload.new || payload.old
    });
  }

  // Message Management
  async sendMessage(
    fromAgentId: string,
    toAgentId: string | null,
    content: any,
    options: {
      type?: 'request' | 'response' | 'notification' | 'broadcast';
      channel?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      requiresResponse?: boolean;
      expiresIn?: number; // minutes
      correlationId?: string;
    } = {}
  ): Promise<string> {
    const message: Omit<CollaborationMessage, 'id'> = {
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      channel: options.channel,
      type: options.type || 'notification',
      content,
      metadata: {
        priority: options.priority || 'medium',
        requires_response: options.requiresResponse || false,
        correlation_id: options.correlationId,
        expires_at: options.expiresIn ? 
          new Date(Date.now() + options.expiresIn * 60000).toISOString() : undefined
      },
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('agent_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async getMessages(
    agentId: string,
    options: {
      unreadOnly?: boolean;
      channel?: string;
      type?: string;
      limit?: number;
      since?: string;
    } = {}
  ): Promise<CollaborationMessage[]> {
    let query = this.supabase
      .from('agent_messages')
      .select('*')
      .or(`to_agent_id.eq.${agentId},to_agent_id.is.null`) // Include broadcasts
      .order('created_at', { ascending: false });

    if (options.unreadOnly) {
      query = query.is('read_at', null);
    }

    if (options.channel) {
      query = query.eq('channel', options.channel);
    }

    if (options.type) {
      query = query.eq('type', options.type);
    }

    if (options.since) {
      query = query.gte('created_at', options.since);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async markMessageAsRead(messageId: string, agentId: string): Promise<void> {
    await this.supabase
      .from('agent_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('to_agent_id', agentId);
  }

  async respondToMessage(
    originalMessageId: string,
    fromAgentId: string,
    response: any
  ): Promise<string> {
    // Get original message
    const { data: originalMessage } = await this.supabase
      .from('agent_messages')
      .select('*')
      .eq('id', originalMessageId)
      .single();

    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    // Send response
    const responseId = await this.sendMessage(
      fromAgentId,
      originalMessage.from_agent_id,
      response,
      {
        type: 'response',
        correlationId: originalMessage.metadata?.correlation_id || originalMessageId
      }
    );

    // Mark original message as responded
    await this.supabase
      .from('agent_messages')
      .update({ responded_at: new Date().toISOString() })
      .eq('id', originalMessageId);

    return responseId;
  }

  // Shared Resource Management
  async createSharedResource(
    key: string,
    value: any,
    ownerAgentId: string,
    options: {
      type?: 'data' | 'file' | 'config' | 'state';
      readPermissions?: string[];
      writePermissions?: string[];
      deletePermissions?: string[];
      expiresIn?: number; // minutes
    } = {}
  ): Promise<string> {
    const resource: Omit<SharedResource, 'id'> = {
      key,
      value,
      type: options.type || 'data',
      owner_agent_id: ownerAgentId,
      permissions: {
        read: options.readPermissions || [ownerAgentId],
        write: options.writePermissions || [ownerAgentId],
        delete: options.deletePermissions || [ownerAgentId]
      },
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: options.expiresIn ?
        new Date(Date.now() + options.expiresIn * 60000).toISOString() : undefined
    };

    const { data, error } = await this.supabase
      .from('shared_resources')
      .insert(resource)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async getSharedResource(
    key: string,
    agentId: string
  ): Promise<SharedResource | null> {
    const { data, error } = await this.supabase
      .from('shared_resources')
      .select('*')
      .eq('key', key)
      .single();

    if (error || !data) return null;

    // Check read permissions
    if (!data.permissions.read.includes(agentId) && data.owner_agent_id !== agentId) {
      throw new Error('Access denied: No read permission');
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.deleteSharedResource(key, data.owner_agent_id);
      return null;
    }

    return data;
  }

  async updateSharedResource(
    key: string,
    value: any,
    agentId: string
  ): Promise<void> {
    // Get current resource
    const { data: current } = await this.supabase
      .from('shared_resources')
      .select('*')
      .eq('key', key)
      .single();

    if (!current) {
      throw new Error('Resource not found');
    }

    // Check write permissions
    if (!current.permissions.write.includes(agentId) && current.owner_agent_id !== agentId) {
      throw new Error('Access denied: No write permission');
    }

    // Update resource
    await this.supabase
      .from('shared_resources')
      .update({
        value,
        version: current.version + 1,
        updated_at: new Date().toISOString()
      })
      .eq('key', key);
  }

  async deleteSharedResource(
    key: string,
    agentId: string
  ): Promise<void> {
    // Get current resource
    const { data: current } = await this.supabase
      .from('shared_resources')
      .select('*')
      .eq('key', key)
      .single();

    if (!current) return; // Already deleted

    // Check delete permissions
    if (!current.permissions.delete.includes(agentId) && current.owner_agent_id !== agentId) {
      throw new Error('Access denied: No delete permission');
    }

    await this.supabase
      .from('shared_resources')
      .delete()
      .eq('key', key);
  }

  async grantResourcePermission(
    key: string,
    targetAgentId: string,
    permission: 'read' | 'write' | 'delete',
    ownerAgentId: string
  ): Promise<void> {
    const { data: resource } = await this.supabase
      .from('shared_resources')
      .select('*')
      .eq('key', key)
      .single();

    if (!resource) {
      throw new Error('Resource not found');
    }

    if (resource.owner_agent_id !== ownerAgentId) {
      throw new Error('Access denied: Only owner can grant permissions');
    }

    const updatedPermissions = { ...resource.permissions };
    if (!updatedPermissions[permission].includes(targetAgentId)) {
      updatedPermissions[permission].push(targetAgentId);
    }

    await this.supabase
      .from('shared_resources')
      .update({ permissions: updatedPermissions })
      .eq('key', key);
  }

  // Collaboration Sessions
  async createCollaborationSession(
    name: string,
    participants: string[],
    options: {
      description?: string;
      sharedContext?: any;
    } = {}
  ): Promise<string> {
    const session: Omit<CollaborationSession, 'id'> = {
      name,
      description: options.description,
      participants,
      status: 'active',
      shared_context: options.sharedContext || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('collaboration_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;

    this.collaborationSessions.set(data.id, data);
    
    // Notify participants
    for (const participantId of participants) {
      await this.sendMessage(
        'system',
        participantId,
        {
          type: 'session_invitation',
          session_id: data.id,
          session_name: name
        },
        { type: 'notification', priority: 'medium' }
      );
    }

    return data.id;
  }

  async joinCollaborationSession(
    sessionId: string,
    agentId: string
  ): Promise<void> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.participants.includes(agentId)) {
      session.participants.push(agentId);
      session.updated_at = new Date().toISOString();

      await this.supabase
        .from('collaboration_sessions')
        .update({
          participants: session.participants,
          updated_at: session.updated_at
        })
        .eq('id', sessionId);

      // Notify other participants
      for (const participantId of session.participants) {
        if (participantId !== agentId) {
          await this.sendMessage(
            'system',
            participantId,
            {
              type: 'agent_joined',
              session_id: sessionId,
              agent_id: agentId
            },
            { type: 'notification' }
          );
        }
      }
    }
  }

  async updateSessionContext(
    sessionId: string,
    context: any,
    agentId: string
  ): Promise<void> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.participants.includes(agentId)) {
      throw new Error('Access denied: Not a session participant');
    }

    session.shared_context = { ...session.shared_context, ...context };
    session.updated_at = new Date().toISOString();

    await this.supabase
      .from('collaboration_sessions')
      .update({
        shared_context: session.shared_context,
        updated_at: session.updated_at
      })
      .eq('id', sessionId);
  }

  // Agent Capability Management
  async registerCapability(
    agentId: string,
    capability: string,
    proficiency: number,
    options: {
      availability?: boolean;
      costFactor?: number;
      metadata?: any;
    } = {}
  ): Promise<void> {
    const capabilityData: AgentCapability = {
      agent_id: agentId,
      capability,
      proficiency: Math.max(0, Math.min(100, proficiency)),
      availability: options.availability !== false,
      cost_factor: options.costFactor || 1.0,
      metadata: options.metadata
    };

    await this.supabase
      .from('agent_capabilities')
      .upsert(capabilityData, {
        onConflict: 'agent_id,capability'
      });

    // Update local cache
    const agentCapabilities = this.agentCapabilities.get(agentId) || [];
    const existingIndex = agentCapabilities.findIndex(c => c.capability === capability);
    
    if (existingIndex >= 0) {
      agentCapabilities[existingIndex] = capabilityData;
    } else {
      agentCapabilities.push(capabilityData);
    }
    
    this.agentCapabilities.set(agentId, agentCapabilities);
  }

  async findAgentsWithCapability(
    capability: string,
    options: {
      minProficiency?: number;
      availableOnly?: boolean;
      maxCostFactor?: number;
      limit?: number;
    } = {}
  ): Promise<AgentCapability[]> {
    let query = this.supabase
      .from('agent_capabilities')
      .select('*')
      .eq('capability', capability);

    if (options.minProficiency !== undefined) {
      query = query.gte('proficiency', options.minProficiency);
    }

    if (options.availableOnly) {
      query = query.eq('availability', true);
    }

    if (options.maxCostFactor !== undefined) {
      query = query.lte('cost_factor', options.maxCostFactor);
    }

    query = query.order('proficiency', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Collaboration Request System
  async createCollaborationRequest(
    requesterAgentId: string,
    requiredCapabilities: string[],
    taskDescription: string,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      deadline?: Date;
      budget?: number;
    } = {}
  ): Promise<string> {
    const request: Omit<CollaborationRequest, 'id'> = {
      requester_agent_id: requesterAgentId,
      required_capabilities: requiredCapabilities,
      task_description: taskDescription,
      priority: options.priority || 'medium',
      deadline: options.deadline?.toISOString(),
      budget: options.budget,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('collaboration_requests')
      .insert(request)
      .select()
      .single();

    if (error) throw error;

    // Auto-match agents
    await this.matchCollaborationRequest(data.id);

    return data.id;
  }

  private async matchCollaborationRequest(requestId: string): Promise<void> {
    const { data: request } = await this.supabase
      .from('collaboration_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request || request.status !== 'pending') return;

    const matchedAgents: string[] = [];

    // Find agents for each required capability
    for (const capability of request.required_capabilities) {
      const agents = await this.findAgentsWithCapability(capability, {
        minProficiency: 70,
        availableOnly: true,
        limit: 3
      });

      if (agents.length > 0) {
        matchedAgents.push(agents[0].agent_id);
      }
    }

    if (matchedAgents.length > 0) {
      await this.supabase
        .from('collaboration_requests')
        .update({
          status: 'matched',
          matched_agents: matchedAgents
        })
        .eq('id', requestId);

      // Notify matched agents
      for (const agentId of matchedAgents) {
        await this.sendMessage(
          'system',
          agentId,
          {
            type: 'collaboration_match',
            request_id: requestId,
            task_description: request.task_description,
            priority: request.priority
          },
          { type: 'request', priority: request.priority }
        );
      }
    }
  }

  // Event Handlers
  registerMessageHandler(agentId: string, handler: Function): void {
    this.messageHandlers.set(agentId, handler);
  }

  unregisterMessageHandler(agentId: string): void {
    this.messageHandlers.delete(agentId);
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Unsubscribe from all real-time subscriptions
    for (const [name, subscription] of this.activeSubscriptions) {
      await subscription.unsubscribe();
    }
    this.activeSubscriptions.clear();

    // Clear handlers
    this.messageHandlers.clear();
    this.collaborationSessions.clear();
    this.agentCapabilities.clear();

    // Remove all event listeners
    this.removeAllListeners();
  }
}

export default AgentCollaborationService;
export type {
  CollaborationMessage,
  SharedResource,
  CollaborationSession,
  AgentCapability,
  CollaborationRequest
};