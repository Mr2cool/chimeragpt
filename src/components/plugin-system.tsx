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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { 
  Puzzle, 
  Download, 
  Upload, 
  Settings, 
  Code, 
  Package, 
  Star, 
  Users, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause, 
  RotateCcw,
  ExternalLink,
  Shield,
  Zap,
  Database,
  Globe,
  BarChart3
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from '@/lib/supabase'

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: 'integration' | 'utility' | 'ai-model' | 'data-source' | 'security' | 'monitoring'
  status: 'active' | 'inactive' | 'error' | 'updating'
  installed: boolean
  enabled: boolean
  rating: number
  downloads: number
  lastUpdated: string
  dependencies: string[]
  permissions: string[]
  configuration: PluginConfig
  documentation?: string
  repository?: string
  license: string
  size: string
}

interface PluginConfig {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect'
    value: any
    required: boolean
    description: string
    options?: string[]
  }
}

interface PluginTemplate {
  id: string
  name: string
  description: string
  category: string
  template: string
  variables: TemplateVariable[]
}

interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
  defaultValue?: any
}

export function PluginSystem() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [templates, setTemplates] = useState<PluginTemplate[]>([])
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPluginData, setNewPluginData] = useState({
    name: '',
    description: '',
    category: 'utility',
    template: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadPluginData()
  }, [])

  const loadPluginData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadPlugins(),
        loadTemplates()
      ])
    } catch (error) {
      console.error('Error loading plugin data:', error)
      toast.error('Failed to load plugin data')
    } finally {
      setLoading(false)
    }
  }

  const loadPlugins = async () => {
    // Mock data for demonstration
    const mockPlugins: Plugin[] = [
      {
        id: '1',
        name: 'GitHub Integration',
        description: 'Connect agents to GitHub repositories for code analysis and automation',
        version: '2.1.0',
        author: 'ChimeraGPT Team',
        category: 'integration',
        status: 'active',
        installed: true,
        enabled: true,
        rating: 4.8,
        downloads: 15420,
        lastUpdated: '2024-12-15',
        dependencies: ['octokit', 'node-fetch'],
        permissions: ['read:repo', 'write:repo', 'read:user'],
        configuration: {
          apiToken: {
            type: 'string',
            value: '',
            required: true,
            description: 'GitHub Personal Access Token'
          },
          defaultBranch: {
            type: 'string',
            value: 'main',
            required: false,
            description: 'Default branch for operations'
          },
          enableWebhooks: {
            type: 'boolean',
            value: true,
            required: false,
            description: 'Enable webhook notifications'
          }
        },
        repository: 'https://github.com/chimeragpt/github-plugin',
        license: 'MIT',
        size: '2.3 MB'
      },
      {
        id: '2',
        name: 'OpenAI GPT-4 Turbo',
        description: 'Advanced AI model integration for enhanced agent capabilities',
        version: '1.5.2',
        author: 'OpenAI',
        category: 'ai-model',
        status: 'active',
        installed: true,
        enabled: true,
        rating: 4.9,
        downloads: 28750,
        lastUpdated: '2024-12-18',
        dependencies: ['openai'],
        permissions: ['api:openai'],
        configuration: {
          apiKey: {
            type: 'string',
            value: '',
            required: true,
            description: 'OpenAI API Key'
          },
          model: {
            type: 'select',
            value: 'gpt-4-turbo',
            required: true,
            description: 'Model to use',
            options: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
          },
          maxTokens: {
            type: 'number',
            value: 4096,
            required: false,
            description: 'Maximum tokens per request'
          }
        },
        license: 'Commercial',
        size: '1.8 MB'
      },
      {
        id: '3',
        name: 'Slack Notifications',
        description: 'Send agent notifications and updates to Slack channels',
        version: '1.2.1',
        author: 'Community',
        category: 'integration',
        status: 'inactive',
        installed: true,
        enabled: false,
        rating: 4.3,
        downloads: 8920,
        lastUpdated: '2024-12-10',
        dependencies: ['@slack/web-api'],
        permissions: ['chat:write', 'channels:read'],
        configuration: {
          botToken: {
            type: 'string',
            value: '',
            required: true,
            description: 'Slack Bot Token'
          },
          defaultChannel: {
            type: 'string',
            value: '#general',
            required: false,
            description: 'Default notification channel'
          }
        },
        license: 'Apache 2.0',
        size: '1.1 MB'
      },
      {
        id: '4',
        name: 'Database Connector',
        description: 'Connect agents to various databases for data operations',
        version: '3.0.0',
        author: 'ChimeraGPT Team',
        category: 'data-source',
        status: 'updating',
        installed: true,
        enabled: true,
        rating: 4.6,
        downloads: 12340,
        lastUpdated: '2024-12-19',
        dependencies: ['pg', 'mysql2', 'mongodb'],
        permissions: ['db:read', 'db:write'],
        configuration: {
          dbType: {
            type: 'select',
            value: 'postgresql',
            required: true,
            description: 'Database type',
            options: ['postgresql', 'mysql', 'mongodb', 'sqlite']
          },
          connectionString: {
            type: 'string',
            value: '',
            required: true,
            description: 'Database connection string'
          },
          poolSize: {
            type: 'number',
            value: 10,
            required: false,
            description: 'Connection pool size'
          }
        },
        license: 'MIT',
        size: '4.2 MB'
      },
      {
        id: '5',
        name: 'Security Scanner Pro',
        description: 'Advanced security scanning and vulnerability detection',
        version: '2.3.1',
        author: 'SecureCode Inc.',
        category: 'security',
        status: 'error',
        installed: true,
        enabled: false,
        rating: 4.7,
        downloads: 6780,
        lastUpdated: '2024-12-12',
        dependencies: ['semver', 'node-fetch'],
        permissions: ['file:read', 'network:scan'],
        configuration: {
          scanDepth: {
            type: 'select',
            value: 'deep',
            required: false,
            description: 'Scanning depth',
            options: ['surface', 'medium', 'deep']
          },
          enableRealTime: {
            type: 'boolean',
            value: false,
            required: false,
            description: 'Enable real-time scanning'
          }
        },
        license: 'Commercial',
        size: '3.7 MB'
      }
    ]
    setPlugins(mockPlugins)
  }

  const loadTemplates = async () => {
    const mockTemplates: PluginTemplate[] = [
      {
        id: '1',
        name: 'Basic Integration Plugin',
        description: 'Template for creating basic integration plugins',
        category: 'integration',
        template: `
class {{pluginName}}Plugin {
  constructor(config) {
    this.config = config;
    this.name = '{{pluginName}}';
    this.version = '{{version}}';
  }

  async initialize() {
    // Initialize plugin
    console.log('Initializing {{pluginName}} plugin');
  }

  async execute(input) {
    // Plugin execution logic
    return {
      success: true,
      data: input
    };
  }

  async cleanup() {
    // Cleanup resources
    console.log('Cleaning up {{pluginName}} plugin');
  }
}

module.exports = {{pluginName}}Plugin;
        `,
        variables: [
          {
            name: 'pluginName',
            type: 'string',
            description: 'Name of the plugin',
            required: true
          },
          {
            name: 'version',
            type: 'string',
            description: 'Plugin version',
            required: true,
            defaultValue: '1.0.0'
          }
        ]
      },
      {
        id: '2',
        name: 'AI Model Plugin',
        description: 'Template for AI model integration plugins',
        category: 'ai-model',
        template: `
class {{modelName}}Plugin {
  constructor(config) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.model = config.model || '{{defaultModel}}';
  }

  async generateResponse(prompt, options = {}) {
    try {
      // AI model API call logic
      const response = await this.callAPI(prompt, options);
      return {
        success: true,
        response: response.data,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async callAPI(prompt, options) {
    // Implement API call logic
    throw new Error('API call not implemented');
  }
}

module.exports = {{modelName}}Plugin;
        `,
        variables: [
          {
            name: 'modelName',
            type: 'string',
            description: 'Name of the AI model',
            required: true
          },
          {
            name: 'defaultModel',
            type: 'string',
            description: 'Default model identifier',
            required: true
          }
        ]
      }
    ]
    setTemplates(mockTemplates)
  }

  const handlePluginAction = async (action: string, pluginId: string) => {
    try {
      const plugin = plugins.find(p => p.id === pluginId)
      if (!plugin) return

      switch (action) {
        case 'enable':
          plugin.enabled = true
          plugin.status = 'active'
          break
        case 'disable':
          plugin.enabled = false
          plugin.status = 'inactive'
          break
        case 'install':
          plugin.installed = true
          plugin.status = 'active'
          break
        case 'uninstall':
          plugin.installed = false
          plugin.enabled = false
          plugin.status = 'inactive'
          break
        case 'update':
          plugin.status = 'updating'
          // Simulate update process
          setTimeout(() => {
            plugin.status = 'active'
            setPlugins([...plugins])
          }, 2000)
          break
      }

      setPlugins([...plugins])
      toast.success(`Plugin ${action} successful`)
    } catch (error) {
      toast.error(`Failed to ${action} plugin`)
    }
  }

  const handleConfigUpdate = async (pluginId: string, config: PluginConfig) => {
    try {
      const plugin = plugins.find(p => p.id === pluginId)
      if (plugin) {
        plugin.configuration = config
        setPlugins([...plugins])
        toast.success('Configuration updated')
      }
    } catch (error) {
      toast.error('Failed to update configuration')
    }
  }

  const createPluginFromTemplate = async () => {
    try {
      // Implement plugin creation logic
      toast.success('Plugin created successfully')
      setShowCreateDialog(false)
      setNewPluginData({ name: '', description: '', category: 'utility', template: '' })
      await loadPlugins()
    } catch (error) {
      toast.error('Failed to create plugin')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      updating: 'bg-blue-100 text-blue-800'
    }
    return variants[status as keyof typeof variants] || variants.inactive
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      integration: Globe,
      utility: Zap,
      'ai-model': Code,
      'data-source': Database,
      security: Shield,
      monitoring: BarChart3
    }
    const Icon = icons[category as keyof typeof icons] || Package
    return <Icon className="h-4 w-4" />
  }

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = searchTerm === '' || 
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || plugin.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || plugin.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

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
          <h2 className="text-2xl font-bold tracking-tight">Plugin System</h2>
          <p className="text-muted-foreground">
            Extend agent capabilities with plugins and integrations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Plugin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Plugin</DialogTitle>
                <DialogDescription>
                  Create a custom plugin using our templates
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plugin-name">Plugin Name</Label>
                    <Input
                      id="plugin-name"
                      value={newPluginData.name}
                      onChange={(e) => setNewPluginData({...newPluginData, name: e.target.value})}
                      placeholder="My Custom Plugin"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plugin-category">Category</Label>
                    <Select 
                      value={newPluginData.category} 
                      onValueChange={(value) => setNewPluginData({...newPluginData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="integration">Integration</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="ai-model">AI Model</SelectItem>
                        <SelectItem value="data-source">Data Source</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="plugin-description">Description</Label>
                  <Textarea
                    id="plugin-description"
                    value={newPluginData.description}
                    onChange={(e) => setNewPluginData({...newPluginData, description: e.target.value})}
                    placeholder="Describe what your plugin does..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Template</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {templates.map((template) => (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-colors ${
                          newPluginData.template === template.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setNewPluginData({...newPluginData, template: template.id})}
                      >
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createPluginFromTemplate}>
                  Create Plugin
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <Tabs defaultValue="installed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
              <SelectItem value="ai-model">AI Model</SelectItem>
              <SelectItem value="data-source">Data Source</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="updating">Updating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="installed" className="space-y-4">
          <div className="grid gap-4">
            {filteredPlugins.filter(p => p.installed).map((plugin) => (
              <motion.div
                key={plugin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getCategoryIcon(plugin.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{plugin.name}</h3>
                        <Badge variant="outline">v{plugin.version}</Badge>
                        <Badge className={getStatusBadge(plugin.status)}>
                          {plugin.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plugin.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {plugin.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {plugin.downloads.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {plugin.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {plugin.lastUpdated}
                        </span>
                        <span>{plugin.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={plugin.enabled}
                      onCheckedChange={() => handlePluginAction(plugin.enabled ? 'disable' : 'enable', plugin.id)}
                      disabled={plugin.status === 'error' || plugin.status === 'updating'}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPlugin(plugin)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePluginAction('update', plugin.id)}
                      disabled={plugin.status === 'updating'}
                    >
                      {plugin.status === 'updating' ? (
                        <RotateCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePluginAction('uninstall', plugin.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {plugin.status === 'error' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Plugin Error</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      This plugin encountered an error and has been disabled. Check the logs for more details.
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid gap-4">
            {filteredPlugins.filter(p => !p.installed).map((plugin) => (
              <motion.div
                key={plugin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getCategoryIcon(plugin.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{plugin.name}</h3>
                        <Badge variant="outline">v{plugin.version}</Badge>
                        <Badge variant="secondary">{plugin.license}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plugin.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {plugin.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {plugin.downloads.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {plugin.rating}
                        </span>
                        <span>{plugin.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => handlePluginAction('install', plugin.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Install
                    </Button>
                    {plugin.repository && (
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge variant="outline">{template.category}</Badge>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Template Variables:</h4>
                      <div className="space-y-1">
                        {template.variables.map((variable) => (
                          <div key={variable.name} className="text-xs text-muted-foreground">
                            <code className="bg-gray-100 px-1 rounded">{variable.name}</code>
                            {variable.required && <span className="text-red-500 ml-1">*</span>}
                            <span className="ml-2">{variable.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Plugin Development
              </CardTitle>
              <CardDescription>
                Tools and resources for developing custom plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Plugin SDK</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Download the official SDK for plugin development
                      </p>
                      <Button size="sm" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download SDK
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">Documentation</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Complete guide for plugin development
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Docs
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Plugin Testing</h3>
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Test Environment</span>
                      <Badge className="bg-green-100 text-green-800">Ready</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Start Test
                      </Button>
                      <Button size="sm" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Load Plugin
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plugin Configuration Dialog */}
      {selectedPlugin && (
        <Dialog open={!!selectedPlugin} onOpenChange={() => setSelectedPlugin(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure {selectedPlugin.name}</DialogTitle>
              <DialogDescription>
                Update plugin configuration and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {Object.entries(selectedPlugin.configuration).map(([key, config]) => (
                <div key={key}>
                  <Label htmlFor={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {config.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
                  {config.type === 'string' && (
                    <Input
                      id={key}
                      value={config.value}
                      onChange={(e) => {
                        const newConfig = { ...selectedPlugin.configuration }
                        newConfig[key].value = e.target.value
                        setSelectedPlugin({ ...selectedPlugin, configuration: newConfig })
                      }}
                    />
                  )}
                  {config.type === 'number' && (
                    <Input
                      id={key}
                      type="number"
                      value={config.value}
                      onChange={(e) => {
                        const newConfig = { ...selectedPlugin.configuration }
                        newConfig[key].value = parseInt(e.target.value)
                        setSelectedPlugin({ ...selectedPlugin, configuration: newConfig })
                      }}
                    />
                  )}
                  {config.type === 'boolean' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={key}
                        checked={config.value}
                        onCheckedChange={(checked) => {
                          const newConfig = { ...selectedPlugin.configuration }
                          newConfig[key].value = checked
                          setSelectedPlugin({ ...selectedPlugin, configuration: newConfig })
                        }}
                      />
                      <Label htmlFor={key}>Enable</Label>
                    </div>
                  )}
                  {config.type === 'select' && config.options && (
                    <Select 
                      value={config.value} 
                      onValueChange={(value) => {
                        const newConfig = { ...selectedPlugin.configuration }
                        newConfig[key].value = value
                        setSelectedPlugin({ ...selectedPlugin, configuration: newConfig })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPlugin(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                handleConfigUpdate(selectedPlugin.id, selectedPlugin.configuration)
                setSelectedPlugin(null)
              }}>
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}