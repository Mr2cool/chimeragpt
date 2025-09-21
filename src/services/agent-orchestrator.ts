import { supabase } from '@/lib/supabase';
import { EventEmitter } from 'events';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'paused' | 'error' | 'stopped';
  capabilities: string[];
  configuration: Record<string, any>;
  memory: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  performance_metrics?: {
    tasks_completed: number;
    success_rate: number;
    average_execution_time: number;
    error_count: number;
  };
}

export interface Task {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_agent_id?: string;
  dependencies: string[];
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  name: string;
  type: string;
  order: number;
  agent_type?: string;
  configuration: Record<string, any>;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface AgentCommunication {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  message_type: 'request' | 'response' | 'notification' | 'data_share';
  content: Record<string, any>;
  timestamp: string;
  status: 'sent' | 'delivered' | 'processed' | 'failed';
}

class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private taskQueue: Task[] = [];
  private runningTasks: Map<string, Task> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private isProcessing = false;

  constructor() {
    super();
    this.startTaskProcessor();
    this.setupRealtimeSubscriptions();
  }

  // Agent Management
  async registerAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent> {
    const { data, error } = await supabase
      .from('agents')
      .insert({
        ...agent,
        performance_metrics: {
          tasks_completed: 0,
          success_rate: 0,
          average_execution_time: 0,
          error_count: 0
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register agent: ${error.message}`);
    }

    this.agents.set(data.id, data);
    this.emit('agentRegistered', data);
    
    return data;
  }

  async unregisterAgent(agentId: string): Promise<void> {
    // Cancel any running tasks for this agent
    const runningTasks = Array.from(this.runningTasks.values())
      .filter(task => task.assigned_agent_id === agentId);
    
    for (const task of runningTasks) {
      await this.cancelTask(task.id);
    }

    // Remove from queue
    this.taskQueue = this.taskQueue.filter(task => task.assigned_agent_id !== agentId);

    // Update database
    const { error } = await supabase
      .from('agents')
      .update({ status: 'stopped' })
      .eq('id', agentId);

    if (error) {
      throw new Error(`Failed to unregister agent: ${error.message}`);
    }

    this.agents.delete(agentId);
    this.emit('agentUnregistered', agentId);
  }

  async updateAgentStatus(agentId: string, status: Agent['status']): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = status;
    agent.updated_at = new Date().toISOString();
    agent.last_activity = new Date().toISOString();

    // Update database
    const { error } = await supabase
      .from('agents')
      .update({ 
        status, 
        updated_at: agent.updated_at,
        last_activity: agent.last_activity
      })
      .eq('id', agentId);

    if (error) {
      throw new Error(`Failed to update agent status: ${error.message}`);
    }

    this.agents.set(agentId, agent);
    this.emit('agentStatusChanged', { agentId, status });
  }

  async updateAgentMemory(agentId: string, memory: Record<string, any>): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.memory = { ...agent.memory, ...memory };
    agent.updated_at = new Date().toISOString();

    // Update database
    const { error } = await supabase
      .from('agents')
      .update({ 
        memory: agent.memory,
        updated_at: agent.updated_at
      })
      .eq('id', agentId);

    if (error) {
      throw new Error(`Failed to update agent memory: ${error.message}`);
    }

    this.agents.set(agentId, agent);
    this.emit('agentMemoryUpdated', { agentId, memory });
  }

  // Task Management
  async queueTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to queue task: ${error.message}`);
    }

    this.taskQueue.push(data);
    this.emit('taskQueued', data);
    
    // Try to assign immediately
    this.processTaskQueue();
    
    return data;
  }

  async assignTask(taskId: string, agentId: string): Promise<void> {
    const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in queue`);
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'idle') {
      throw new Error(`Agent ${agentId} is not available`);
    }

    const task = this.taskQueue[taskIndex];
    task.assigned_agent_id = agentId;
    task.status = 'assigned';
    task.updated_at = new Date().toISOString();

    // Update database
    const { error } = await supabase
      .from('tasks')
      .update({ 
        assigned_agent_id: agentId,
        status: 'assigned',
        updated_at: task.updated_at
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to assign task: ${error.message}`);
    }

    // Remove from queue and add to running tasks
    this.taskQueue.splice(taskIndex, 1);
    this.runningTasks.set(taskId, task);

    this.emit('taskAssigned', { taskId, agentId });
  }

  async startTask(taskId: string): Promise<void> {
    const task = this.runningTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in running tasks`);
    }

    if (!task.assigned_agent_id) {
      throw new Error(`Task ${taskId} has no assigned agent`);
    }

    task.status = 'running';
    task.started_at = new Date().toISOString();
    task.updated_at = new Date().toISOString();

    // Update agent status
    await this.updateAgentStatus(task.assigned_agent_id, 'running');

    // Update database
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'running',
        started_at: task.started_at,
        updated_at: task.updated_at
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to start task: ${error.message}`);
    }

    this.runningTasks.set(taskId, task);
    this.emit('taskStarted', { taskId, agentId: task.assigned_agent_id });
  }

  async completeTask(taskId: string, outputData?: Record<string, any>): Promise<void> {
    const task = this.runningTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in running tasks`);
    }

    const completedAt = new Date().toISOString();
    const actualDuration = task.started_at 
      ? new Date(completedAt).getTime() - new Date(task.started_at).getTime()
      : undefined;

    task.status = 'completed';
    task.completed_at = completedAt;
    task.output_data = outputData;
    task.actual_duration = actualDuration;
    task.updated_at = completedAt;

    // Update database
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'completed',
        completed_at: completedAt,
        output_data: outputData,
        actual_duration: actualDuration,
        updated_at: completedAt
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }

    // Update agent performance metrics
    if (task.assigned_agent_id) {
      await this.updateAgentPerformance(task.assigned_agent_id, true, actualDuration);
      await this.updateAgentStatus(task.assigned_agent_id, 'idle');
    }

    this.runningTasks.delete(taskId);
    this.emit('taskCompleted', { taskId, outputData });

    // Process next task in queue
    this.processTaskQueue();
  }

  async failTask(taskId: string, errorMessage: string): Promise<void> {
    const task = this.runningTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in running tasks`);
    }

    task.status = 'failed';
    task.error_message = errorMessage;
    task.updated_at = new Date().toISOString();

    // Update database
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'failed',
        error_message: errorMessage,
        updated_at: task.updated_at
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to fail task: ${error.message}`);
    }

    // Update agent performance metrics
    if (task.assigned_agent_id) {
      await this.updateAgentPerformance(task.assigned_agent_id, false);
      await this.updateAgentStatus(task.assigned_agent_id, 'error');
    }

    this.runningTasks.delete(taskId);
    this.emit('taskFailed', { taskId, errorMessage });
  }

  async cancelTask(taskId: string): Promise<void> {
    // Check if task is in queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue[queueIndex];
      task.status = 'cancelled';
      task.updated_at = new Date().toISOString();
      
      this.taskQueue.splice(queueIndex, 1);
      
      // Update database
      await supabase
        .from('tasks')
        .update({ 
          status: 'cancelled',
          updated_at: task.updated_at
        })
        .eq('id', taskId);
      
      this.emit('taskCancelled', { taskId });
      return;
    }

    // Check if task is running
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      runningTask.status = 'cancelled';
      runningTask.updated_at = new Date().toISOString();
      
      // Update database
      await supabase
        .from('tasks')
        .update({ 
          status: 'cancelled',
          updated_at: runningTask.updated_at
        })
        .eq('id', taskId);
      
      // Update agent status
      if (runningTask.assigned_agent_id) {
        await this.updateAgentStatus(runningTask.assigned_agent_id, 'idle');
      }
      
      this.runningTasks.delete(taskId);
      this.emit('taskCancelled', { taskId });
      
      // Process next task in queue
      this.processTaskQueue();
    }
  }

  // Workflow Management
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    this.workflows.set(data.id, data);
    this.emit('workflowCreated', data);
    
    return data;
  }

  async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'active';
    workflow.started_at = new Date().toISOString();
    workflow.updated_at = new Date().toISOString();

    // Update database
    await supabase
      .from('workflows')
      .update({ 
        status: 'active',
        started_at: workflow.started_at,
        updated_at: workflow.updated_at
      })
      .eq('id', workflowId);

    this.workflows.set(workflowId, workflow);
    this.emit('workflowStarted', { workflowId });

    // Queue tasks for workflow steps
    for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
      if (this.canExecuteStep(step, workflow)) {
        await this.queueTask({
          name: `${workflow.name} - ${step.name}`,
          description: `Workflow step: ${step.name}`,
          type: step.type,
          priority: 'medium',
          dependencies: step.dependencies,
          input_data: step.configuration
        });
      }
    }
  }

  // Agent Communication
  async sendMessage(fromAgentId: string, toAgentId: string, messageType: AgentCommunication['message_type'], content: Record<string, any>): Promise<AgentCommunication> {
    const { data, error } = await supabase
      .from('agent_communications')
      .insert({
        from_agent_id: fromAgentId,
        to_agent_id: toAgentId,
        message_type: messageType,
        content,
        status: 'sent'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    this.emit('messageSent', data);
    return data;
  }

  // Private Methods
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Find available agents
      const availableAgents = Array.from(this.agents.values())
        .filter(agent => agent.status === 'idle');

      if (availableAgents.length === 0) {
        return;
      }

      // Sort tasks by priority
      const sortedTasks = this.taskQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Assign tasks to agents
      for (const task of sortedTasks) {
        if (availableAgents.length === 0) break;

        // Check dependencies
        if (!this.areDependenciesMet(task)) {
          continue;
        }

        // Find suitable agent
        const suitableAgent = this.findSuitableAgent(task, availableAgents);
        if (suitableAgent) {
          await this.assignTask(task.id, suitableAgent.id);
          await this.startTask(task.id);
          
          // Remove agent from available list
          const agentIndex = availableAgents.findIndex(a => a.id === suitableAgent.id);
          if (agentIndex !== -1) {
            availableAgents.splice(agentIndex, 1);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private areDependenciesMet(task: Task): boolean {
    // Check if all dependencies are completed
    return task.dependencies.every(depId => {
      // This would need to check the database for completed tasks
      // For now, assume dependencies are met
      return true;
    });
  }

  private findSuitableAgent(task: Task, availableAgents: Agent[]): Agent | null {
    // Find agent with matching capabilities
    return availableAgents.find(agent => 
      agent.capabilities.includes(task.type) ||
      agent.type === task.type
    ) || availableAgents[0]; // Fallback to first available agent
  }

  private canExecuteStep(step: WorkflowStep, workflow: Workflow): boolean {
    // Check if step dependencies are met
    return step.dependencies.every(depId => {
      const depStep = workflow.steps.find(s => s.id === depId);
      return depStep?.status === 'completed';
    });
  }

  private async updateAgentPerformance(agentId: string, success: boolean, duration?: number): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.performance_metrics) return;

    const metrics = agent.performance_metrics;
    metrics.tasks_completed += 1;
    
    if (success) {
      metrics.success_rate = ((metrics.success_rate * (metrics.tasks_completed - 1)) + 1) / metrics.tasks_completed;
    } else {
      metrics.error_count += 1;
      metrics.success_rate = (metrics.success_rate * (metrics.tasks_completed - 1)) / metrics.tasks_completed;
    }

    if (duration) {
      metrics.average_execution_time = ((metrics.average_execution_time * (metrics.tasks_completed - 1)) + duration) / metrics.tasks_completed;
    }

    // Update database
    await supabase
      .from('agents')
      .update({ performance_metrics: metrics })
      .eq('id', agentId);

    agent.performance_metrics = metrics;
    this.agents.set(agentId, agent);
  }

  private startTaskProcessor(): void {
    // Process task queue every 5 seconds
    setInterval(() => {
      this.processTaskQueue();
    }, 5000);
  }

  private setupRealtimeSubscriptions(): void {
    // Subscribe to agent changes
    supabase
      .channel('agent-orchestrator')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          this.agents.set(payload.new.id, payload.new as Agent);
          this.emit('agentUpdated', payload.new);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          this.emit('taskCreated', payload.new);
        }
      })
      .subscribe();
  }

  // Public getters
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getTaskQueue(): Task[] {
    return [...this.taskQueue];
  }

  getRunningTasks(): Task[] {
    return Array.from(this.runningTasks.values());
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
}

export const agentOrchestrator = new AgentOrchestrator();
export default agentOrchestrator;