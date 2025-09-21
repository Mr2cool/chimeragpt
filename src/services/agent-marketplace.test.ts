import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentMarketplaceService } from './agent-marketplace';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  rpc: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

const mockTemplate = {
  id: 'template-1',
  name: 'Test Template',
  description: 'A test template for unit testing',
  category: 'testing',
  version: '1.0.0',
  author: 'test-author',
  tags: ['test', 'automation'],
  capabilities: ['code-analysis', 'testing'],
  configuration_schema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
      timeout: { type: 'number' },
    },
  },
  default_config: {
    timeout: 30000,
  },
  code_template: 'class TestAgent extends BaseAgent {}',
  dependencies: ['@types/node'],
  pricing: {
    type: 'free',
    amount: 0,
  },
  rating: 4.5,
  download_count: 100,
  status: 'published',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCustomAgent = {
  id: 'agent-1',
  name: 'Test Custom Agent',
  description: 'A custom agent for testing',
  template_id: 'template-1',
  owner_id: 'user-1',
  configuration: {
    apiKey: 'test-key',
    timeout: 60000,
  },
  status: 'inactive',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAgentInstance = {
  id: 'instance-1',
  custom_agent_id: 'agent-1',
  status: 'running',
  health_status: 'healthy',
  metrics: {
    uptime: 3600,
    tasks_completed: 10,
    tasks_failed: 1,
    memory_usage: 256,
    cpu_usage: 15.5,
    last_activity: '2024-01-01T01:00:00Z',
  },
  logs: [],
  created_at: '2024-01-01T00:00:00Z',
  started_at: '2024-01-01T00:00:00Z',
};

const mockReview = {
  id: 'review-1',
  template_id: 'template-1',
  user_id: 'user-1',
  rating: 5,
  comment: 'Excellent template!',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('AgentMarketplaceService', () => {
  let service: AgentMarketplaceService;

  beforeEach(() => {
    service = new AgentMarketplaceService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Template Management', () => {
    it('should create a new template successfully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }));

      const templateData = {
        name: 'Test Template',
        description: 'A test template',
        category: 'testing',
        version: '1.0.0',
        author: 'test-author',
        tags: ['test'],
        capabilities: ['testing'],
        configuration_schema: {},
        default_config: {},
        code_template: 'class TestAgent {}',
        dependencies: [],
        pricing: { type: 'free' as const, amount: 0 },
        status: 'draft' as const,
      };

      const result = await service.createTemplate(templateData);

      expect(result).toBe('template-1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_templates');
    });

    it('should handle template creation errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      }));

      const templateData = {
        name: 'Test Template',
        description: 'A test template',
        category: 'testing',
        version: '1.0.0',
        author: 'test-author',
        tags: ['test'],
        capabilities: ['testing'],
        configuration_schema: {},
        default_config: {},
        code_template: 'class TestAgent {}',
        dependencies: [],
        pricing: { type: 'free' as const, amount: 0 },
        status: 'draft' as const,
      };

      await expect(service.createTemplate(templateData)).rejects.toThrow('Database error');
    });

    it('should get template by id', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }));

      const result = await service.getTemplate('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_templates');
    });

    it('should return null for non-existent template', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }));

      const result = await service.getTemplate('non-existent');

      expect(result).toBeNull();
    });

    it('should search templates with filters', async () => {
      const templates = [mockTemplate, { ...mockTemplate, id: 'template-2' }];
      
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: templates, error: null, count: 2 }),
      }));

      const result = await service.searchTemplates({
        query: 'test',
        category: 'testing',
        tags: ['test'],
        minRating: 4.0,
        sortBy: 'rating',
        limit: 10,
      });

      expect(result.templates).toEqual(templates);
      expect(result.total).toBe(2);
    });

    it('should update template with ownership verification', async () => {
      // Mock getTemplate to return template with correct author
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'agent_templates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return {};
      });

      await service.updateTemplate('template-1', { description: 'Updated description' }, 'test-author');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_templates');
    });

    it('should reject template update for non-owner', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }));

      await expect(
        service.updateTemplate('template-1', { description: 'Updated' }, 'wrong-author')
      ).rejects.toThrow('Access denied: Not the template author');
    });

    it('should publish template', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
        update: vi.fn().mockReturnThis(),
      }));

      await service.publishTemplate('template-1', 'test-author');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_templates');
    });

    it('should increment download count', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      await service.incrementDownloadCount('template-1');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('increment_download_count', {
        template_id: 'template-1',
      });
    });
  });

  describe('Custom Agent Management', () => {
    it('should create custom agent with valid configuration', async () => {
      // Mock getTemplate
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'agent_templates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
          };
        }
        if (table === 'custom_agents') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
          };
        }
        return {};
      });

      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const agentData = {
        name: 'Test Custom Agent',
        description: 'A custom agent',
        template_id: 'template-1',
        owner_id: 'user-1',
        configuration: { apiKey: 'test-key' },
        status: 'inactive' as const,
      };

      const result = await service.createCustomAgent(agentData);

      expect(result).toBe('agent-1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('custom_agents');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('increment_download_count', {
        template_id: 'template-1',
      });
    });

    it('should reject custom agent creation for non-existent template', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }));

      const agentData = {
        name: 'Test Agent',
        description: 'Test',
        template_id: 'non-existent',
        owner_id: 'user-1',
        configuration: {},
        status: 'inactive' as const,
      };

      await expect(service.createCustomAgent(agentData)).rejects.toThrow('Template not found');
    });

    it('should get custom agent by id', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
      }));

      const result = await service.getCustomAgent('agent-1');

      expect(result).toEqual(mockCustomAgent);
    });

    it('should get user custom agents', async () => {
      const agents = [mockCustomAgent, { ...mockCustomAgent, id: 'agent-2' }];
      
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: agents, error: null }),
      }));

      const result = await service.getUserCustomAgents('user-1');

      expect(result).toEqual(agents);
    });

    it('should update custom agent with ownership verification', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'custom_agents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return {};
      });

      await service.updateCustomAgent('agent-1', { description: 'Updated' }, 'user-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('custom_agents');
    });

    it('should reject custom agent update for non-owner', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
      }));

      await expect(
        service.updateCustomAgent('agent-1', { description: 'Updated' }, 'wrong-user')
      ).rejects.toThrow('Access denied: Not the agent owner');
    });

    it('should delete custom agent with cleanup', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'custom_agents') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'agent_instances') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
          };
        }
        return {};
      });

      await service.deleteCustomAgent('agent-1', 'user-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('custom_agents');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_instances');
    });
  });

  describe('Agent Deployment', () => {
    it('should deploy agent successfully', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'custom_agents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'agent_templates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
          };
        }
        if (table === 'agent_instances') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAgentInstance, error: null }),
          };
        }
        return {};
      });

      // Mock private methods
      vi.spyOn(service as any, 'generateAgentCode').mockReturnValue('generated code');
      vi.spyOn(service as any, 'instantiateAgent').mockResolvedValue({ id: 'deployed-agent' });

      const result = await service.deployAgent('agent-1');

      expect(result).toBe('instance-1');
    });

    it('should handle deployment errors', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'custom_agents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
          };
        }
        if (table === 'agent_templates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
          };
        }
        if (table === 'agent_instances') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAgentInstance, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return {};
      });

      vi.spyOn(service as any, 'generateAgentCode').mockReturnValue('generated code');
      vi.spyOn(service as any, 'instantiateAgent').mockRejectedValue(new Error('Deployment failed'));

      await expect(service.deployAgent('agent-1')).rejects.toThrow('Deployment failed');
    });

    it('should stop agent and update status', async () => {
      const instances = [mockAgentInstance];
      
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'agent_instances') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'custom_agents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockCustomAgent, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return { data: instances };
      });

      // Mock deployed agent with stop method
      const mockDeployedAgent = { stop: vi.fn() };
      (service as any).deployedAgents.set('instance-1', mockDeployedAgent);

      await service.stopAgent('agent-1');

      expect(mockDeployedAgent.stop).toHaveBeenCalled();
    });

    it('should get agent instances', async () => {
      const instances = [mockAgentInstance];
      
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: instances, error: null }),
      }));

      const result = await service.getAgentInstances('agent-1');

      expect(result).toEqual(instances);
    });

    it('should update instance metrics', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { metrics: { uptime: 3600, tasks_completed: 10 } }, 
          error: null 
        }),
        update: vi.fn().mockReturnThis(),
      }));

      const newMetrics = { tasks_completed: 15, memory_usage: 512 };
      
      await service.updateInstanceMetrics('instance-1', newMetrics);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_instances');
    });
  });

  describe('Reviews and Ratings', () => {
    it('should create review successfully', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockReview, error: null }),
      }));

      const reviewData = {
        template_id: 'template-1',
        user_id: 'user-1',
        rating: 5,
        comment: 'Excellent template!',
      };

      const result = await service.createReview(reviewData);

      expect(result).toBe('review-1');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('marketplace_reviews');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(service.getTemplate('template-1')).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid configuration schema', async () => {
      const templateWithSchema = {
        ...mockTemplate,
        configuration_schema: {
          type: 'object',
          properties: {
            requiredField: { type: 'string' },
          },
          required: ['requiredField'],
        },
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'agent_templates') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: templateWithSchema, error: null }),
          };
        }
        return {};
      });

      // Mock validateConfiguration to return false
      vi.spyOn(service as any, 'validateConfiguration').mockReturnValue(false);

      const agentData = {
        name: 'Test Agent',
        description: 'Test',
        template_id: 'template-1',
        owner_id: 'user-1',
        configuration: {}, // Missing required field
        status: 'inactive' as const,
      };

      await expect(service.createCustomAgent(agentData)).rejects.toThrow('Invalid configuration');
    });
  });

  describe('Cache Management', () => {
    it('should use cached template when available', async () => {
      // First call - should hit database
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }));

      const result1 = await service.getTemplate('template-1');
      expect(result1).toEqual(mockTemplate);

      // Clear mock call history
      vi.clearAllMocks();

      // Second call - should use cache
      const result2 = await service.getTemplate('template-1');
      expect(result2).toEqual(mockTemplate);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should clear cache on template update', async () => {
      // First, populate cache
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
        update: vi.fn().mockReturnThis(),
      }));

      await service.getTemplate('template-1');
      await service.updateTemplate('template-1', { description: 'Updated' }, 'test-author');

      // Cache should be cleared, so next call should hit database
      vi.clearAllMocks();
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }));

      await service.getTemplate('template-1');
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });
});