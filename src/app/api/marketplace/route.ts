import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const featured = searchParams.get('featured');

    let query = supabase
      .from('agent_templates')
      .select(`
        *,
        agent_ratings(
          rating,
          review
        ),
        agent_installations(
          id
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching marketplace templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch marketplace templates' },
        { status: 500 }
      );
    }

    // Calculate average ratings and installation counts
    const enrichedTemplates = templates?.map(template => {
      const ratings = template.agent_ratings || [];
      const installations = template.agent_installations || [];
      
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length 
        : 0;
      
      return {
        ...template,
        average_rating: Math.round(averageRating * 10) / 10,
        rating_count: ratings.length,
        installation_count: installations.length,
        agent_ratings: undefined, // Remove to reduce payload size
        agent_installations: undefined
      };
    });

    return NextResponse.json({ templates: enrichedTemplates });
  } catch (error) {
    console.error('Error in marketplace API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      config, 
      capabilities, 
      tags, 
      version,
      author,
      icon,
      featured = false
    } = body;

    if (!name || !description || !category || !config) {
      return NextResponse.json(
        { error: 'Name, description, category, and config are required' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('agent_templates')
      .insert({
        name,
        description,
        category,
        config,
        capabilities: capabilities || [],
        tags: tags || [],
        version: version || '1.0.0',
        author: author || 'Anonymous',
        icon: icon || null,
        featured,
        status: 'published'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace template:', error);
      return NextResponse.json(
        { error: 'Failed to create marketplace template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating marketplace template:', error);
    return NextResponse.json(
      { error: 'Failed to create marketplace template' },
      { status: 500 }
    );
  }
}