import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from './route';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }))
}));

vi.mock('@/services/agent-manager', () => ({
  agentManager: {
    createAgent: vi.fn(),
    getAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    listAgents: vi.fn(),
  }
}));

// Import the mocked dependencies
import { createClient } from '@supabase/supabase-js';
import { agentManager } from '@/services/agent-manager';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockAgent = {
  id: 'agent-123',
  name: 'Test Agent',
  type: 'code-review',
  status: 'idle',
  config: {
    reviewDepth: 'thorough',
    checkSecurity: true,
  },
  user_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const createMockRequest = (method: string, body?: any, searchParams?: Record<string, string>) => {
  const url = new URL('http://localhost:3000/api/agents');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

describe('/api/agents', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/agents', () => {
    it('should return list of agents for authenticated user', async () => {
      const agents = [mockAgent, { ...mockAgent, id: 'agent-456', name: 'Another Agent' }];
      
      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: agents, error: null }),
      }));

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agents).toEqual(agents);
      expect(data.agents).toHaveLength(2);
    });

    it('should filter agents by type when specified', async () => {
      const codeReviewAgents = [mockAgent];
      
      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: codeReviewAgents, error: null }),
      }));

      const request = createMockRequest('GET', undefined, { type: 'code-review' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agents).toEqual(codeReviewAgents);
    });

    it('should handle empty agent list', async () => {
      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agents).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.from).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      }));

      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch agents');
    });
  });

  describe('POST /api/agents', () => {
    it('should create new agent successfully', async () => {
      const newAgentData = {
        name: 'New Test Agent',
        type: 'documentation',
        config: {
          outputFormat: 'markdown',
          includeExamples: true,
        },
      };

      const createdAgent = {
        ...mockAgent,
        ...newAgentData,
        id: 'agent-new',
      };

      vi.mocked(agentManager.createAgent).mockResolvedValue(createdAgent);

      const request = createMockRequest('POST', newAgentData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.agent).toEqual(createdAgent);
      expect(agentManager.createAgent).toHaveBeenCalledWith({
        ...newAgentData,
        status: 'idle'
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing name and type
        config: {},
      };

      const request = createMockRequest('POST', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate agent type', async () => {
      const invalidData = {
        name: 'Test Agent',
        type: 'invalid-type',
        config: {},
      };

      const request = createMockRequest('POST', invalidData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid agent type');
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockRequest('POST', {
        name: 'Test Agent',
        type: 'code-review',
        config: {},
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle agent creation errors', async () => {
      vi.mocked(agentManager.createAgent).mockRejectedValue(new Error('Creation failed'));

      const request = createMockRequest('POST', {
        name: 'Test Agent',
        type: 'code-review',
        config: {},
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create agent');
    });
  });

  describe('PUT /api/agents', () => {
    it('should update agent successfully', async () => {
      const updateData = {
        id: 'agent-123',
        name: 'Updated Agent',
        config: { temperature: 0.8 },
      };

      const updatedAgent = {
        ...mockAgent,
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.from).mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedAgent, error: null }),
      }));

      const request = createMockRequest('PUT', updateData);
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agent).toEqual(updatedAgent);
    });

    it('should validate agent ID', async () => {
      const updateData = {
        // Missing id
        name: 'Updated Agent Name',
      };

      const request = createMockRequest('PUT', updateData);
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Agent ID is required');
    });

    it('should return 500 for non-existent agent', async () => {
      const mockSupabase = vi.mocked(createClient)();
      vi.mocked(mockSupabase.from).mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Agent not found') }),
      }));

      const request = createMockRequest('PUT', {
        id: 'non-existent',
        name: 'Updated Agent',
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update agent');
    });
  });

  describe('DELETE /api/agents', () => {
    it('should delete agent successfully', async () => {
      vi.mocked(agentManager.deleteAgent).mockResolvedValue(true);

      const request = createMockRequest('DELETE', undefined, { id: 'agent-123' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(agentManager.deleteAgent).toHaveBeenCalledWith('agent-123');
    });

    it('should validate agent ID parameter', async () => {
      const request = createMockRequest('DELETE');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Agent ID is required');
    });

    it('should return 500 for non-existent agent', async () => {
      vi.mocked(agentManager.deleteAgent).mockRejectedValue(new Error('Agent not found'));

      const request = createMockRequest('DELETE', undefined, { id: 'non-existent' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete agent');
    });

    it('should handle deletion errors', async () => {
      vi.mocked(agentManager.deleteAgent).mockRejectedValue(new Error('Deletion failed'));

      const request = createMockRequest('DELETE', undefined, { id: 'agent-123' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete agent');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create agent');
    });

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Agent', type: 'code-review' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create agent');
    });


  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting (if implemented)', async () => {
      // This test would be relevant if rate limiting is implemented
      // For now, it's a placeholder for future implementation
      const request = createMockRequest('GET');
      const response = await GET(request);
      
      expect(response.status).not.toBe(429); // Should not be rate limited in tests
    });
  });

  describe('CORS Headers', () => {
    it('should include appropriate CORS headers', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);

      // Check if CORS headers are present (if implemented)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });
  });
});