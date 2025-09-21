'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  Shield,
  Building,
  Activity,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Eye,
  Settings,
  UserPlus,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { rbacService } from '@/services/rbac-service';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  organization_id?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  organization_id?: string;
  is_system_role: boolean;
  user_count?: number;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  user_count?: number;
  created_at: string;
}

interface AccessLog {
  id: string;
  user_id: string;
  user_email?: string;
  action: string;
  resource: string;
  success: boolean;
  timestamp: string;
  ip_address?: string;
}

const AVAILABLE_PERMISSIONS = [
  'agents:create', 'agents:read', 'agents:update', 'agents:delete', 'agents:execute',
  'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
  'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
  'users:create', 'users:read', 'users:update', 'users:delete',
  'roles:create', 'roles:read', 'roles:update', 'roles:delete',
  'organizations:create', 'organizations:read', 'organizations:update', 'organizations:delete',
  'analytics:read', 'monitoring:read', 'marketplace:read', 'marketplace:install'
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    email: '',
    role: '',
    organization_id: '',
    status: 'active' as const
  });
  
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });
  
  const [orgForm, setOrgForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadData();
    setupRealtimeSubscriptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadRoles(),
        loadOrganizations(),
        loadAccessLogs()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        organization:organizations(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    const usersWithPermissions = await Promise.all(
      (data || []).map(async (user) => {
        const permissions = await rbacService.getUserPermissions(user.id);
        return { ...user, permissions };
      })
    );

    setUsers(usersWithPermissions);
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('is_system_role', { ascending: false });

    if (error) {
      console.error('Error loading roles:', error);
      return;
    }

    // Get user count for each role
    const rolesWithCounts = await Promise.all(
      (data || []).map(async (role) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', role.name);
        return { ...role, user_count: count || 0 };
      })
    );

    setRoles(rolesWithCounts);
  };

  const loadOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading organizations:', error);
      return;
    }

    // Get user count for each organization
    const orgsWithCounts = await Promise.all(
      (data || []).map(async (org) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);
        return { ...org, user_count: count || 0 };
      })
    );

    setOrganizations(orgsWithCounts);
  };

  const loadAccessLogs = async () => {
    const { data, error } = await supabase
      .from('access_logs')
      .select(`
        *,
        user:users(email)
      `)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading access logs:', error);
      return;
    }

    setAccessLogs(data || []);
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadUsers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, loadRoles)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, loadOrganizations)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'access_logs' }, loadAccessLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreateUser = async () => {
    try {
      await rbacService.createUser({
        email: userForm.email,
        role: userForm.role,
        organization_id: userForm.organization_id || undefined
      });
      
      setShowUserModal(false);
      setUserForm({ email: '', role: '', organization_id: '', status: 'active' });
      await loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      await rbacService.updateUserRole(editingUser.id, userForm.role);
      
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ email: '', role: '', organization_id: '', status: 'active' });
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      await rbacService.createRole({
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
        organization_id: selectedOrg || undefined
      });
      
      setShowRoleModal(false);
      setRoleForm({ name: '', description: '', permissions: [] });
      await loadRoles();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleCreateOrganization = async () => {
    try {
      await rbacService.createOrganization({
        name: orgForm.name,
        description: orgForm.description
      });
      
      setShowOrgModal(false);
      setOrgForm({ name: '', description: '' });
      await loadOrganizations();
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesOrg = !selectedOrg || user.organization_id === selectedOrg;
    return matchesSearch && matchesRole && matchesOrg;
  });

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalRoles: roles.length,
    customRoles: roles.filter(r => !r.is_system_role).length,
    totalOrgs: organizations.length,
    recentLogins: accessLogs.filter(log => 
      log.action === 'login' && 
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and organizations</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.customRoles} custom
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrgs}</div>
            <p className="text-xs text-muted-foreground">
              Active organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentLogins}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </div>
                <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                      <DialogDescription>
                        {editingUser ? 'Update user information and role' : 'Add a new user to the system'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          disabled={!!editingUser}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.name} {role.is_system_role && '(System)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="organization">Organization</Label>
                        <Select value={userForm.organization_id} onValueChange={(value) => setUserForm({ ...userForm, organization_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an organization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No Organization</SelectItem>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowUserModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
                          {editingUser ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'super_admin' ? 'destructive' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.organization?.name || 'None'}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setUserForm({
                                email: user.email,
                                role: user.role,
                                organization_id: user.organization_id || '',
                                status: user.status
                              });
                              setShowUserModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional tabs would be implemented similarly... */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Configure roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Role management interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage organizational structure</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Organization management interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Access Logs</CardTitle>
              <CardDescription>Monitor system access and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Access logs interface would be implemented here...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}