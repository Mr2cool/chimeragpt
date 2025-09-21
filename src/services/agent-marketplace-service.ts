import { supabase } from '@/lib/supabase';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  author_email?: string;
  tags: string[];
  configuration: {
    capabilities: string[];
    requirements: string[];
    environment_variables?: Record<string, string>;
    dependencies?: string[];
    model_requirements?: {
      provider: string;
      model: string;
      min_tokens?: number;
    };
  };
  code_template: string;
  installation_instructions: string;
  usage_examples: string[];
  rating: number;
  download_count: number;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  screenshots?: string[];
  documentation_url?: string;
  repository_url?: string;
  license: string;
}

export interface AgentInstallation {
  id: string;
  template_id: string;
  user_id: string;
  agent_id: string;
  installed_at: string;
  configuration_overrides?: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
}

export interface AgentRating {
  id: string;
  template_id: string;
  user_id: string;
  rating: number;
  review?: string;
  created_at: string;
}

export interface MarketplaceStats {
  total_templates: number;
  total_downloads: number;
  featured_templates: number;
  verified_templates: number;
  categories: { name: string; count: number }[];
  top_rated: AgentTemplate[];
  most_downloaded: AgentTemplate[];
  recent_templates: AgentTemplate[];
}

class AgentMarketplaceService {
  async getTemplates(filters?: {
    category?: string;
    tags?: string[];
    author?: string;
    verified_only?: boolean;
    featured_only?: boolean;
    search?: string;
    sort_by?: 'rating' | 'downloads' | 'created_at' | 'name';
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ templates: AgentTemplate[]; total: number }> {
    let query = supabase
      .from('agent_templates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.author) {
      query = query.eq('author', filters.author);
    }

    if (filters?.verified_only) {
      query = query.eq('is_verified', true);
    }

    if (filters?.featured_only) {
      query = query.eq('is_featured', true);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{"${filters.search}"}`);
    }

    // Apply sorting
    const sortBy = filters?.sort_by || 'created_at';
    const sortOrder = filters?.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return {
      templates: data || [],
      total: count || 0
    };
  }

  async getTemplate(id: string): Promise<AgentTemplate | null> {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Template not found
      }
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    return data;
  }

  async createTemplate(template: Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at' | 'rating' | 'download_count'>): Promise<AgentTemplate> {
    const { data, error } = await supabase
      .from('agent_templates')
      .insert({
        ...template,
        rating: 0,
        download_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return data;
  }

  async updateTemplate(id: string, updates: Partial<AgentTemplate>): Promise<AgentTemplate> {
    const { data, error } = await supabase
      .from('agent_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('agent_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  async installTemplate(templateId: string, userId: string, agentId: string, configOverrides?: Record<string, any>): Promise<AgentInstallation> {
    // First, increment download count
    await supabase.rpc('increment_download_count', { template_id: templateId });

    // Create installation record
    const { data, error } = await supabase
      .from('agent_installations')
      .insert({
        template_id: templateId,
        user_id: userId,
        agent_id: agentId,
        configuration_overrides: configOverrides,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to install template: ${error.message}`);
    }

    return data;
  }

  async getInstallations(userId: string): Promise<AgentInstallation[]> {
    const { data, error } = await supabase
      .from('agent_installations')
      .select(`
        *,
        template:agent_templates(*),
        agent:agents(name, status)
      `)
      .eq('user_id', userId)
      .order('installed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch installations: ${error.message}`);
    }

    return data || [];
  }

  async uninstallTemplate(installationId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_installations')
      .update({ status: 'inactive' })
      .eq('id', installationId);

    if (error) {
      throw new Error(`Failed to uninstall template: ${error.message}`);
    }
  }

  async rateTemplate(templateId: string, userId: string, rating: number, review?: string): Promise<AgentRating> {
    // Check if user already rated this template
    const { data: existingRating } = await supabase
      .from('agent_ratings')
      .select('id')
      .eq('template_id', templateId)
      .eq('user_id', userId)
      .single();

    let result;
    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from('agent_ratings')
        .update({ rating, review })
        .eq('id', existingRating.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update rating: ${error.message}`);
      }
      result = data;
    } else {
      // Create new rating
      const { data, error } = await supabase
        .from('agent_ratings')
        .insert({
          template_id: templateId,
          user_id: userId,
          rating,
          review
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create rating: ${error.message}`);
      }
      result = data;
    }

    // Update template average rating
    await this.updateTemplateRating(templateId);

    return result;
  }

  private async updateTemplateRating(templateId: string): Promise<void> {
    const { data, error } = await supabase
      .from('agent_ratings')
      .select('rating')
      .eq('template_id', templateId);

    if (error) {
      throw new Error(`Failed to fetch ratings: ${error.message}`);
    }

    if (data && data.length > 0) {
      const averageRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      
      await supabase
        .from('agent_templates')
        .update({ rating: Math.round(averageRating * 10) / 10 })
        .eq('id', templateId);
    }
  }

  async getTemplateRatings(templateId: string): Promise<AgentRating[]> {
    const { data, error } = await supabase
      .from('agent_ratings')
      .select(`
        *,
        user:users(email)
      `)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch ratings: ${error.message}`);
    }

    return data || [];
  }

  async getMarketplaceStats(): Promise<MarketplaceStats> {
    // Get basic stats
    const { data: templates, error: templatesError } = await supabase
      .from('agent_templates')
      .select('category, download_count, rating, is_featured, is_verified, created_at');

    if (templatesError) {
      throw new Error(`Failed to fetch marketplace stats: ${templatesError.message}`);
    }

    const totalTemplates = templates?.length || 0;
    const totalDownloads = templates?.reduce((sum, t) => sum + (t.download_count || 0), 0) || 0;
    const featuredTemplates = templates?.filter(t => t.is_featured).length || 0;
    const verifiedTemplates = templates?.filter(t => t.is_verified).length || 0;

    // Get category counts
    const categoryMap = new Map<string, number>();
    templates?.forEach(t => {
      const count = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, count + 1);
    });
    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));

    // Get top rated templates
    const { data: topRated } = await supabase
      .from('agent_templates')
      .select('*')
      .order('rating', { ascending: false })
      .limit(5);

    // Get most downloaded templates
    const { data: mostDownloaded } = await supabase
      .from('agent_templates')
      .select('*')
      .order('download_count', { ascending: false })
      .limit(5);

    // Get recent templates
    const { data: recentTemplates } = await supabase
      .from('agent_templates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      total_templates: totalTemplates,
      total_downloads: totalDownloads,
      featured_templates: featuredTemplates,
      verified_templates: verifiedTemplates,
      categories,
      top_rated: topRated || [],
      most_downloaded: mostDownloaded || [],
      recent_templates: recentTemplates || []
    };
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('category')
      .order('category');

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const categories = [...new Set(data?.map(t => t.category) || [])];
    return categories;
  }

  async searchTemplates(query: string, limit = 10): Promise<AgentTemplate[]> {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{"${query}"}`)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search templates: ${error.message}`);
    }

    return data || [];
  }

  async getTemplatesByAuthor(author: string): Promise<AgentTemplate[]> {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('author', author)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch templates by author: ${error.message}`);
    }

    return data || [];
  }

  async getFeaturedTemplates(): Promise<AgentTemplate[]> {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('is_featured', true)
      .order('rating', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch featured templates: ${error.message}`);
    }

    return data || [];
  }

  async getVerifiedTemplates(): Promise<AgentTemplate[]> {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('*')
      .eq('is_verified', true)
      .order('rating', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch verified templates: ${error.message}`);
    }

    return data || [];
  }
}

export const agentMarketplaceService = new AgentMarketplaceService();
export default agentMarketplaceService;