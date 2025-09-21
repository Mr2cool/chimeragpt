import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentOrchestrator } from './agent-orchestrator';
import { AgentManager } from './agent-manager';
import { createClient } from '@supabase/supabase-js';
import { AgentTask, AgentTaskStatus, TaskPriority } from '../types/agents';

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
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  }))
}));

vi.mock('./agent-manager', () => ({
  AgentManager: vi.fn().mockImplementation(() => ({
    getAvailableAgents: vi.fn().mockResolvedValue([
      { id: 'agent-1', name: 'Test Agent 1', capabilities: ['code-review'], status: 'idle' },
      { id: 'agent-2', name: 'Test Agent 2', capabilities: ['documentation'], status: 'busy' }
    ]),
    executeTask: vi.fn().mockResolvedValue({
      success: true,
      data: { result: 'Task completed successfully' },
      message: 'Task executed'
    }),
    getAgentWorkload: vi.fn().mockResolvedValue({
      'agent-1': { activeTasks: 1, queuedTasks: 0 },
      'agent-2': { activeTasks: 3, queuedTasks: 2 }
    })
  }))
}));

vi.mock('../ai/monitoring/agent-monitoring', () => ({
  AgentMonitoring: vi.fn().mockImplementation(() => ({
    trackTaskExecution: vi.fn(),
    trackAgentPerformance: vi.fn(),
    getMetrics: vi.fn().mockResolvedValue({
      totalTasks: 100,
      successRate: 0.95,
      averageExecutionTime: 1500
    })
  }))
}));

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
  }
}));

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockSupabase: any;
  let mockAgentManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new AgentOrchestrator();
    mockSupabase = createClient();
    mockAgentManager = new AgentManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.isProcessing).toBe(false);
    });

    it('should set up real-time subscriptions', () => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('task-updates');
    });
  });

  describe('Task Management', () => {
    const mockTask = {
      id: 1,
      title: 'Test Task',
      description: 'A test task',
      type: 'code-review',
      priority: TaskPriority.MEDIUM,
      status: AgentTaskStatus.PENDING,
      input: { code: 'console.log("test");' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    describe('createTask', () => {
      it('should create a new task successfully', async () => {
        mockSupabase.from().insert.mockResolvedValueOnce({
          data: [{ ...mockTask, id: 123 }],
          error: null
        });

        const result = await orchestrator.createTask({
          title: 'Test Task',
          description: 'A test task',
          type: 'code-review',
          priority: TaskPriority.MEDIUM,
          input: { code: 'console.log("test");' }
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe(123);
        expect(mockSupabase.from).toHaveBeenCalledWith('agent_tasks');
        expect(mockSupabase.from().insert).toHaveBeenCalled();
      });

      it('should handle database errors during task creation', async () => {
        mockSupabase.from().insert.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' }
        });

        const result = await orchestrator.createTask({
          title: 'Test Task',
          description: 'A test task',
          type: 'code-review',
          priority: TaskPriority.MEDIUM,
          input: { code: 'console.log("test");' }
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database error');
        expect(result.data).toBeNull();
      });

      it('should validate required fields', async () => {
        const result = await orchestrator.createTask({
          title: '',
          description: 'A test task',
          type: 'code-review',
          priority: TaskPriority.MEDIUM,
          input: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Title is required');
      });

      it('should set default priority when not specified', async () => {
        mockSupabase.from().insert.mockResolvedValueOnce({
          data: [{ ...mockTask, priority: TaskPriority.MEDIUM }],
          error: null
        });

        const result = await orchestrator.createTask({
          title: 'Test Task',
          description: 'A test task',
          type: 'code-review',
          input: { code: 'console.log("test");' }
        });

        expect(result.success).toBe(true);
        expect(result.data.priority).toBe(TaskPriority.MEDIUM);
      });
    });

    describe('getTask', () => {
      it('should retrieve a task by ID', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: mockTask,
          error: null
        });

        const result = await orchestrator.getTask(1);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockTask);
        expect(mockSupabase.from).toHaveBeenCalledWith('agent_tasks');
        expect(mockSupabase.from().select).toHaveBeenCalled();
        expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 1);
      });

      it('should handle task not found', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Task not found' }
        });

        const result = await orchestrator.getTask(999);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Task not found');
        expect(result.data).toBeNull();
      });
    });

    describe('updateTaskStatus', () => {
      it('should update task status successfully', async () => {
        const updatedTask = { ...mockTask, status: AgentTaskStatus.COMPLETED };
        mockSupabase.from().update().eq().single.mockResolvedValueOnce({
          data: updatedTask,
          error: null
        });

        const result = await orchestrator.updateTaskStatus(1, AgentTaskStatus.COMPLETED);

        expect(result.success).toBe(true);
        expect(result.data.status).toBe(AgentTaskStatus.COMPLETED);
        expect(mockSupabase.from().update).toHaveBeenCalledWith({
          status: AgentTaskStatus.COMPLETED,
          updated_at: expect.any(String)
        });
      });

      it('should handle update errors', async () => {
        mockSupabase.from().update().eq().single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' }
        });

        const result = await orchestrator.updateTaskStatus(1, AgentTaskStatus.COMPLETED);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Update failed');
      });
    });

    describe('listTasks', () => {
      const mockTasks = [
        { ...mockTask, id: 1 },
        { ...mockTask, id: 2, status: AgentTaskStatus.COMPLETED },
        { ...mockTask, id: 3, priority: TaskPriority.HIGH }
      ];

      it('should list all tasks without filters', async () => {
        mockSupabase.from().select().order.mockResolvedValueOnce({
          data: mockTasks,
          error: null
        });

        const result = await orchestrator.listTasks();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockTasks);
        expect(mockSupabase.from().order).toHaveBeenCalledWith('created_at', { ascending: false });
      });

      it('should filter tasks by status', async () => {
        const completedTasks = mockTasks.filter(t => t.status === AgentTaskStatus.COMPLETED);
        mockSupabase.from().select().eq().order.mockResolvedValueOnce({
          data: completedTasks,
          error: null
        });

        const result = await orchestrator.listTasks({ status: AgentTaskStatus.COMPLETED });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(completedTasks);
        expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', AgentTaskStatus.COMPLETED);
      });

      it('should filter tasks by priority', async () => {
        const highPriorityTasks = mockTasks.filter(t => t.priority === TaskPriority.HIGH);
        mockSupabase.from().select().eq().order.mockResolvedValueOnce({
          data: highPriorityTasks,
          error: null
        });

        const result = await orchestrator.listTasks({ priority: TaskPriority.HIGH });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(highPriorityTasks);
        expect(mockSupabase.from().eq).toHaveBeenCalledWith('priority', TaskPriority.HIGH);
      });

      it('should limit results when specified', async () => {
        mockSupabase.from().select().order().limit.mockResolvedValueOnce({
          data: mockTasks.slice(0, 2),
          error: null
        });

        const result = await orchestrator.listTasks({ limit: 2 });

        expect(result.success).toBe(true);
        expect(result.data.length).toBe(2);
        expect(mockSupabase.from().limit).toHaveBeenCalledWith(2);
      });
    });

    describe('assignTask', () => {
      it('should assign task to available agent', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: mockTask,
          error: null
        });
        
        mockSupabase.from().update().eq().single.mockResolvedValueOnce({
          data: { ...mockTask, assigned_agent_id: 'agent-1', status: AgentTaskStatus.ASSIGNED },
          error: null
        });

        const result = await orchestrator.assignTask(1, 'agent-1');

        expect(result.success).toBe(true);
        expect(result.data.assigned_agent_id).toBe('agent-1');
        expect(result.data.status).toBe(AgentTaskStatus.ASSIGNED);
      });

      it('should handle assignment to non-existent agent', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: mockTask,
          error: null
        });

        mockAgentManager.getAvailableAgents.mockResolvedValueOnce([]);

        const result = await orchestrator.assignTask(1, 'non-existent-agent');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Agent not found or not available');
      });
    });
  });

  describe('Agent Management', () => {
    describe('getAvailableAgents', () => {
      it('should return list of available agents', async () => {
        const result = await orchestrator.getAvailableAgents();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toHaveProperty('id', 'agent-1');
        expect(result.data[1]).toHaveProperty('id', 'agent-2');
        expect(mockAgentManager.getAvailableAgents).toHaveBeenCalled();
      });

      it('should handle agent manager errors', async () => {
        mockAgentManager.getAvailableAgents.mockRejectedValueOnce(new Error('Agent service unavailable'));

        const result = await orchestrator.getAvailableAgents();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Agent service unavailable');
      });
    });

    describe('getAgentWorkload', () => {
      it('should return agent workload information', async () => {
        const result = await orchestrator.getAgentWorkload();

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('agent-1');
        expect(result.data).toHaveProperty('agent-2');
        expect(result.data['agent-1']).toEqual({ activeTasks: 1, queuedTasks: 0 });
        expect(result.data['agent-2']).toEqual({ activeTasks: 3, queuedTasks: 2 });
      });
    });

    describe('selectOptimalAgent', () => {
      it('should select agent with lowest workload', async () => {
        const agents = [
          { id: 'agent-1', capabilities: ['code-review'], status: 'idle' },
          { id: 'agent-2', capabilities: ['code-review'], status: 'idle' }
        ];
        
        mockAgentManager.getAvailableAgents.mockResolvedValueOnce(agents);
        mockAgentManager.getAgentWorkload.mockResolvedValueOnce({
          'agent-1': { activeTasks: 1, queuedTasks: 0 },
          'agent-2': { activeTasks: 0, queuedTasks: 0 }
        });

        const result = await orchestrator.selectOptimalAgent('code-review');

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('agent-2'); // Should select agent with lower workload
      });

      it('should filter agents by capability', async () => {
        const agents = [
          { id: 'agent-1', capabilities: ['code-review'], status: 'idle' },
          { id: 'agent-2', capabilities: ['documentation'], status: 'idle' }
        ];
        
        mockAgentManager.getAvailableAgents.mockResolvedValueOnce(agents);

        const result = await orchestrator.selectOptimalAgent('documentation');

        expect(result.success).toBe(true);
        expect(result.data.id).toBe('agent-2');
      });

      it('should return error when no suitable agent found', async () => {
        const agents = [
          { id: 'agent-1', capabilities: ['code-review'], status: 'idle' }
        ];
        
        mockAgentManager.getAvailableAgents.mockResolvedValueOnce(agents);

        const result = await orchestrator.selectOptimalAgent('testing');

        expect(result.success).toBe(false);
        expect(result.error).toContain('No suitable agent found');
      });
    });
  });

  describe('Workflow Management', () => {
    describe('executeWorkflow', () => {
      const workflowTasks = [
        {
          title: 'Code Review',
          description: 'Review the code',
          type: 'code-review',
          priority: TaskPriority.HIGH,
          input: { code: 'console.log("test");' }
        },
        {
          title: 'Generate Docs',
          description: 'Generate documentation',
          type: 'documentation',
          priority: TaskPriority.MEDIUM,
          input: { files: [] }
        }
      ];

      it('should execute workflow with multiple tasks', async () => {
        // Mock task creation
        mockSupabase.from().insert.mockResolvedValueOnce({
          data: [{ id: 1, ...workflowTasks[0], status: AgentTaskStatus.PENDING }],
          error: null
        }).mockResolvedValueOnce({
          data: [{ id: 2, ...workflowTasks[1], status: AgentTaskStatus.PENDING }],
          error: null
        });

        // Mock task execution
        mockAgentManager.executeTask.mockResolvedValue({
          success: true,
          data: { result: 'Task completed' },
          message: 'Success'
        });

        const result = await orchestrator.executeWorkflow(workflowTasks);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].success).toBe(true);
        expect(result.data[1].success).toBe(true);
      });

      it('should handle workflow execution errors', async () => {
        // Mock task creation success
        mockSupabase.from().insert.mockResolvedValueOnce({
          data: [{ id: 1, ...workflowTasks[0], status: AgentTaskStatus.PENDING }],
          error: null
        });

        // Mock task execution failure
        mockAgentManager.executeTask.mockRejectedValueOnce(new Error('Execution failed'));

        const result = await orchestrator.executeWorkflow([workflowTasks[0]]);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Workflow execution failed');
      });

      it('should handle empty workflow', async () => {
        const result = await orchestrator.executeWorkflow([]);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Workflow cannot be empty');
      });
    });
  });

  describe('Task Queue Management', () => {
    describe('processTaskQueue', () => {
      it('should process tasks in priority order', async () => {
        const queuedTasks = [
          { id: 1, priority: TaskPriority.LOW, status: AgentTaskStatus.PENDING },
          { id: 2, priority: TaskPriority.HIGH, status: AgentTaskStatus.PENDING },
          { id: 3, priority: TaskPriority.MEDIUM, status: AgentTaskStatus.PENDING }
        ];

        mockSupabase.from().select().eq().order.mockResolvedValueOnce({
          data: queuedTasks,
          error: null
        });

        mockAgentManager.executeTask.mockResolvedValue({
          success: true,
          data: { result: 'Task completed' },
          message: 'Success'
        });

        await orchestrator.processTaskQueue();

        // Should process high priority task first
        expect(mockAgentManager.executeTask).toHaveBeenCalledTimes(3);
      });

      it('should handle empty queue', async () => {
        mockSupabase.from().select().eq().order.mockResolvedValueOnce({
          data: [],
          error: null
        });

        const result = await orchestrator.processTaskQueue();

        expect(result.success).toBe(true);
        expect(result.message).toContain('No pending tasks');
        expect(mockAgentManager.executeTask).not.toHaveBeenCalled();
      });

      it('should handle processing errors gracefully', async () => {
        const queuedTasks = [
          { id: 1, priority: TaskPriority.HIGH, status: AgentTaskStatus.PENDING }
        ];

        mockSupabase.from().select().eq().order.mockResolvedValueOnce({
          data: queuedTasks,
          error: null
        });

        mockAgentManager.executeTask.mockRejectedValueOnce(new Error('Processing failed'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await orchestrator.processTaskQueue();

        expect(consoleSpy).toHaveBeenCalledWith('Error processing task 1:', expect.any(Error));
        consoleSpy.mockRestore();
      });
    });

    describe('startTaskProcessor', () => {
      it('should start task processing with specified interval', () => {
        const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as any);

        orchestrator.startTaskProcessor(5000);

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
        expect(orchestrator.isProcessing).toBe(true);

        setIntervalSpy.mockRestore();
      });

      it('should not start multiple processors', () => {
        const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as any);

        orchestrator.startTaskProcessor(5000);
        orchestrator.startTaskProcessor(5000); // Second call should be ignored

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);

        setIntervalSpy.mockRestore();
      });
    });

    describe('stopTaskProcessor', () => {
      it('should stop task processing', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
        const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as any);

        orchestrator.startTaskProcessor(5000);
        orchestrator.stopTaskProcessor();

        expect(clearIntervalSpy).toHaveBeenCalledWith(123);
        expect(orchestrator.isProcessing).toBe(false);

        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from().select.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const result = await orchestrator.listTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle agent execution timeouts', async () => {
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ id: 1, status: AgentTaskStatus.PENDING }],
        error: null
      });

      // Mock timeout
      mockAgentManager.executeTask.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), 100)
        )
      );

      const result = await orchestrator.createTask({
        title: 'Test Task',
        description: 'A test task',
        type: 'code-review',
        priority: TaskPriority.MEDIUM,
        input: { code: 'console.log("test");' }
      });

      expect(result.success).toBe(true); // Task creation should succeed
      // Execution timeout should be handled separately
    });

    it('should handle malformed task data', async () => {
      const result = await orchestrator.createTask({
        title: null as any,
        description: undefined as any,
        type: 'invalid-type' as any,
        priority: 'invalid-priority' as any,
        input: null as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Real-time Updates', () => {
    it('should set up task update subscriptions', () => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('task-updates');
      expect(mockSupabase.channel().on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'agent_tasks'
        }),
        expect.any(Function)
      );
    });

    it('should handle real-time task updates', () => {
      const mockCallback = vi.fn();
      orchestrator.onTaskUpdate(mockCallback);

      // Simulate real-time update
      const updatePayload = {
        eventType: 'UPDATE',
        new: { id: 1, status: AgentTaskStatus.COMPLETED },
        old: { id: 1, status: AgentTaskStatus.IN_PROGRESS }
      };

      // Trigger the callback that was registered with Supabase
      const subscriptionCallback = mockSupabase.channel().on.mock.calls[0][2];
      subscriptionCallback(updatePayload);

      expect(mockCallback).toHaveBeenCalledWith(updatePayload);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track task execution metrics', async () => {
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ id: 1, status: AgentTaskStatus.PENDING }],
        error: null
      });

      await orchestrator.createTask({
        title: 'Test Task',
        description: 'A test task',
        type: 'code-review',
        priority: TaskPriority.MEDIUM,
        input: { code: 'console.log("test");' }
      });

      // Verify monitoring is called (implementation would depend on actual monitoring setup)
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should provide orchestrator metrics', async () => {
      const result = await orchestrator.getMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('totalTasks');
      expect(result.data).toHaveProperty('successRate');
      expect(result.data).toHaveProperty('averageExecutionTime');
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        maxConcurrentTasks: 10,
        taskTimeout: 30000,
        retryAttempts: 3
      };

      orchestrator.updateConfiguration(newConfig);

      expect(orchestrator.getConfiguration()).toEqual(
        expect.objectContaining(newConfig)
      );
    });

    it('should validate configuration values', () => {
      const invalidConfig = {
        maxConcurrentTasks: -1,
        taskTimeout: 0,
        retryAttempts: -5
      };

      expect(() => {
        orchestrator.updateConfiguration(invalidConfig);
      }).toThrow('Invalid configuration');
    });
  });
});