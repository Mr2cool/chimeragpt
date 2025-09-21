import { supabase } from '@/lib/supabase';
import { AgentFactory, BaseAgent } from '@/agents/specialized-agents';
import { agentOrchestrator } from './agent-orchestrator';

export interface AgentTask {
  id: string;
  agent_id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface AgentMetrics {
  agent_id: string;
  tasks_completed: number;
  tasks_failed: number;
  average_execution_time: number;
  success_rate: number;
  last_active: string;
  performance_score: number;
  resource_usage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface AgentCollaboration {
  id: string;
  initiator_agent_id: string;
  target_agent_id: string;
  collaboration_type: 'data_sharing' | 'task_delegation' | 'result_validation' | 'knowledge_exchange';
  status: 'active' | 'completed' | 'failed';
  data?: any;
  created_at: string;
}

class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private taskQueue: AgentTask[] = [];
  private collaborations: Map<string, AgentCollaboration> = new Map();
  private metrics: Map<string, AgentMetrics> = new Map();
  private isProcessing = false;

  constructor() {
    this.initializeRealTimeSubscriptions();
    this.startTaskProcessor();
  }

  // Agent Lifecycle Management
  async createAgent(type: string, name: string, config: Record<string, any> = {}): Promise<BaseAgent> {
    try {
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const agent = AgentFactory.createAgent(type, agentId, name, config);
      
      // Store in database
      const { data, error } = await supabase
        .from('agents')
        .insert({
          id: agentId,
          name,
          type,
          status: agent.status,
          capabilities: agent.capabilities,
          configuration: agent.configuration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Register with orchestrator
      await agentOrchestrator.registerAgent({
        id: agentId,
        name,
        type,
        status: agent.status,
        capabilities: agent.capabilities,
        configuration: agent.configuration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Store in memory
      this.agents.set(agentId, agent);
      
      // Initialize metrics
      this.metrics.set(agentId, {
        agent_id: agentId,
        tasks_completed: 0,
        tasks_failed: 0,
        average_execution_time: 0,
        success_rate: 100,
        last_active: new Date().toISOString(),
        performance_score: 100,
        resource_usage: {
          cpu: 0,
          memory: 0,
          network: 0
        }
      });

      console.log(`Agent ${name} (${type}) created successfully`);
      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      // Cancel running tasks
      const runningTasks = this.taskQueue.filter(
        task => task.agent_id === agentId && task.status === 'running'
      );
      
      for (const task of runningTasks) {
        await this.cancelTask(task.id);
      }

      // Unregister from orchestrator
      await agentOrchestrator.unregisterAgent(agentId);

      // Remove from database
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      // Remove from memory
      this.agents.delete(agentId);
      this.metrics.delete(agentId);

      console.log(`Agent ${agentId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  async updateAgentStatus(agentId: string, status: BaseAgent['status']): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);

      agent.status = status;

      // Update database
      const { error } = await supabase
        .from('agents')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (error) throw error;

      // Update metrics
      const metrics = this.metrics.get(agentId);
      if (metrics) {
        metrics.last_active = new Date().toISOString();
        this.metrics.set(agentId, metrics);
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  }

  // Task Management
  async createTask(
    agentId: string,
    type: string,
    input: any,
    priority: AgentTask['priority'] = 'medium',
    dependencies: string[] = []
  ): Promise<AgentTask> {
    try {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const task: AgentTask = {
        id: taskId,
        agent_id: agentId,
        type,
        status: 'pending',
        input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        priority,
        dependencies
      };

      // Store in database
      const { error } = await supabase
        .from('tasks')
        .insert(task);

      if (error) throw error;

      // Add to queue
      this.taskQueue.push(task);
      this.sortTaskQueue();

      console.log(`Task ${taskId} created for agent ${agentId}`);
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async executeTask(taskId: string): Promise<any> {
    try {
      const taskIndex = this.taskQueue.findIndex(task => task.id === taskId);
      if (taskIndex === -1) throw new Error(`Task ${taskId} not found`);

      const task = this.taskQueue[taskIndex];
      const agent = this.agents.get(task.agent_id);
      if (!agent) throw new Error(`Agent ${task.agent_id} not found`);

      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const incompleteDeps = task.dependencies.filter(depId => {
          const depTask = this.taskQueue.find(t => t.id === depId);
          return !depTask || depTask.status !== 'completed';
        });
        
        if (incompleteDeps.length > 0) {
          throw new Error(`Task has incomplete dependencies: ${incompleteDeps.join(', ')}`);
        }
      }

      // Update task status
      task.status = 'running';
      await this.updateTaskStatus(taskId, 'running');
      await this.updateAgentStatus(task.agent_id, 'running');

      const startTime = Date.now();
      let result;

      try {
        // Execute based on agent type and task type
        result = await this.executeAgentTask(agent, task);
        
        // Update task with result
        task.status = 'completed';
        task.output = result;
        await this.updateTaskStatus(taskId, 'completed', result);
        
        // Update metrics
        await this.updateAgentMetrics(task.agent_id, true, Date.now() - startTime);
        
        console.log(`Task ${taskId} completed successfully`);
      } catch (error) {
        // Handle task failure
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        await this.updateTaskStatus(taskId, 'failed', undefined, task.error);
        
        // Update metrics
        await this.updateAgentMetrics(task.agent_id, false, Date.now() - startTime);
        
        console.error(`Task ${taskId} failed:`, error);
        throw error;
      } finally {
        await this.updateAgentStatus(task.agent_id, 'idle');
      }

      return result;
    } catch (error) {
      console.error('Error executing task:', error);
      throw error;
    }
  }

  private async executeAgentTask(agent: BaseAgent, task: AgentTask): Promise<any> {
    switch (agent.type) {
      case 'code_review':
        if (task.type === 'review_code') {
          const codeReviewAgent = agent as any;
          return await codeReviewAgent.reviewCode(task.input.code, task.input.filePath);
        }
        break;
        
      case 'documentation':
        if (task.type === 'generate_readme') {
          const docAgent = agent as any;
          return await docAgent.generateReadme(task.input);
        } else if (task.type === 'generate_api_docs') {
          const docAgent = agent as any;
          return await docAgent.generateApiDocs(task.input.endpoints);
        }
        break;
        
      case 'testing':
        if (task.type === 'generate_unit_tests') {
          const testAgent = agent as any;
          return await testAgent.generateUnitTests(task.input.code, task.input.functionName);
        }
        break;
        
      case 'deployment':
        if (task.type === 'generate_dockerfile') {
          const deployAgent = agent as any;
          return await deployAgent.generateDockerfile(task.input.projectType);
        } else if (task.type === 'generate_ci_config') {
          const deployAgent = agent as any;
          return await deployAgent.generateCIConfig(task.input.platform);
        }
        break;
        
      case 'performance':
        if (task.type === 'analyze_performance') {
          const perfAgent = agent as any;
          return await perfAgent.analyzePerformance(task.input.code);
        }
        break;
        
      case 'security':
        if (task.type === 'scan_vulnerabilities') {
          const secAgent = agent as any;
          return await secAgent.scanVulnerabilities(task.input.code);
        }
        break;
        
      default:
        throw new Error(`Unknown agent type: ${agent.type}`);
    }
    
    throw new Error(`Unknown task type: ${task.type} for agent type: ${agent.type}`);
  }

  async cancelTask(taskId: string): Promise<void> {
    try {
      const taskIndex = this.taskQueue.findIndex(task => task.id === taskId);
      if (taskIndex === -1) throw new Error(`Task ${taskId} not found`);

      const task = this.taskQueue[taskIndex];
      task.status = 'cancelled';
      
      await this.updateTaskStatus(taskId, 'cancelled');
      console.log(`Task ${taskId} cancelled`);
    } catch (error) {
      console.error('Error cancelling task:', error);
      throw error;
    }
  }

  // Agent Collaboration
  async initiateCollaboration(
    initiatorAgentId: string,
    targetAgentId: string,
    type: AgentCollaboration['collaboration_type'],
    data?: any
  ): Promise<AgentCollaboration> {
    try {
      const collaborationId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const collaboration: AgentCollaboration = {
        id: collaborationId,
        initiator_agent_id: initiatorAgentId,
        target_agent_id: targetAgentId,
        collaboration_type: type,
        status: 'active',
        data,
        created_at: new Date().toISOString()
      };

      // Store in database
      const { error } = await supabase
        .from('agent_collaborations')
        .insert(collaboration);

      if (error) throw error;

      this.collaborations.set(collaborationId, collaboration);
      
      console.log(`Collaboration ${collaborationId} initiated between ${initiatorAgentId} and ${targetAgentId}`);
      return collaboration;
    } catch (error) {
      console.error('Error initiating collaboration:', error);
      throw error;
    }
  }

  async completeCollaboration(collaborationId: string, result?: any): Promise<void> {
    try {
      const collaboration = this.collaborations.get(collaborationId);
      if (!collaboration) throw new Error(`Collaboration ${collaborationId} not found`);

      collaboration.status = 'completed';
      if (result) collaboration.data = { ...collaboration.data, result };

      // Update database
      const { error } = await supabase
        .from('agent_collaborations')
        .update({ 
          status: 'completed',
          data: collaboration.data
        })
        .eq('id', collaborationId);

      if (error) throw error;

      console.log(`Collaboration ${collaborationId} completed`);
    } catch (error) {
      console.error('Error completing collaboration:', error);
      throw error;
    }
  }

  // Metrics and Monitoring
  async getAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
    return this.metrics.get(agentId) || null;
  }

  async getAllMetrics(): Promise<AgentMetrics[]> {
    return Array.from(this.metrics.values());
  }

  private async updateAgentMetrics(agentId: string, success: boolean, executionTime: number): Promise<void> {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    if (success) {
      metrics.tasks_completed++;
    } else {
      metrics.tasks_failed++;
    }

    const totalTasks = metrics.tasks_completed + metrics.tasks_failed;
    metrics.success_rate = (metrics.tasks_completed / totalTasks) * 100;
    
    // Update average execution time
    metrics.average_execution_time = 
      (metrics.average_execution_time * (totalTasks - 1) + executionTime) / totalTasks;
    
    // Calculate performance score
    metrics.performance_score = Math.min(100, 
      (metrics.success_rate * 0.6) + 
      (Math.max(0, 100 - (metrics.average_execution_time / 1000)) * 0.4)
    );

    metrics.last_active = new Date().toISOString();
    this.metrics.set(agentId, metrics);

    // Update database
    await supabase
      .from('agent_metrics')
      .upsert({
        agent_id: agentId,
        ...metrics
      });
  }

  // Utility Methods
  private sortTaskQueue(): void {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    this.taskQueue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by creation time
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  private async updateTaskStatus(
    taskId: string, 
    status: AgentTask['status'], 
    output?: any, 
    error?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (output !== undefined) updateData.output = output;
    if (error !== undefined) updateData.error = error;

    const { error: dbError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (dbError) throw dbError;
  }

  private async startTaskProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      try {
        const pendingTasks = this.taskQueue.filter(task => task.status === 'pending');
        
        for (const task of pendingTasks.slice(0, 3)) { // Process up to 3 tasks concurrently
          const agent = this.agents.get(task.agent_id);
          if (agent && agent.status === 'idle') {
            this.executeTask(task.id).catch(error => {
              console.error(`Task ${task.id} execution failed:`, error);
            });
          }
        }
      } finally {
        this.isProcessing = false;
      }
    }, 5000); // Check every 5 seconds
  }

  private initializeRealTimeSubscriptions(): void {
    // Subscribe to agent changes
    supabase
      .channel('agents')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          console.log('Agent change detected:', payload);
          // Handle real-time agent updates
        }
      )
      .subscribe();

    // Subscribe to task changes
    supabase
      .channel('tasks')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('Task change detected:', payload);
          // Handle real-time task updates
        }
      )
      .subscribe();
  }

  // Public API Methods
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getTaskQueue(): AgentTask[] {
    return [...this.taskQueue];
  }

  getCollaborations(): AgentCollaboration[] {
    return Array.from(this.collaborations.values());
  }

  async loadExistingAgents(): Promise<void> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*');

      if (error) throw error;

      for (const agentData of agents || []) {
        try {
          const agent = AgentFactory.createAgent(
            agentData.type,
            agentData.id,
            agentData.name,
            agentData.configuration
          );
          agent.status = agentData.status;
          this.agents.set(agentData.id, agent);
        } catch (error) {
          console.error(`Failed to load agent ${agentData.id}:`, error);
        }
      }

      console.log(`Loaded ${this.agents.size} agents`);
    } catch (error) {
      console.error('Error loading existing agents:', error);
    }
  }
}

// Export singleton instance
export const agentManager = new AgentManager();
export default agentManager;