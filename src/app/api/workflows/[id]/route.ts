import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import agentOrchestrator from '@/services/agent-orchestrator';

interface RouteParams {
  params: {
    id: string;
  };
}

const orchestrator = agentOrchestrator;

// GET /api/workflows/[id] - Get specific workflow
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (
          id,
          agent_type,
          agent_id,
          name,
          description,
          order,
          status,
          configuration,
          dependencies,
          output,
          error_message,
          started_at,
          completed_at
        ),
        workflow_executions (
          id,
          status,
          started_at,
          completed_at,
          progress,
          current_step,
          results,
          error_message
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching workflow:', error);
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Calculate progress
    const steps = workflow.workflow_steps || [];
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const workflowWithProgress = {
      ...workflow,
      steps: steps.sort((a, b) => a.order - b.order),
      total_steps: totalSteps,
      completed_steps: completedSteps,
      progress,
      executions: workflow.workflow_executions || []
    };

    return NextResponse.json({ workflow: workflowWithProgress });
  } catch (error) {
    console.error('Error in GET /api/workflows/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/workflows/[id] - Update workflow status or properties
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, name, description, action } = body;

    // Handle specific actions
    if (action) {
      switch (action) {
        case 'pause':
          return await pauseWorkflow(id);
        case 'resume':
          return await resumeWorkflow(id);
        case 'cancel':
          return await cancelWorkflow(id);
        case 'restart':
          return await restartWorkflow(id);
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    }

    // Update workflow properties
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      if (status === 'paused') {
        updateData.paused_at = new Date().toISOString();
      } else if (status === 'active') {
        updateData.resumed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (name) updateData.name = name;
    if (description) updateData.description = description;

    const { data: workflow, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workflow:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    // If status changed to paused or cancelled, update orchestrator
    if (status === 'paused') {
      try {
        await orchestrator.pauseWorkflow(id);
      } catch (orchestratorError) {
        console.error('Error pausing workflow in orchestrator:', orchestratorError);
      }
    } else if (status === 'cancelled') {
      try {
        await orchestrator.cancelWorkflow(id);
      } catch (orchestratorError) {
        console.error('Error cancelling workflow in orchestrator:', orchestratorError);
      }
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error in PATCH /api/workflows/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete specific workflow
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    // Check if workflow is currently running
    const { data: workflow } = await supabase
      .from('workflows')
      .select('status')
      .eq('id', id)
      .single();

    if (workflow?.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete an active workflow. Please pause or cancel it first.' },
        { status: 400 }
      );
    }

    // Delete workflow steps first (due to foreign key constraint)
    await supabase
      .from('workflow_steps')
      .delete()
      .eq('workflow_id', id);

    // Delete workflow executions
    await supabase
      .from('workflow_executions')
      .delete()
      .eq('workflow_id', id);

    // Delete workflow
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workflow:', error);
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/workflows/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for workflow actions
async function pauseWorkflow(workflowId: string) {
  try {
    // Update workflow status
    const { data: workflow, error } = await supabase
      .from('workflows')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update current execution
    await supabase
      .from('workflow_executions')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .eq('status', 'running');

    // Pause in orchestrator
    await orchestrator.pauseWorkflow(workflowId);

    return NextResponse.json({
      message: 'Workflow paused successfully',
      workflow
    });
  } catch (error) {
    console.error('Error pausing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to pause workflow' },
      { status: 500 }
    );
  }
}

async function resumeWorkflow(workflowId: string) {
  try {
    // Update workflow status
    const { data: workflow, error } = await supabase
      .from('workflows')
      .update({
        status: 'active',
        resumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update current execution
    await supabase
      .from('workflow_executions')
      .update({
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .eq('status', 'paused');

    // Resume in orchestrator
    await orchestrator.resumeWorkflow(workflowId);

    return NextResponse.json({
      message: 'Workflow resumed successfully',
      workflow
    });
  } catch (error) {
    console.error('Error resuming workflow:', error);
    return NextResponse.json(
      { error: 'Failed to resume workflow' },
      { status: 500 }
    );
  }
}

async function cancelWorkflow(workflowId: string) {
  try {
    // Update workflow status
    const { data: workflow, error } = await supabase
      .from('workflows')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update current execution
    await supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: 'Workflow cancelled by user'
      })
      .eq('workflow_id', workflowId)
      .in('status', ['running', 'paused']);

    // Cancel in orchestrator
    await orchestrator.cancelWorkflow(workflowId);

    return NextResponse.json({
      message: 'Workflow cancelled successfully',
      workflow
    });
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    return NextResponse.json(
      { error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}

async function restartWorkflow(workflowId: string) {
  try {
    // Get workflow with steps
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (
          id,
          agent_type,
          agent_id,
          name,
          description,
          order,
          configuration,
          dependencies
        )
      `)
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Reset all steps to pending
    await supabase
      .from('workflow_steps')
      .update({
        status: 'pending',
        output: null,
        error_message: null,
        started_at: null,
        completed_at: null
      })
      .eq('workflow_id', workflowId);

    // Update workflow status
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        completed_at: null,
        completed_steps: 0,
        progress: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create new execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 0,
        results: {}
      })
      .select()
      .single();

    if (executionError) {
      throw executionError;
    }

    // Start workflow execution using orchestrator
    await orchestrator.executeWorkflow({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      steps: workflow.workflow_steps.sort((a, b) => a.order - b.order),
      execution_id: execution.id
    });

    return NextResponse.json({
      message: 'Workflow restarted successfully',
      workflow: updatedWorkflow,
      execution_id: execution.id
    });
  } catch (error) {
    console.error('Error restarting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to restart workflow' },
      { status: 500 }
    );
  }
}