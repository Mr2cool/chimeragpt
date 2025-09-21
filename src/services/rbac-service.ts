import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  organization_id?: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

export class RBACService {
  private static instance: RBACService;
  private permissionCache = new Map<string, string[]>();
  private roleCache = new Map<string, Role>();

  private constructor() {
    this.initializeSystemRoles();
  }

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  // Initialize default system roles
  private async initializeSystemRoles() {
    const systemRoles = [
      {
        name: 'super_admin',
        description: 'Full system access',
        permissions: ['*'],
        is_system_role: true
      },
      {
        name: 'admin',
        description: 'Organization administrator',
        permissions: [
          'agents:create', 'agents:read', 'agents:update', 'agents:delete',
          'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
          'users:create', 'users:read', 'users:update', 'users:delete',
          'roles:create', 'roles:read', 'roles:update', 'roles:delete',
          'analytics:read', 'marketplace:read', 'marketplace:install'
        ],
        is_system_role: true
      },
      {
        name: 'developer',
        description: 'Developer with agent and workflow access',
        permissions: [
          'agents:create', 'agents:read', 'agents:update',
          'workflows:create', 'workflows:read', 'workflows:update',
          'tasks:create', 'tasks:read', 'tasks:update',
          'analytics:read', 'marketplace:read', 'marketplace:install'
        ],
        is_system_role: true
      },
      {
        name: 'viewer',
        description: 'Read-only access',
        permissions: [
          'agents:read', 'workflows:read', 'tasks:read', 'analytics:read', 'marketplace:read'
        ],
        is_system_role: true
      },
      {
        name: 'agent_operator',
        description: 'Agent operation and monitoring',
        permissions: [
          'agents:read', 'agents:update', 'agents:execute',
          'tasks:create', 'tasks:read', 'tasks:update',
          'monitoring:read'
        ],
        is_system_role: true
      }
    ];

    for (const role of systemRoles) {
      await this.createRoleIfNotExists(role);
    }
  }

  // User Management
  async createUser(userData: {
    email: string;
    role: string;
    organization_id?: string;
    metadata?: any;
  }): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        role: userData.role,
        organization_id: userData.organization_id,
        metadata: userData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    // Get user permissions
    const permissions = await this.getUserPermissions(user.id);
    return { ...user, permissions };
  }

  async getUserById(userId: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    const permissions = await this.getUserPermissions(userId);
    return { ...user, permissions };
  }

  async updateUserRole(userId: string, newRole: string): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    // Clear permission cache
    this.permissionCache.delete(userId);

    const permissions = await this.getUserPermissions(userId);
    return { ...user, permissions };
  }

  // Role Management
  async createRole(roleData: {
    name: string;
    description: string;
    permissions: string[];
    organization_id?: string;
  }): Promise<Role> {
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
        organization_id: roleData.organization_id,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }

    this.roleCache.set(role.id, role);
    return role;
  }

  async getRoleByName(roleName: string, organizationId?: string): Promise<Role | null> {
    let query = supabase
      .from('roles')
      .select('*')
      .eq('name', roleName);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('is_system_role', true);
    }

    const { data: role, error } = await query.single();

    if (error || !role) {
      return null;
    }

    this.roleCache.set(role.id, role);
    return role;
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }

    this.roleCache.set(roleId, role);
    return role;
  }

  async deleteRole(roleId: string): Promise<void> {
    // Check if role is in use
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('role', roleId)
      .limit(1);

    if (users && users.length > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }

    this.roleCache.delete(roleId);
  }

  // Permission Management
  async getUserPermissions(userId: string): Promise<string[]> {
    // Check cache first
    if (this.permissionCache.has(userId)) {
      return this.permissionCache.get(userId)!;
    }

    const { data: user } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return [];
    }

    const role = await this.getRoleByName(user.role, user.organization_id);
    const permissions = role?.permissions || [];

    // Cache permissions
    this.permissionCache.set(userId, permissions);
    return permissions;
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    // Check for wildcard permission
    if (permissions.includes('*')) {
      return true;
    }

    // Check for exact permission
    if (permissions.includes(permission)) {
      return true;
    }

    // Check for resource-level wildcard (e.g., 'agents:*')
    const [resource] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  }

  async checkPermission(userId: string, permission: string): Promise<void> {
    const hasPermission = await this.hasPermission(userId, permission);
    if (!hasPermission) {
      throw new Error(`Access denied: Missing permission '${permission}'`);
    }
  }

  // Organization Management
  async createOrganization(orgData: {
    name: string;
    description?: string;
    settings?: any;
  }): Promise<Organization> {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({
        name: orgData.name,
        description: orgData.description,
        settings: orgData.settings || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    return org;
  }

  async getOrganizationUsers(organizationId: string): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to get organization users: ${error.message}`);
    }

    // Get permissions for each user
    const usersWithPermissions = await Promise.all(
      (users || []).map(async (user) => {
        const permissions = await this.getUserPermissions(user.id);
        return { ...user, permissions };
      })
    );

    return usersWithPermissions;
  }

  // Audit and Logging
  async logAccess(data: {
    user_id: string;
    action: string;
    resource: string;
    resource_id?: string;
    success: boolean;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
  }): Promise<void> {
    await supabase
      .from('access_logs')
      .insert({
        ...data,
        timestamp: new Date().toISOString()
      });
  }

  async getAccessLogs(filters: {
    user_id?: string;
    action?: string;
    resource?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = supabase
      .from('access_logs')
      .select('*');

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.resource) {
      query = query.eq('resource', filters.resource);
    }

    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date);
    }

    const { data: logs, error } = await query
      .order('timestamp', { ascending: false })
      .limit(filters.limit || 100);

    if (error) {
      throw new Error(`Failed to get access logs: ${error.message}`);
    }

    return logs || [];
  }

  // Utility Methods
  private async createRoleIfNotExists(roleData: {
    name: string;
    description: string;
    permissions: string[];
    is_system_role: boolean;
  }): Promise<void> {
    const existingRole = await this.getRoleByName(roleData.name);
    if (!existingRole) {
      await supabase
        .from('roles')
        .insert({
          ...roleData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
  }

  clearCache(): void {
    this.permissionCache.clear();
    this.roleCache.clear();
  }

  // Middleware helper for API routes
  createAuthMiddleware() {
    return async (userId: string, requiredPermission: string) => {
      await this.checkPermission(userId, requiredPermission);
    };
  }
}

export const rbacService = RBACService.getInstance();