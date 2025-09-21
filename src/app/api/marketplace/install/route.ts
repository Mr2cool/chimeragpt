import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { agentManager } from '@/services/agent-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, customName, customConfig } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', templateId)
      .eq('status', 'published')
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or not published' },
        { status: 404 }
      );
    }

    // Merge custom config with template config
    const finalConfig = {
      ...template.config,
      ...customConfig
    };

    // Create the agent using the template
    const agent = await agentManager.createAgent({
      name: customName || template.name,
      type: template.category,
      config: finalConfig,
      description: template.description,
      status: 'idle'
    });

    // Record the installation
    const { data: installation, error: installError } = await supabase
      .from('agent_installations')
      .insert({
        template_id: templateId,
        agent_id: agent.id,
        user_id: null, // TODO: Add user authentication
        config_overrides: customConfig || {}
      })
      .select()
      .single();

    if (installError) {
      console.error('Error recording installation:', installError);
      // Don't fail the request, just log the error
    }

    // Update installation count (increment)
    await supabase.rpc('increment_installation_count', {
      template_id: templateId
    });

    // Log the installation
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: `Agent template "${template.name}" installed as "${agent.name}"`,
        metadata: {
          template_id: templateId,
          agent_id: agent.id,
          installation_id: installation?.id
        }
      });

    return NextResponse.json({ 
      success: true,
      agent,
      installation,
      template: {
        id: template.id,
        name: template.name,
        category: template.category
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error installing agent template:', error);
    return NextResponse.json(
      { error: 'Failed to install agent template' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const templateId = searchParams.get('template_id');

    let query = supabase
      .from('agent_installations')
      .select(`
        *,
        agent_templates(
          name,
          category,
          version
        ),
        agents(
          name,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data: installations, error } = await query;

    if (error) {
      console.error('Error fetching installations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch installations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ installations });
  } catch (error) {
    console.error('Error in installations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}