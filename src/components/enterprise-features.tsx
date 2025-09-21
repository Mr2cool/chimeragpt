"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"
import { 
  Shield, 
  Users, 
  Settings, 
  Activity, 
  Lock, 
  Key, 
  UserCheck, 
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Clock,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from '@/lib/supabase'

interface User {
  id: string
  email: string
  role: 'admin' | 'manager' | 'developer' | 'viewer'
  permissions: string[]
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: string
  createdAt: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
}

interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: string
  resource: string
  timestamp: string
  ipAddress: string
  userAgent: string
}

const AVAILABLE_PERMISSIONS = [
  'agents.create',
  'agents.read',
  'agents.update',
  'agents.delete',
  'agents.execute',
  'tasks.create',
  'tasks.read',
  'tasks.update',
  'tasks.delete',
  'workflows.create',
  'workflows.read',
  'workflows.update',
  'workflows.delete',
  'marketplace.read',
  'marketplace.install',
  'marketplace.publish',
  'users.read',
  'users.manage',
  'roles.manage',
  'system.admin'
]

export function EnterpriseFeatures() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showRoleDialog, setShowRoleDialog] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadUsers(),
        loadRoles(),
        loadAuditLogs()
      ])
    } catch (error) {
      console.error('Error loading enterprise data:', error)
      toast.error('Failed to load enterprise data')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    // Mock data for demonstration
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@company.com',
        role: 'admin',
        permissions: AVAILABLE_PERMISSIONS,
        status: 'active',
        lastLogin: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
      },
      {
        id: '2',
        email: 'manager@company.com',
        role: 'manager',
        permissions: ['agents.create', 'agents.read', 'agents.update', 'tasks.create', 'tasks.read', 'users.read'],
        status: 'active',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
      },
      {
        id: '3',
        email: 'developer@company.com',
        role: 'developer',
        permissions: ['agents.read', 'agents.execute', 'tasks.read', 'workflows.read'],
        status: 'active',
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      }
    ]
    setUsers(mockUsers)
  }

  const loadRoles = async () => {
    const mockRoles: Role[] = [
      {
        id: '1',
        name: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: AVAILABLE_PERMISSIONS,
        userCount: 1
      },
      {
        id: '2',
        name: 'Manager',
        description: 'Can manage agents, tasks, and view users',
        permissions: ['agents.create', 'agents.read', 'agents.update', 'tasks.create', 'tasks.read', 'users.read'],
        userCount: 1
      },
      {
        id: '3',
        name: 'Developer',
        description: 'Can execute agents and view resources',
        permissions: ['agents.read', 'agents.execute', 'tasks.read', 'workflows.read'],
        userCount: 1
      },
      {
        id: '4',
        name: 'Viewer',
        description: 'Read-only access to system resources',
        permissions: ['agents.read', 'tasks.read', 'workflows.read'],
        userCount: 0
      }
    ]
    setRoles(mockRoles)
  }

  const loadAuditLogs = async () => {
    const mockLogs: AuditLog[] = [
      {
        id: '1',
        userId: '1',
        userEmail: 'admin@company.com',
        action: 'CREATE_AGENT',
        resource: 'Security Scanner Agent',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        id: '2',
        userId: '2',
        userEmail: 'manager@company.com',
        action: 'UPDATE_TASK',
        resource: 'Code Review Task #123',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        id: '3',
        userId: '3',
        userEmail: 'developer@company.com',
        action: 'EXECUTE_AGENT',
        resource: 'Testing Agent',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    ]
    setAuditLogs(mockLogs)
  }

  const handleUserAction = async (action: string, userId: string) => {
    try {
      // Implement user actions (activate, suspend, delete)
      toast.success(`User ${action} successfully`)
      await loadUsers()
    } catch (error) {
      toast.error(`Failed to ${action} user`)
    }
  }

  const handleRoleUpdate = async (roleId: string, permissions: string[]) => {
    try {
      // Implement role permission updates
      toast.success('Role permissions updated successfully')
      await loadRoles()
    } catch (error) {
      toast.error('Failed to update role permissions')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return variants[status as keyof typeof variants] || variants.inactive
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      developer: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    }
    return variants[role as keyof typeof variants] || variants.viewer
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enterprise Features</h2>
          <p className="text-muted-foreground">
            Advanced security, user management, and compliance tools
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="roles">Role & Permissions</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage user accounts, roles, and permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setShowUserDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Badge className={getRoleBadge(user.role)}>
                            {user.role}
                          </Badge>
                          <Badge className={getStatusBadge(user.status)}>
                            {user.status}
                          </Badge>
                          <span>Last login: {formatTimestamp(user.lastLogin)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUserAction('suspend', user.id)}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roles & Permissions
                  </CardTitle>
                  <CardDescription>
                    Configure role-based access control and permissions
                  </CardDescription>
                </div>
                <Button onClick={() => setShowRoleDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{role.name}</h3>
                      <Badge variant="secondary">{role.userCount} users</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Permissions:</Label>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Track user activities and system changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{log.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.userEmail} • {log.resource}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatTimestamp(log.timestamp)}</p>
                      <p>{log.ipAddress}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15m</SelectItem>
                      <SelectItem value="30">30m</SelectItem>
                      <SelectItem value="60">1h</SelectItem>
                      <SelectItem value="120">2h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>IP Whitelist</Label>
                    <p className="text-sm text-muted-foreground">Restrict access by IP</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">Limit API requests per minute</p>
                  </div>
                  <Input className="w-20" defaultValue="100" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>API Key Rotation</Label>
                    <p className="text-sm text-muted-foreground">Auto-rotate API keys</p>
                  </div>
                  <Select defaultValue="90">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30d</SelectItem>
                      <SelectItem value="60">60d</SelectItem>
                      <SelectItem value="90">90d</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Request Logging</Label>
                    <p className="text-sm text-muted-foreground">Log all API requests</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}