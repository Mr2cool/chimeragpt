import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
};

vi.mock('process', () => ({
  env: mockEnv
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn()
  })),
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
      getPublicUrl: vi.fn()
    }))
  },
  rpc: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  }))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

describe('Database Integration Tests', () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(() => {
    supabase = createClient<Database>(
      mockEnv.NEXT_PUBLIC_SUPABASE_URL,
      mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Agent Templates Table', () => {
    describe('CRUD Operations', () => {
      it('should create a new agent template', async () => {
        const newTemplate = {
          name: 'Test Template',
          description: 'A test template for unit testing',
          category: 'testing',
          configuration: {
            model: 'gpt-4',
            capabilities: ['testing', 'validation']
          },
          author_id: 'user-123',
          is_public: true
        };

        const createdTemplate = {
          id: 'template-123',
          ...newTemplate,
          downloads: 0,
          rating: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdTemplate,
          error: null
        });

        const result = await supabase
          .from('agent_templates')
          .insert(newTemplate)
          .single();

        expect(result.data).toEqual(createdTemplate);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('agent_templates');
      });

      it('should retrieve agent templates with filters', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            name: 'Code Review Template',
            category: 'development',
            is_public: true,
            downloads: 150
          },
          {
            id: 'template-2',
            name: 'Testing Template',
            category: 'testing',
            is_public: true,
            downloads: 89
          }
        ];

        mockSupabaseClient.from().select().eq().order().then.mockResolvedValueOnce({
          data: mockTemplates,
          error: null
        });

        const result = await supabase
          .from('agent_templates')
          .select('*')
          .eq('is_public', true)
          .order('downloads', { ascending: false });

        expect(result.data).toEqual(mockTemplates);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_public', true);
        expect(mockSupabaseClient.from().order).toHaveBeenCalledWith('downloads', { ascending: false });
      });

      it('should update template download count', async () => {
        const templateId = 'template-123';
        const updatedTemplate = {
          id: templateId,
          downloads: 151,
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().update().eq().single.mockResolvedValueOnce({
          data: updatedTemplate,
          error: null
        });

        const result = await supabase
          .from('agent_templates')
          .update({ downloads: 151 })
          .eq('id', templateId)
          .single();

        expect(result.data).toEqual(updatedTemplate);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', templateId);
      });

      it('should delete a template', async () => {
        const templateId = 'template-123';

        mockSupabaseClient.from().delete().eq().mockResolvedValueOnce({
          data: null,
          error: null
        });

        const result = await supabase
          .from('agent_templates')
          .delete()
          .eq('id', templateId);

        expect(result.error).toBeNull();
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', templateId);
      });
    });

    describe('Search and Filtering', () => {
      it('should search templates by name and description', async () => {
        const searchResults = [
          {
            id: 'template-1',
            name: 'Code Review Template',
            description: 'Template for automated code review'
          }
        ];

        mockSupabaseClient.from().select().or().ilike().then.mockResolvedValueOnce({
          data: searchResults,
          error: null
        });

        const searchTerm = 'code review';
        const result = await supabase
          .from('agent_templates')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

        expect(result.data).toEqual(searchResults);
        expect(result.error).toBeNull();
      });

      it('should filter templates by category', async () => {
        const categoryTemplates = [
          {
            id: 'template-1',
            name: 'Code Review Template',
            category: 'development'
          },
          {
            id: 'template-2',
            name: 'Testing Template',
            category: 'development'
          }
        ];

        mockSupabaseClient.from().select().eq().then.mockResolvedValueOnce({
          data: categoryTemplates,
          error: null
        });

        const result = await supabase
          .from('agent_templates')
          .select('*')
          .eq('category', 'development');

        expect(result.data).toEqual(categoryTemplates);
        expect(result.error).toBeNull();
      });

      it('should get templates with pagination', async () => {
        const paginatedTemplates = [
          { id: 'template-11', name: 'Template 11' },
          { id: 'template-12', name: 'Template 12' },
          { id: 'template-13', name: 'Template 13' }
        ];

        mockSupabaseClient.from().select().range().then.mockResolvedValueOnce({
          data: paginatedTemplates,
          error: null
        });

        const result = await supabase
          .from('agent_templates')
          .select('*')
          .range(10, 12);

        expect(result.data).toEqual(paginatedTemplates);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.from().range).toHaveBeenCalledWith(10, 12);
      });
    });
  });

  describe('Tasks Table', () => {
    describe('CRUD Operations', () => {
      it('should create a new task', async () => {
        const newTask = {
          title: 'Code Review Task',
          description: 'Review the latest code changes',
          type: 'code-review',
          status: 'pending',
          priority: 'medium',
          input: { code: 'console.log("test");' },
          user_id: 'user-123'
        };

        const createdTask = {
          id: 1,
          ...newTask,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdTask,
          error: null
        });

        const result = await supabase
          .from('tasks')
          .insert(newTask)
          .single();

        expect(result.data).toEqual(createdTask);
        expect(result.error).toBeNull();
      });

      it('should update task status and results', async () => {
        const taskId = 1;
        const updateData = {
          status: 'completed',
          result: {
            issues: [],
            metrics: { complexity: 2, maintainability: 85 }
          },
          completed_at: new Date().toISOString()
        };

        const updatedTask = {
          id: taskId,
          ...updateData,
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().update().eq().single.mockResolvedValueOnce({
          data: updatedTask,
          error: null
        });

        const result = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId)
          .single();

        expect(result.data).toEqual(updatedTask);
        expect(result.error).toBeNull();
      });

      it('should retrieve tasks with status filter', async () => {
        const pendingTasks = [
          {
            id: 1,
            title: 'Task 1',
            status: 'pending',
            priority: 'high'
          },
          {
            id: 2,
            title: 'Task 2',
            status: 'pending',
            priority: 'medium'
          }
        ];

        mockSupabaseClient.from().select().eq().order().then.mockResolvedValueOnce({
          data: pendingTasks,
          error: null
        });

        const result = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'pending')
          .order('priority', { ascending: false });

        expect(result.data).toEqual(pendingTasks);
        expect(result.error).toBeNull();
      });
    });

    describe('Task Analytics', () => {
      it('should get task statistics', async () => {
        const taskStats = {
          total_tasks: 150,
          completed_tasks: 120,
          failed_tasks: 10,
          pending_tasks: 20,
          average_execution_time: 2500
        };

        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: taskStats,
          error: null
        });

        const result = await supabase.rpc('get_task_statistics');

        expect(result.data).toEqual(taskStats);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_task_statistics');
      });

      it('should get tasks by date range', async () => {
        const dateRangeTasks = [
          {
            id: 1,
            title: 'Recent Task 1',
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            title: 'Recent Task 2',
            created_at: '2024-01-16T14:30:00Z'
          }
        ];

        mockSupabaseClient.from().select().gte().lte().then.mockResolvedValueOnce({
          data: dateRangeTasks,
          error: null
        });

        const result = await supabase
          .from('tasks')
          .select('*')
          .gte('created_at', '2024-01-15T00:00:00Z')
          .lte('created_at', '2024-01-16T23:59:59Z');

        expect(result.data).toEqual(dateRangeTasks);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Custom Agents Table', () => {
    describe('CRUD Operations', () => {
      it('should create a custom agent', async () => {
        const newAgent = {
          name: 'Custom Testing Agent',
          description: 'A custom agent for testing purposes',
          type: 'custom',
          capabilities: ['testing', 'validation'],
          configuration: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 2000
          },
          user_id: 'user-123'
        };

        const createdAgent = {
          id: 'agent-custom-123',
          ...newAgent,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdAgent,
          error: null
        });

        const result = await supabase
          .from('custom_agents')
          .insert(newAgent)
          .single();

        expect(result.data).toEqual(createdAgent);
        expect(result.error).toBeNull();
      });

      it('should retrieve user custom agents', async () => {
        const userId = 'user-123';
        const userAgents = [
          {
            id: 'agent-1',
            name: 'User Agent 1',
            user_id: userId,
            status: 'active'
          },
          {
            id: 'agent-2',
            name: 'User Agent 2',
            user_id: userId,
            status: 'inactive'
          }
        ];

        mockSupabaseClient.from().select().eq().then.mockResolvedValueOnce({
          data: userAgents,
          error: null
        });

        const result = await supabase
          .from('custom_agents')
          .select('*')
          .eq('user_id', userId);

        expect(result.data).toEqual(userAgents);
        expect(result.error).toBeNull();
      });

      it('should update agent configuration', async () => {
        const agentId = 'agent-123';
        const updateData = {
          configuration: {
            model: 'gpt-4-turbo',
            temperature: 0.5,
            max_tokens: 3000
          },
          updated_at: new Date().toISOString()
        };

        const updatedAgent = {
          id: agentId,
          ...updateData
        };

        mockSupabaseClient.from().update().eq().single.mockResolvedValueOnce({
          data: updatedAgent,
          error: null
        });

        const result = await supabase
          .from('custom_agents')
          .update(updateData)
          .eq('id', agentId)
          .single();

        expect(result.data).toEqual(updatedAgent);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Agent Instances Table', () => {
    describe('Instance Management', () => {
      it('should create an agent instance', async () => {
        const newInstance = {
          agent_id: 'agent-123',
          status: 'running',
          configuration: {
            memory_limit: '512MB',
            cpu_limit: '0.5'
          },
          user_id: 'user-123'
        };

        const createdInstance = {
          id: 'instance-123',
          ...newInstance,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdInstance,
          error: null
        });

        const result = await supabase
          .from('agent_instances')
          .insert(newInstance)
          .single();

        expect(result.data).toEqual(createdInstance);
        expect(result.error).toBeNull();
      });

      it('should update instance metrics', async () => {
        const instanceId = 'instance-123';
        const metricsUpdate = {
          metrics: {
            cpu_usage: 45.2,
            memory_usage: 256,
            tasks_completed: 15,
            uptime: 3600
          },
          last_activity: new Date().toISOString()
        };

        const updatedInstance = {
          id: instanceId,
          ...metricsUpdate,
          updated_at: new Date().toISOString()
        };

        mockSupabaseClient.from().update().eq().single.mockResolvedValueOnce({
          data: updatedInstance,
          error: null
        });

        const result = await supabase
          .from('agent_instances')
          .update(metricsUpdate)
          .eq('id', instanceId)
          .single();

        expect(result.data).toEqual(updatedInstance);
        expect(result.error).toBeNull();
      });

      it('should get active instances for an agent', async () => {
        const agentId = 'agent-123';
        const activeInstances = [
          {
            id: 'instance-1',
            agent_id: agentId,
            status: 'running',
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 'instance-2',
            agent_id: agentId,
            status: 'running',
            created_at: '2024-01-15T11:00:00Z'
          }
        ];

        mockSupabaseClient.from().select().eq().in().then.mockResolvedValueOnce({
          data: activeInstances,
          error: null
        });

        const result = await supabase
          .from('agent_instances')
          .select('*')
          .eq('agent_id', agentId)
          .in('status', ['running', 'idle']);

        expect(result.data).toEqual(activeInstances);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Reviews Table', () => {
    describe('Review Management', () => {
      it('should create a template review', async () => {
        const newReview = {
          template_id: 'template-123',
          user_id: 'user-456',
          rating: 5,
          comment: 'Excellent template, very helpful!'
        };

        const createdReview = {
          id: 'review-123',
          ...newReview,
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: createdReview,
          error: null
        });

        const result = await supabase
          .from('reviews')
          .insert(newReview)
          .single();

        expect(result.data).toEqual(createdReview);
        expect(result.error).toBeNull();
      });

      it('should get reviews for a template', async () => {
        const templateId = 'template-123';
        const templateReviews = [
          {
            id: 'review-1',
            template_id: templateId,
            rating: 5,
            comment: 'Great template!',
            user_id: 'user-1'
          },
          {
            id: 'review-2',
            template_id: templateId,
            rating: 4,
            comment: 'Very useful',
            user_id: 'user-2'
          }
        ];

        mockSupabaseClient.from().select().eq().order().then.mockResolvedValueOnce({
          data: templateReviews,
          error: null
        });

        const result = await supabase
          .from('reviews')
          .select('*')
          .eq('template_id', templateId)
          .order('created_at', { ascending: false });

        expect(result.data).toEqual(templateReviews);
        expect(result.error).toBeNull();
      });

      it('should calculate average rating', async () => {
        const templateId = 'template-123';
        const ratingStats = {
          average_rating: 4.5,
          total_reviews: 10
        };

        mockSupabaseClient.rpc.mockResolvedValueOnce({
          data: ratingStats,
          error: null
        });

        const result = await supabase.rpc('get_template_rating', {
          template_id: templateId
        });

        expect(result.data).toEqual(ratingStats);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Authentication Integration', () => {
    describe('User Management', () => {
      it('should authenticate user', async () => {
        const userCredentials = {
          email: 'test@example.com',
          password: 'password123'
        };

        const authResponse = {
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              created_at: new Date().toISOString()
            },
            session: {
              access_token: 'access-token-123',
              refresh_token: 'refresh-token-123'
            }
          },
          error: null
        };

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(authResponse);

        const result = await supabase.auth.signInWithPassword(userCredentials);

        expect(result.data.user).toBeDefined();
        expect(result.data.session).toBeDefined();
        expect(result.error).toBeNull();
      });

      it('should get current user', async () => {
        const currentUser = {
          id: 'user-123',
          email: 'test@example.com',
          created_at: new Date().toISOString()
        };

        mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
          data: { user: currentUser },
          error: null
        });

        const result = await supabase.auth.getUser();

        expect(result.data.user).toEqual(currentUser);
        expect(result.error).toBeNull();
      });

      it('should handle authentication errors', async () => {
        const authError = {
          message: 'Invalid login credentials',
          status: 400
        };

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: authError
        });

        const result = await supabase.auth.signInWithPassword({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });

        expect(result.data.user).toBeNull();
        expect(result.error).toEqual(authError);
      });
    });
  });

  describe('Storage Integration', () => {
    describe('File Operations', () => {
      it('should upload a file', async () => {
        const fileName = 'test-file.txt';
        const fileContent = 'This is test content';
        const bucket = 'agent-files';

        const uploadResponse = {
          data: {
            path: `uploads/${fileName}`,
            id: 'file-123',
            fullPath: `${bucket}/uploads/${fileName}`
          },
          error: null
        };

        mockSupabaseClient.storage.from().upload.mockResolvedValueOnce(uploadResponse);

        const result = await supabase.storage
          .from(bucket)
          .upload(`uploads/${fileName}`, fileContent);

        expect(result.data).toBeDefined();
        expect(result.data?.path).toBe(`uploads/${fileName}`);
        expect(result.error).toBeNull();
      });

      it('should download a file', async () => {
        const filePath = 'uploads/test-file.txt';
        const bucket = 'agent-files';

        const downloadResponse = {
          data: new Blob(['This is test content']),
          error: null
        };

        mockSupabaseClient.storage.from().download.mockResolvedValueOnce(downloadResponse);

        const result = await supabase.storage
          .from(bucket)
          .download(filePath);

        expect(result.data).toBeInstanceOf(Blob);
        expect(result.error).toBeNull();
      });

      it('should get public URL for a file', async () => {
        const filePath = 'uploads/test-file.txt';
        const bucket = 'agent-files';

        const publicUrlResponse = {
          data: {
            publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${filePath}`
          }
        };

        mockSupabaseClient.storage.from().getPublicUrl.mockReturnValueOnce(publicUrlResponse);

        const result = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        expect(result.data.publicUrl).toContain(filePath);
      });

      it('should list files in a bucket', async () => {
        const bucket = 'agent-files';
        const folderPath = 'uploads';

        const listResponse = {
          data: [
            {
              name: 'test-file-1.txt',
              id: 'file-1',
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
              metadata: { size: 1024 }
            },
            {
              name: 'test-file-2.txt',
              id: 'file-2',
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              last_accessed_at: new Date().toISOString(),
              metadata: { size: 2048 }
            }
          ],
          error: null
        };

        mockSupabaseClient.storage.from().list.mockResolvedValueOnce(listResponse);

        const result = await supabase.storage
          .from(bucket)
          .list(folderPath);

        expect(result.data).toHaveLength(2);
        expect(result.data?.[0].name).toBe('test-file-1.txt');
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    describe('Table Changes', () => {
      it('should subscribe to task changes', async () => {
        const mockChannel = {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn()
        };

        mockSupabaseClient.channel.mockReturnValueOnce(mockChannel);

        const subscription = supabase
          .channel('task-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'tasks'
          }, (payload) => {
            console.log('Task changed:', payload);
          })
          .subscribe();

        expect(mockSupabaseClient.channel).toHaveBeenCalledWith('task-changes');
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks'
          },
          expect.any(Function)
        );
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      it('should subscribe to agent instance changes', async () => {
        const mockChannel = {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn()
        };

        mockSupabaseClient.channel.mockReturnValueOnce(mockChannel);

        const subscription = supabase
          .channel('instance-changes')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_instances'
          }, (payload) => {
            console.log('Instance updated:', payload);
          })
          .subscribe();

        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_instances'
          },
          expect.any(Function)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = {
        message: 'Network request failed',
        details: 'Connection timeout',
        hint: 'Check your internet connection'
      };

      mockSupabaseClient.from().select().then.mockRejectedValueOnce(networkError);

      try {
        await supabase.from('agent_templates').select('*');
      } catch (error) {
        expect(error).toEqual(networkError);
      }
    });

    it('should handle database constraint violations', async () => {
      const constraintError = {
        message: 'duplicate key value violates unique constraint',
        details: 'Key (email)=(test@example.com) already exists.',
        hint: 'Use a different email address',
        code: '23505'
      };

      mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
        data: null,
        error: constraintError
      });

      const result = await supabase
        .from('agent_templates')
        .insert({ name: 'Duplicate Template' })
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(constraintError);
    });

    it('should handle permission errors', async () => {
      const permissionError = {
        message: 'permission denied for table agent_templates',
        details: 'Insufficient privileges',
        hint: 'Check your RLS policies',
        code: '42501'
      };

      mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
        data: null,
        error: permissionError
      });

      const result = await supabase
        .from('agent_templates')
        .insert({ name: 'Unauthorized Template' })
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(permissionError);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
        category: 'testing',
        downloads: Math.floor(Math.random() * 1000)
      }));

      mockSupabaseClient.from().select().then.mockResolvedValueOnce({
        data: largeDataSet,
        error: null
      });

      const startTime = Date.now();
      const result = await supabase
        .from('agent_templates')
        .select('*');
      const endTime = Date.now();

      expect(result.data).toHaveLength(1000);
      expect(result.error).toBeNull();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => {
        mockSupabaseClient.from().insert().single.mockResolvedValueOnce({
          data: { id: `task-${i}`, title: `Task ${i}` },
          error: null
        });

        return supabase
          .from('tasks')
          .insert({ title: `Concurrent Task ${i}` })
          .single();
      });

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.data?.id).toBe(`task-${index}`);
        expect(result.error).toBeNull();
      });
    });
  });
});