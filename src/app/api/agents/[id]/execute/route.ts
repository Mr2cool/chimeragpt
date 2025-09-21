import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { agentManager } from '@/services/agent-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, taskConfig } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'start':
        // Update agent status to running
        await supabase
          .from('agents')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        // If taskConfig is provided, create and execute a task
        if (taskConfig) {
          const task = await agentManager.createTask({
            title: taskConfig.title || `Task for ${agent.name}`,
            description: taskConfig.description || '',
            type: taskConfig.type || 'general',
            priority: taskConfig.priority || 'medium',
            agentId: id,
            config: taskConfig.config || {},
            status: 'pending'
          });

          result = await agentManager.executeTask(task.id);
        } else {
          result = { message: 'Agent started successfully' };
        }
        break;

      case 'stop':
        // Update agent status to idle
        await supabase
          .from('agents')
          .update({ 
            status: 'idle',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        // Cancel any running tasks for this agent
        const { data: runningTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('agent_id', id)
          .eq('status', 'running');

        if (runningTasks && runningTasks.length > 0) {
          for (const task of runningTasks) {
            await agentManager.cancelTask(task.id);
          }
        }

        result = { message: 'Agent stopped successfully' };
        break;

      case 'restart':
        // First stop the agent
        await supabase
          .from('agents')
          .update({ 
            status: 'idle',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        // Cancel running tasks
        const { data: tasksToCancel } = await supabase
          .from('tasks')
          .select('id')
          .eq('agent_id', id)
          .eq('status', 'running');

        if (tasksToCancel && tasksToCancel.length > 0) {
          for (const task of tasksToCancel) {
            await agentManager.cancelTask(task.id);
          }
        }

        // Wait a moment then restart
        setTimeout(async () => {
          await supabase
            .from('agents')
            .update({ 
              status: 'running',
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
        }, 1000);

        result = { message: 'Agent restarted successfully' };
        break;

      case 'pause':
        await supabase
          .from('agents')
          .update({ 
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        result = { message: 'Agent paused successfully' };
        break;

      case 'resume':
        await supabase
          .from('agents')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        result = { message: 'Agent resumed successfully' };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: start, stop, restart, pause, resume' },
          { status: 400 }
        );
    }

    // Log the action
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: `Agent ${agent.name} (${id}) ${action} action executed`,
        metadata: {
          agent_id: id,
          action,
          taskConfig: taskConfig || null
        }
      });

    return NextResponse.json({ 
      success: true, 
      action,
      agent: {
        id: agent.id,
        name: agent.name,
        status: action === 'stop' ? 'idle' : action === 'pause' ? 'paused' : 'running'
      },
      result 
    });

  } catch (error) {
    console.error('Error executing agent action:', error);
    return NextResponse.json(
      { error: 'Failed to execute agent action' },
      { status: 500 }
    );
  }
}