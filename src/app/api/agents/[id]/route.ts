import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import agentOrchestrator from '@/services/agent-orchestrator';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'busy';
  description?: string;
  config?: any;
  capabilities?: string[];
  created_at?: string;
  updated_at?: string;
  last_activity?: string;
}

const orchestrator = agentOrchestrator;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const include_tasks = searchParams.get('include_tasks') === 'true';
    const include_metrics = searchParams.get('include_metrics') === 'true';
    const include_logs = searchParams.get('include_logs') === 'true';

    // Get agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enhancedAgent: any = { ...agent };

    // Include tasks if requested
    if (include_tasks) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
      enhancedAgent.tasks = tasks || [];
    }

    // Include metrics if requested
    if (include_metrics) {
      const { data: metrics } = await supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_id', id)
        .order('timestamp', { ascending: false })
        .limit(100);
      enhancedAgent.metrics = metrics || [];
    }

    // Include logs if requested
    if (include_logs) {
      const { data: logs } = await supabase
        .from('agent_logs')
        .select('*')
        .eq('agent_id', id)
        .order('timestamp', { ascending: false })
        .limit(100);
      enhancedAgent.logs = logs || [];
    }

    return NextResponse.json({ agent: enhancedAgent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, ...updateData } = body;

    // Handle specific actions
    if (action) {
      switch (action) {
        case 'start':
          return await handleAgentAction(id, 'start');
        case 'stop':
          return await handleAgentAction(id, 'stop');
        case 'restart':
          return await handleAgentAction(id, 'restart');
        case 'reset':
          return await handleAgentAction(id, 'reset');
        case 'execute_task':
          return await handleTaskExecution(id, body.task);
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    }

    // Handle regular updates
    const updateFields: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.config !== undefined) updateFields.config = updateData.config;
    if (updateData.capabilities !== undefined) updateFields.capabilities = updateData.capabilities;
    if (updateData.status !== undefined) updateFields.status = updateData.status;

    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update orchestrator if status changed
    if (updateData.status !== undefined) {
      try {
        if (updateData.status === 'active') {
          await orchestrator.registerAgent({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            capabilities: agent.capabilities || [],
            config: agent.config || {}
          });
        } else {
          await orchestrator.unregisterAgent(agent.id);
        }
      } catch (orchestratorError) {
        console.error('Failed to update agent in orchestrator:', orchestratorError);
      }
    }

    // Send real-time update
    await supabase
      .channel('agents')
      .send({
        type: 'broadcast',
        event: 'agent_updated',
        payload: { agent }
      });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get agent before deletion
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete related data
    await Promise.all([
      supabase.from('tasks').delete().eq('agent_id', id),
      supabase.from('agent_metrics').delete().eq('agent_id', id),
      supabase.from('agent_logs').delete().eq('agent_id', id)
    ]);

    // Delete agent
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Unregister from orchestrator
    try {
      await orchestrator.unregisterAgent(id);
    } catch (orchestratorError) {
      console.error('Failed to unregister agent from orchestrator:', orchestratorError);
    }

    // Send real-time update
    await supabase
      .channel('agents')
      .send({
        type: 'broadcast',
        event: 'agent_deleted',
        payload: { agent_id: id }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleAgentAction(agentId: string, action: string) {
  try {
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let newStatus: string;
    let result: any = {};

    switch (action) {
      case 'start':
        newStatus = 'active';
        try {
          await orchestrator.registerAgent({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            capabilities: agent.capabilities || [],
            config: agent.config || {}
          });
          result.message = 'Agent started successfully';
        } catch (error) {
          newStatus = 'error';
          result.error = 'Failed to start agent';
        }
        break;

      case 'stop':
        newStatus = 'inactive';
        try {
          await orchestrator.unregisterAgent(agentId);
          result.message = 'Agent stopped successfully';
        } catch (error) {
          result.error = 'Failed to stop agent cleanly';
        }
        break;

      case 'restart':
        try {
          await orchestrator.unregisterAgent(agentId);
          await orchestrator.registerAgent({
            id: agent.id,
            name: agent.name,
            type: agent.type,
            capabilities: agent.capabilities || [],
            config: agent.config || {}
          });
          newStatus = 'active';
          result.message = 'Agent restarted successfully';
        } catch (error) {
          newStatus = 'error';
          result.error = 'Failed to restart agent';
        }
        break;

      case 'reset':
        // Clear agent state and metrics
        await Promise.all([
          supabase.from('agent_metrics').delete().eq('agent_id', agentId),
          supabase.from('agent_logs').delete().eq('agent_id', agentId)
        ]);
        newStatus = 'inactive';
        result.message = 'Agent reset successfully';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update agent status
    const { data: updatedAgent, error } = await supabase
      .from('agents')
      .update({
        status: newStatus,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('agent_logs')
      .insert({
        agent_id: agentId,
        level: result.error ? 'error' : 'info',
        message: result.message || result.error || `Agent ${action} action performed`,
        timestamp: new Date().toISOString(),
        metadata: { action, result }
      });

    // Send real-time update
    await supabase
      .channel('agents')
      .send({
        type: 'broadcast',
        event: 'agent_action',
        payload: { agent: updatedAgent, action, result }
      });

    return NextResponse.json({ agent: updatedAgent, result });
  } catch (error) {
    console.error(`Error handling agent ${action}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleTaskExecution(agentId: string, taskData: any) {
  try {
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 400 }
      );
    }

    // Create task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        agent_id: agentId,
        type: taskData.type || 'manual',
        priority: taskData.priority || 'medium',
        data: taskData.data || {},
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Queue task with orchestrator
    try {
      await orchestrator.queueTask({
        id: task.id,
        agentId: agentId,
        type: task.type,
        priority: task.priority,
        data: task.data
      });
    } catch (orchestratorError) {
      console.error('Failed to queue task with orchestrator:', orchestratorError);
      // Update task status to failed
      await supabase
        .from('tasks')
        .update({ status: 'failed', error: 'Failed to queue task' })
        .eq('id', task.id);
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error executing task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}