import { createClient } from '@supabase/supabase-js';
import { BaseAgent } from '../ai/agents/base-agent';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  tags: string[];
  capabilities: string[];
  configuration_schema: any; // JSON Schema
  default_config: any;
  code_template: string;
  dependencies: string[];
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    price?: number;
    currency?: string;
    billing_period?: 'monthly' | 'yearly' | 'one-time';
  };
  rating: number;
  download_count: number;
  status: 'draft' | 'published' | 'deprecated';
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface CustomAgent {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  owner_id: string;
  configuration: any;
  custom_code?: string;
  status: 'active' | 'inactive' | 'error';
  version: string;
  created_at: string;
  updated_at: string;
  last_deployed?: string;
}

interface AgentInstance {
  id: string;
  custom_agent_id: string;
  status: 'running' | 'stopped' | 'error';
  health_status: 'healthy' | 'warning' | 'critical';
  metrics: {
    uptime: number;
    tasks_completed: number;
    tasks_failed: number;
    memory_usage: number;
    cpu_usage: number;
    last_activity: string;
  };
  logs: string[];
  created_at: string;
  started_at?: string;
  stopped_at?: string;
}

interface MarketplaceReview {
  id: string;
  template_id: string;
  user_id: string;
  rating: number; // 1-5
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentCollection {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  template_ids: string[];
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

class AgentMarketplaceService {
  private supabase: any;
  private deployedAgents: Map<string, any> = new Map();
  private templateCache: Map<string, AgentTemplate> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Template Management
  async createTemplate(
    templateData: Omit<AgentTemplate, 'id' | 'rating' | 'download_count' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const template: Omit<AgentTemplate, 'id'> = {
      ...templateData,
      rating: 0,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('agent_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;

    this.templateCache.set(data.id, data);
    return data.id;
  }

  async getTemplate(templateId: string): Promise<AgentTemplate | null> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    const { data, error } = await this.supabase
      .from('agent_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !data) return null;

    this.templateCache.set(templateId, data);
    return data;
  }

  async searchTemplates(options: {
    query?: string;
    category?: string;
    tags?: string[];
    author?: string;
    pricing?: 'free' | 'paid';
    minRating?: number;
    sortBy?: 'rating' | 'downloads' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: AgentTemplate[]; total: number }> {
    let query = this.supabase
      .from('agent_templates')
      .select('*', { count: 'exact' })
      .eq('status', 'published');

    if (options.query) {
      query = query.or(`name.ilike.%${options.query}%,description.ilike.%${options.query}%`);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    if (options.author) {
      query = query.eq('author', options.author);
    }

    if (options.pricing) {
      query = query.eq('pricing->>type', options.pricing);
    }

    if (options.minRating) {
      query = query.gte('rating', options.minRating);
    }

    const sortBy = options.sortBy || 'rating';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      templates: data || [],
      total: count || 0
    };
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<AgentTemplate>,
    authorId: string
  ): Promise<void> {
    // Verify ownership
    const template = await this.getTemplate(templateId);
    if (!template || template.author !== authorId) {
      throw new Error('Access denied: Not the template author');
    }

    const { error } = await this.supabase
      .from('agent_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);

    if (error) throw error;

    // Update cache
    this.templateCache.delete(templateId);
  }

  async publishTemplate(templateId: string, authorId: string): Promise<void> {
    await this.updateTemplate(templateId, {
      status: 'published',
      published_at: new Date().toISOString()
    }, authorId);
  }

  async incrementDownloadCount(templateId: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('increment_download_count', { template_id: templateId });

    if (error) throw error;

    // Update cache
    this.templateCache.delete(templateId);
  }

  // Custom Agent Management
  async createCustomAgent(
    agentData: Omit<CustomAgent, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    // Validate template exists
    const template = await this.getTemplate(agentData.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate configuration against schema
    if (template.configuration_schema) {
      const isValid = this.validateConfiguration(agentData.configuration, template.configuration_schema);
      if (!isValid) {
        throw new Error('Invalid configuration');
      }
    }

    const customAgent: Omit<CustomAgent, 'id'> = {
      ...agentData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('custom_agents')
      .insert(customAgent)
      .select()
      .single();

    if (error) throw error;

    // Increment download count
    await this.incrementDownloadCount(agentData.template_id);

    return data.id;
  }

  async getCustomAgent(agentId: string): Promise<CustomAgent | null> {
    const { data, error } = await this.supabase
      .from('custom_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getUserCustomAgents(userId: string): Promise<CustomAgent[]> {
    const { data, error } = await this.supabase
      .from('custom_agents')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateCustomAgent(
    agentId: string,
    updates: Partial<CustomAgent>,
    ownerId: string
  ): Promise<void> {
    // Verify ownership
    const agent = await this.getCustomAgent(agentId);
    if (!agent || agent.owner_id !== ownerId) {
      throw new Error('Access denied: Not the agent owner');
    }

    const { error } = await this.supabase
      .from('custom_agents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (error) throw error;
  }

  async deleteCustomAgent(agentId: string, ownerId: string): Promise<void> {
    // Stop agent if running
    await this.stopAgent(agentId);

    // Verify ownership and delete
    const { error } = await this.supabase
      .from('custom_agents')
      .delete()
      .eq('id', agentId)
      .eq('owner_id', ownerId);

    if (error) throw error;

    // Clean up instances
    await this.supabase
      .from('agent_instances')
      .delete()
      .eq('custom_agent_id', agentId);
  }

  // Agent Deployment and Management
  async deployAgent(agentId: string): Promise<string> {
    const customAgent = await this.getCustomAgent(agentId);
    if (!customAgent) {
      throw new Error('Custom agent not found');
    }

    const template = await this.getTemplate(customAgent.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create agent instance
    const instance: Omit<AgentInstance, 'id'> = {
      custom_agent_id: agentId,
      status: 'running',
      health_status: 'healthy',
      metrics: {
        uptime: 0,
        tasks_completed: 0,
        tasks_failed: 0,
        memory_usage: 0,
        cpu_usage: 0,
        last_activity: new Date().toISOString()
      },
      logs: [],
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('agent_instances')
      .insert(instance)
      .select()
      .single();

    if (error) throw error;

    // Deploy the actual agent
    try {
      const agentCode = this.generateAgentCode(template, customAgent);
      const deployedAgent = await this.instantiateAgent(agentCode, customAgent.configuration);
      this.deployedAgents.set(data.id, deployedAgent);

      // Update custom agent status
      await this.updateCustomAgent(agentId, {
        status: 'active',
        last_deployed: new Date().toISOString()
      }, customAgent.owner_id);

      return data.id;
    } catch (deployError) {
      // Update instance status on failure
      await this.supabase
        .from('agent_instances')
        .update({
          status: 'error',
          health_status: 'critical'
        })
        .eq('id', data.id);

      throw deployError;
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    // Find running instances
    const { data: instances } = await this.supabase
      .from('agent_instances')
      .select('*')
      .eq('custom_agent_id', agentId)
      .eq('status', 'running');

    if (instances) {
      for (const instance of instances) {
        // Stop deployed agent
        const deployedAgent = this.deployedAgents.get(instance.id);
        if (deployedAgent && deployedAgent.stop) {
          await deployedAgent.stop();
        }
        this.deployedAgents.delete(instance.id);

        // Update instance status
        await this.supabase
          .from('agent_instances')
          .update({
            status: 'stopped',
            stopped_at: new Date().toISOString()
          })
          .eq('id', instance.id);
      }
    }

    // Update custom agent status
    const customAgent = await this.getCustomAgent(agentId);
    if (customAgent) {
      await this.updateCustomAgent(agentId, {
        status: 'inactive'
      }, customAgent.owner_id);
    }
  }

  async getAgentInstances(agentId: string): Promise<AgentInstance[]> {
    const { data, error } = await this.supabase
      .from('agent_instances')
      .select('*')
      .eq('custom_agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateInstanceMetrics(
    instanceId: string,
    metrics: Partial<AgentInstance['metrics']>
  ): Promise<void> {
    const { data: instance } = await this.supabase
      .from('agent_instances')
      .select('metrics')
      .eq('id', instanceId)
      .single();

    if (instance) {
      const updatedMetrics = { ...instance.metrics, ...metrics };
      
      await this.supabase
        .from('agent_instances')
        .update({ metrics: updatedMetrics })
        .eq('id', instanceId);
    }
  }

  // Reviews and Ratings
  async createReview(
    reviewData: Omit<MarketplaceReview, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const review: Omit<MarketplaceReview, 'id'> = {
      ...reviewData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('marketplace_reviews')
      .insert(review)
      .select()
      .single();

    if (error) throw error;

    // Update template rating
    await this.updateTemplateRating(reviewData.template_id);

    return data.id;
  }

  async getTemplateReviews(
    templateId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'rating' | 'created_at';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ reviews: MarketplaceReview[]; total: number }> {
    let query = this.supabase
      .from('marketplace_reviews')
      .select('*', { count: 'exact' })
      .eq('template_id', templateId);

    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      reviews: data || [],
      total: count || 0
    };
  }

  private async updateTemplateRating(templateId: string): Promise<void> {
    const { data } = await this.supabase
      .rpc('calculate_template_rating', { template_id: templateId });

    if (data) {
      await this.supabase
        .from('agent_templates')
        .update({ rating: data.average_rating })
        .eq('id', templateId);

      // Update cache
      this.templateCache.delete(templateId);
    }
  }

  // Collections
  async createCollection(
    collectionData: Omit<AgentCollection, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const collection: Omit<AgentCollection, 'id'> = {
      ...collectionData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('agent_collections')
      .insert(collection)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async getCollection(collectionId: string): Promise<AgentCollection | null> {
    const { data, error } = await this.supabase
      .from('agent_collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getUserCollections(userId: string): Promise<AgentCollection[]> {
    const { data, error } = await this.supabase
      .from('agent_collections')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async addTemplateToCollection(
    collectionId: string,
    templateId: string,
    ownerId: string
  ): Promise<void> {
    const collection = await this.getCollection(collectionId);
    if (!collection || collection.owner_id !== ownerId) {
      throw new Error('Access denied: Not the collection owner');
    }

    if (!collection.template_ids.includes(templateId)) {
      collection.template_ids.push(templateId);
      
      await this.supabase
        .from('agent_collections')
        .update({
          template_ids: collection.template_ids,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);
    }
  }

  // Utility Methods
  private validateConfiguration(config: any, schema: any): boolean {
    // Simple JSON schema validation
    // In a real implementation, use a proper JSON schema validator
    try {
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in config)) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  private generateAgentCode(template: AgentTemplate, customAgent: CustomAgent): string {
    let code = template.code_template;
    
    // Replace configuration placeholders
    const configStr = JSON.stringify(customAgent.configuration, null, 2);
    code = code.replace('{{CONFIG}}', configStr);
    
    // Add custom code if provided
    if (customAgent.custom_code) {
      code += '\n\n// Custom Code\n' + customAgent.custom_code;
    }
    
    return code;
  }

  private async instantiateAgent(code: string, config: any): Promise<any> {
    // In a real implementation, this would safely execute the agent code
    // For now, return a mock agent instance
    return {
      id: this.generateId(),
      config,
      status: 'running',
      stop: async () => {
        // Stop logic
      },
      executeTask: async (taskType: string, taskConfig: any) => {
        // Task execution logic
        return { success: true, result: 'Task completed' };
      }
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics
  async getMarketplaceAnalytics(): Promise<{
    totalTemplates: number;
    totalDownloads: number;
    totalCustomAgents: number;
    activeInstances: number;
    topCategories: { category: string; count: number }[];
    topAuthors: { author: string; downloads: number }[];
  }> {
    const [templatesData, agentsData, instancesData] = await Promise.all([
      this.supabase.from('agent_templates').select('category, download_count, author'),
      this.supabase.from('custom_agents').select('id'),
      this.supabase.from('agent_instances').select('status')
    ]);

    const templates = templatesData.data || [];
    const agents = agentsData.data || [];
    const instances = instancesData.data || [];

    // Calculate analytics
    const totalDownloads = templates.reduce((sum, t) => sum + (t.download_count || 0), 0);
    const activeInstances = instances.filter(i => i.status === 'running').length;

    // Top categories
    const categoryCount = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top authors
    const authorDownloads = templates.reduce((acc, t) => {
      acc[t.author] = (acc[t.author] || 0) + (t.download_count || 0);
      return acc;
    }, {} as Record<string, number>);
    
    const topAuthors = Object.entries(authorDownloads)
      .map(([author, downloads]) => ({ author, downloads }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5);

    return {
      totalTemplates: templates.length,
      totalDownloads,
      totalCustomAgents: agents.length,
      activeInstances,
      topCategories,
      topAuthors
    };
  }
}

export default AgentMarketplaceService;
export type {
  AgentTemplate,
  CustomAgent,
  AgentInstance,
  MarketplaceReview,
  AgentCollection
};