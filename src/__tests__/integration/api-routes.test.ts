import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Import API handlers
import agentsHandler from '../../pages/api/agents';
import tasksHandler from '../../pages/api/tasks';
import marketplaceHandler from '../../pages/api/marketplace/templates';
import analyticsHandler from '../../pages/api/analytics';
import workflowsHandler from '../../pages/api/workflows';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn()
  })),
  auth: {
    getUser: vi.fn()
  },
  rpc: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    OPENAI_API_KEY: 'test-openai-key'
  }
}));

describe('API Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('/api/agents', () => {
    describe('GET /api/agents', () => {
      it('should return list of available agents', async () => {
        const mockAgents = [
          {
            id: 'agent-1',
            name: 'Code Review Agent',
            type: 'specialized',
            capabilities: ['code-review'],
            status: 'active'
          },
          {
            id: 'agent-2',
            name: 'Documentation Agent',
            type: 'specialized',
            capabilities: ['documentation'],
            status: 'active'
          }
        ];

        mockSupabaseClient.from().select().then.mockResolvedValueOnce({
          data: mockAgents,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(mockAgents);
      });

      it('should handle database errors', async () => {
        mockSupabaseClient.from().select().then.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' }
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(500);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe('Database connection failed');
      });
    });

    describe('POST /api/agents', () => {
      it('should create a new custom agent', async () => {
        const newAgent = {
          name: 'Custom Agent',
          description: 'A custom agent for testing',
          type: 'custom',
          capabilities: ['testing'],
          configuration: { model: 'gpt-4' }
        };

        const createdAgent = {
          id: 'custom-agent-1',
          ...newAgent,
          status: 'active',
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdAgent,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: newAgent
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(201);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(createdAgent);
      });

      it('should validate required fields', async () => {
        const invalidAgent = {
          description: 'Missing name field'
        };

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: invalidAgent
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Name is required');
      });
    });

    describe('PUT /api/agents/[id]', () => {
      it('should update an existing agent', async () => {
        const agentId = 'agent-1';
        const updateData = {
          name: 'Updated Agent Name',
          description: 'Updated description'
        };

        const updatedAgent = {
          id: agentId,
          ...updateData,
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().update().eq().single.mockResolvedValueOnce({
          data: updatedAgent,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'PUT',
          query: { id: agentId },
          body: updateData
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(updatedAgent);
      });
    });

    describe('DELETE /api/agents/[id]', () => {
      it('should delete an agent', async () => {
        const agentId = 'agent-1';

        mockSupabaseClient.from().delete().eq().mockResolvedValueOnce({
          data: null,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'DELETE',
          query: { id: agentId }
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.message).toContain('deleted successfully');
      });
    });
  });

  describe('/api/tasks', () => {
    describe('GET /api/tasks', () => {
      it('should return list of tasks', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Code Review Task',
            description: 'Review the code changes',
            type: 'code-review',
            status: 'pending',
            priority: 'medium',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            title: 'Documentation Task',
            description: 'Generate API documentation',
            type: 'documentation',
            status: 'completed',
            priority: 'low',
            created_at: new Date().toISOString()
          }
        ];

        mockSupabaseClient.from().select().order().then.mockResolvedValueOnce({
          data: mockTasks,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        await tasksHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(mockTasks);
      });

      it('should filter tasks by status', async () => {
        const completedTasks = [
          {
            id: 2,
            title: 'Documentation Task',
            status: 'completed',
            created_at: new Date().toISOString()
          }
        ];

        mockSupabaseClient.from().select().eq().order().then.mockResolvedValueOnce({
          data: completedTasks,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: { status: 'completed' }
        });

        await tasksHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.data).toEqual(completedTasks);
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('status', 'completed');
      });
    });

    describe('POST /api/tasks', () => {
      it('should create a new task', async () => {
        const newTask = {
          title: 'New Task',
          description: 'A new task for testing',
          type: 'code-review',
          priority: 'high',
          input: { code: 'console.log("test");' }
        };

        const createdTask = {
          id: 3,
          ...newTask,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdTask,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: newTask
        });

        await tasksHandler(req, res);

        expect(res._getStatusCode()).toBe(201);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(createdTask);
      });

      it('should validate task data', async () => {
        const invalidTask = {
          description: 'Missing title'
        };

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: invalidTask
        });

        await tasksHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Title is required');
      });
    });

    describe('PUT /api/tasks/[id]', () => {
      it('should update task status', async () => {
        const taskId = '1';
        const updateData = { status: 'completed' };

        const updatedTask = {
          id: 1,
          title: 'Code Review Task',
          status: 'completed',
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().update().eq().single.mockResolvedValueOnce({
          data: updatedTask,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'PUT',
          query: { id: taskId },
          body: updateData
        });

        await tasksHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data.status).toBe('completed');
      });
    });
  });

  describe('/api/marketplace/templates', () => {
    describe('GET /api/marketplace/templates', () => {
      it('should return list of agent templates', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            name: 'Code Review Template',
            description: 'Template for code review agents',
            category: 'development',
            downloads: 150,
            rating: 4.5,
            created_at: new Date().toISOString()
          },
          {
            id: 'template-2',
            name: 'Documentation Template',
            description: 'Template for documentation agents',
            category: 'documentation',
            downloads: 89,
            rating: 4.2,
            created_at: new Date().toISOString()
          }
        ];

        mockSupabaseClient.from().select().order().then.mockResolvedValueOnce({
          data: mockTemplates,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        await marketplaceHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(mockTemplates);
      });

      it('should filter templates by category', async () => {
        const developmentTemplates = [
          {
            id: 'template-1',
            name: 'Code Review Template',
            category: 'development',
            created_at: new Date().toISOString()
          }
        ];

        mockSupabaseClient.from().select().eq().order().then.mockResolvedValueOnce({
          data: developmentTemplates,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: { category: 'development' }
        });

        await marketplaceHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.data).toEqual(developmentTemplates);
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('category', 'development');
      });

      it('should search templates by name', async () => {
        const searchResults = [
          {
            id: 'template-1',
            name: 'Code Review Template',
            description: 'Template for code review agents'
          }
        ];

        mockSupabaseClient.from().select().ilike().order().then.mockResolvedValueOnce({
          data: searchResults,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: { search: 'code review' }
        });

        await marketplaceHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.data).toEqual(searchResults);
      });
    });

    describe('POST /api/marketplace/templates', () => {
      it('should create a new template', async () => {
        const newTemplate = {
          name: 'Testing Template',
          description: 'Template for testing agents',
          category: 'testing',
          configuration: {
            model: 'gpt-4',
            capabilities: ['testing', 'validation']
          }
        };

        const createdTemplate = {
          id: 'template-3',
          ...newTemplate,
          downloads: 0,
          rating: 0,
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdTemplate,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: newTemplate
        });

        await marketplaceHandler(req, res);

        expect(res._getStatusCode()).toBe(201);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(createdTemplate);
      });
    });
  });

  describe('/api/analytics', () => {
    describe('GET /api/analytics', () => {
      it('should return analytics data', async () => {
        const mockAnalytics = {
          totalTasks: 150,
          completedTasks: 120,
          failedTasks: 10,
          averageExecutionTime: 2500,
          agentUtilization: {
            'agent-1': 0.75,
            'agent-2': 0.60
          },
          tasksByType: {
            'code-review': 80,
            'documentation': 40,
            'testing': 30
          }
        };

        // Mock multiple database calls for analytics
        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: mockAnalytics,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        await analyticsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(mockAnalytics);
      });

      it('should filter analytics by date range', async () => {
        const filteredAnalytics = {
          totalTasks: 50,
          completedTasks: 45,
          failedTasks: 2
        };

        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: filteredAnalytics,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        });

        await analyticsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.data).toEqual(filteredAnalytics);
      });
    });
  });

  describe('/api/workflows', () => {
    describe('GET /api/workflows', () => {
      it('should return list of workflows', async () => {
        const mockWorkflows = [
          {
            id: 'workflow-1',
            name: 'Code Review Workflow',
            description: 'Automated code review process',
            steps: [
              { type: 'code-review', agent: 'code-review-agent' },
              { type: 'testing', agent: 'testing-agent' }
            ],
            created_at: new Date().toISOString()
          }
        ];

        mockSupabaseClient.from().select().order().then.mockResolvedValueOnce({
          data: mockWorkflows,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET'
        });

        await workflowsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(mockWorkflows);
      });
    });

    describe('POST /api/workflows', () => {
      it('should create a new workflow', async () => {
        const newWorkflow = {
          name: 'Documentation Workflow',
          description: 'Automated documentation generation',
          steps: [
            { type: 'code-analysis', agent: 'analysis-agent' },
            { type: 'documentation', agent: 'doc-agent' }
          ]
        };

        const createdWorkflow = {
          id: 'workflow-2',
          ...newWorkflow,
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdWorkflow,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: newWorkflow
        });

        await workflowsHandler(req, res);

        expect(res._getStatusCode()).toBe(201);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(createdWorkflow);
      });

      it('should validate workflow steps', async () => {
        const invalidWorkflow = {
          name: 'Invalid Workflow',
          description: 'Workflow with no steps',
          steps: []
        };

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: invalidWorkflow
        });

        await workflowsHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('At least one step is required');
      });
    });

    describe('POST /api/workflows/[id]/execute', () => {
      it('should execute a workflow', async () => {
        const workflowId = 'workflow-1';
        const executionInput = {
          code: 'console.log("test");',
          files: ['src/index.ts']
        };

        const executionResult = {
          id: 'execution-1',
          workflow_id: workflowId,
          status: 'completed',
          results: [
            { step: 'code-review', success: true, data: { issues: [] } },
            { step: 'testing', success: true, data: { coverage: 95 } }
          ],
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: executionResult,
          error: null
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          query: { id: workflowId, action: 'execute' },
          body: executionInput
        });

        await workflowsHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(true);
        expect(responseData.data).toEqual(executionResult);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported HTTP methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH' // Unsupported method
      });

      await agentsHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Method not allowed');
    });

    it('should handle malformed JSON in request body', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: 'invalid json'
      });

      await tasksHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid request body');
    });

    it('should handle database connection failures', async () => {
      mockSupabaseClient.from().select().then.mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      await agentsHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Internal server error');
    });

    it('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          authorization: 'Bearer invalid-token'
        },
        body: { name: 'Test Agent' }
      });

      await agentsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting for API endpoints', async () => {
      // Simulate multiple rapid requests
      const requests = Array.from({ length: 10 }, () => 
        createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.1'
          }
        })
      );

      // Mock rate limiting response
      mockSupabaseClient.from().select().then.mockResolvedValue({
        data: [],
        error: null
      });

      const responses = await Promise.all(
        requests.map(({ req, res }) => agentsHandler(req, res).then(() => res))
      );

      // At least some requests should succeed
      const successfulRequests = responses.filter(res => res._getStatusCode() === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate agent creation input', async () => {
      const invalidInputs = [
        { name: '' }, // Empty name
        { name: 'a'.repeat(256) }, // Name too long
        { name: 'Valid Name', capabilities: 'not-an-array' }, // Invalid capabilities
        { name: 'Valid Name', type: 'invalid-type' } // Invalid type
      ];

      for (const invalidInput of invalidInputs) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: invalidInput
        });

        await agentsHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
      }
    });

    it('should validate task creation input', async () => {
      const invalidInputs = [
        { title: '' }, // Empty title
        { title: 'Valid Title', priority: 'invalid-priority' }, // Invalid priority
        { title: 'Valid Title', type: 'invalid-type' } // Invalid type
      ];

      for (const invalidInput of invalidInputs) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: invalidInput
        });

        await tasksHandler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const responseData = JSON.parse(res._getData());
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
      }
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for success', async () => {
      mockSupabaseClient.from().select().then.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      await agentsHandler(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');
      expect(responseData).toHaveProperty('message');
    });

    it('should return consistent response format for errors', async () => {
      mockSupabaseClient.from().select().then.mockResolvedValueOnce({
        data: null,
        error: { message: 'Test error' }
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      await agentsHandler(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData).not.toHaveProperty('data');
    });
  });
});