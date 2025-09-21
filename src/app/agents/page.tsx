"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  Brain,
  Code,
  FileText,
  Shield,
  Zap,
  Search,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  Network,
  Database
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'active' | 'idle' | 'error' | 'paused';
  capabilities: string[];
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  success_rate: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
}

interface Task {
  id: string;
  agent_id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at?: string;
  result?: any;
}

interface AgentTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  default_config: Record<string, any>;
}

const AGENT_TYPES = [
  { value: 'code-review', label: 'Code Review', icon: Code, color: 'bg-blue-500' },
  { value: 'documentation', label: 'Documentation', icon: FileText, color: 'bg-green-500' },
  { value: 'testing', label: 'Testing', icon: CheckCircle, color: 'bg-purple-500' },
  { value: 'deployment', label: 'Deployment', icon: Zap, color: 'bg-orange-500' },
  { value: 'performance', label: 'Performance', icon: TrendingUp, color: 'bg-red-500' },
  { value: 'security', label: 'Security', icon: Shield, color: 'bg-yellow-500' }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    type: '',
    description: '',
    capabilities: [] as string[],
    configuration: {}
  });

  useEffect(() => {
    loadAgents();
    loadTasks();
    loadTemplates();
    
    // Set up real-time subscriptions
    const agentsSubscription = supabase
      .channel('agents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        loadAgents();
      })
      .subscribe();

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      agentsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
    };
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      // Mock templates for now - in real implementation, this would come from the marketplace
      setTemplates([
        {
          id: '1',
          name: 'Security Scanner',
          type: 'security',
          description: 'Comprehensive security analysis and vulnerability detection',
          capabilities: ['vulnerability-scanning', 'compliance-checks', 'code-analysis'],
          default_config: { scan_depth: 'deep', include_dependencies: true }
        },
        {
          id: '2',
          name: 'Performance Optimizer',
          type: 'performance',
          description: 'Analyze and optimize application performance',
          capabilities: ['performance-analysis', 'optimization', 'monitoring'],
          default_config: { metrics: ['cpu', 'memory', 'network'], threshold: 80 }
        }
      ]);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      });

      if (response.ok) {
        toast.success('Agent created successfully');
        setShowCreateDialog(false);
        setNewAgent({ name: '', type: '', description: '', capabilities: [], configuration: {} });
        loadAgents();
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    }
  };

  const updateAgentStatus = async (agentId: string, status: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success(`Agent ${status === 'active' ? 'activated' : 'paused'}`);
        loadAgents();
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast.error('Failed to update agent status');
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Agent deleted successfully');
        loadAgents();
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const filteredAgents = (agents || []).filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesType = typeFilter === 'all' || agent.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'idle': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const agentType = AGENT_TYPES.find(t => t.value === type);
    if (agentType) {
      const Icon = agentType.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Bot className="h-4 w-4" />;
  };

  const getAgentTasks = (agentId: string) => {
    return (tasks || []).filter(task => task.agent_id === agentId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-2xl font-bold text-foreground">
                  Agent Management
                </h1>
              </div>
              <Badge variant="secondary" className="bg-chimera-teal-100 text-chimera-teal-800">
                {(agents || []).length} Active
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Agent</DialogTitle>
                    <DialogDescription>
                      Configure a new AI agent to help with your development workflow
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Agent Name</Label>
                        <Input
                          id="name"
                          value={newAgent.name}
                          onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                          placeholder="Enter agent name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Agent Type</Label>
                        <Select value={newAgent.type} onValueChange={(value) => setNewAgent({ ...newAgent, type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {AGENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center space-x-2">
                                  <type.icon className="h-4 w-4" />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newAgent.description}
                        onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                        placeholder="Describe what this agent will do"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createAgent} disabled={!newAgent.name || !newAgent.type}>
                        Create Agent
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Agents Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAgents.map((agent) => {
            const agentTasks = getAgentTasks(agent.id);
            const runningTasks = agentTasks.filter(t => t.status === 'running').length;
            
            return (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(agent.type)}
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(agent.status)}
                      <Badge variant="outline" className="text-xs">
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <div className="flex items-center space-x-2">
                        <Progress value={agent.success_rate} className="flex-1 h-2" />
                        <span className="font-medium">{agent.success_rate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tasks</p>
                      <p className="font-medium">{agent.completed_tasks}/{agent.total_tasks}</p>
                    </div>
                  </div>

                  {/* Running Tasks */}
                  {runningTasks > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-sm font-medium">
                          {runningTasks} task{runningTasks > 1 ? 's' : ''} running
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Capabilities */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {(agent.capabilities || []).slice(0, 3).map((capability, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {capability}
                        </Badge>
                      ))}
                      {(agent.capabilities || []).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(agent.capabilities || []).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAgentStatus(agent.id, agent.status === 'active' ? 'paused' : 'active')}
                      >
                        {agent.status === 'active' ? (
                          <Pause className="h-3 w-3 mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        {agent.status === 'active' ? 'Pause' : 'Start'}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteAgent(agent.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Create your first AI agent to get started'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </motion.div>
        )}
      </div>

      {/* Agent Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  {getTypeIcon(selectedAgent.type)}
                  <span>{selectedAgent.name}</span>
                  <Badge variant="outline">{selectedAgent.status}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedAgent.description}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Performance Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Success Rate</span>
                            <span>{selectedAgent.success_rate}%</span>
                          </div>
                          <Progress value={selectedAgent.success_rate} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Tasks</p>
                            <p className="text-2xl font-bold">{selectedAgent.total_tasks}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{selectedAgent.completed_tasks}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Capabilities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {(selectedAgent.capabilities || []).map((capability, index) => (
                            <Badge key={index} variant="secondary">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="tasks" className="space-y-4">
                  <div className="space-y-4">
                    {getAgentTasks(selectedAgent.id).map((task) => (
                      <Card key={task.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{task.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Created {new Date(task.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                                {task.status}
                              </Badge>
                              {task.status === 'running' && (
                                <div className="mt-2">
                                  <Progress value={task.progress} className="w-20 h-2" />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="config" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                        {JSON.stringify(selectedAgent.configuration, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="logs" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No logs available</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}