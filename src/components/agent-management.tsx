'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings, 
  Trash2, 
  Plus,
  Users,
  MessageSquare,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Network,
  Database,
  Code,
  FileText,
  Shield,
  TestTube,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentManager } from '@/lib/agent-manager';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'idle' | 'running' | 'paused' | 'error' | 'completed';
  capabilities: string[];
  config: any;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  current_task?: string;
  performance_metrics?: {
    tasks_completed: number;
    success_rate: number;
    avg_execution_time: number;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agent_id?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  estimated_duration?: number;
  actual_duration?: number;
}

interface AgentCollaboration {
  id: string;
  name: string;
  description: string;
  participating_agents: string[];
  shared_memory: any;
  communication_log: {
    timestamp: string;
    from_agent: string;
    to_agent: string;
    message: string;
    type: 'info' | 'request' | 'response' | 'error';
  }[];
  status: 'active' | 'paused' | 'completed';
}

function getAgentIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'security': return Shield;
    case 'code-review': return Code;
    case 'documentation': return FileText;
    case 'testing': return TestTube;
    case 'deployment': return Rocket;
    case 'performance': return Zap;
    default: return Bot;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'running': return 'bg-green-100 text-green-800';
    case 'paused': return 'bg-yellow-100 text-yellow-800';
    case 'error': return 'bg-red-100 text-red-800';
    case 'completed': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborations, setCollaborations] = useState<AgentCollaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('agents');

  // Agent Creation Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    type: 'general',
    capabilities: [] as string[],
    config: {}
  });

  // Task Assignment Dialog State
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    agent_id: '',
    estimated_duration: 0
  });

  // Collaboration Dialog State
  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const [newCollab, setNewCollab] = useState({
    name: '',
    description: '',
    participating_agents: [] as string[]
  });

  const agentTypes = [
    { value: 'general', label: 'General Purpose' },
    { value: 'security', label: 'Security Agent' },
    { value: 'code-review', label: 'Code Review Agent' },
    { value: 'documentation', label: 'Documentation Agent' },
    { value: 'testing', label: 'Testing Agent' },
    { value: 'deployment', label: 'Deployment Agent' },
    { value: 'performance', label: 'Performance Agent' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load agents
      const agentsResponse = await fetch('/api/agents');
      const agentsData = await agentsResponse.json();
      
      // Load tasks
      const tasksResponse = await fetch('/api/tasks');
      const tasksData = await tasksResponse.json();
      
      if (agentsResponse.ok) {
        setAgents(agentsData.agents || []);
      }
      
      if (tasksResponse.ok) {
        setTasks(tasksData.tasks || []);
      }
      
      // Mock collaborations for now
      setCollaborations([
        {
          id: '1',
          name: 'Security Review Pipeline',
          description: 'Automated security review with code analysis and testing',
          participating_agents: ['security-agent-1', 'code-review-agent-1', 'testing-agent-1'],
          shared_memory: { current_repo: 'user/project', scan_results: [] },
          communication_log: [
            {
              timestamp: new Date().toISOString(),
              from_agent: 'security-agent-1',
              to_agent: 'code-review-agent-1',
              message: 'Found potential security vulnerability in auth.js',
              type: 'info'
            }
          ],
          status: 'active'
        }
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentAction = async (agentId: string, action: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Agent ${action} successfully`);
        loadData(); // Refresh data
      } else {
        toast.error(data.error || `Failed to ${action} agent`);
      }
    } catch (error) {
      console.error(`Error ${action} agent:`, error);
      toast.error(`Error ${action} agent`);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAgent)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Agent created successfully');
        setShowCreateDialog(false);
        setNewAgent({ name: '', description: '', type: 'general', capabilities: [], config: {} });
        loadData();
      } else {
        toast.error(data.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Error creating agent');
    }
  };

  const handleCreateTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTask)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Task created successfully');
        setShowTaskDialog(false);
        setNewTask({ title: '', description: '', priority: 'medium', agent_id: '', estimated_duration: 0 });
        loadData();
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error creating task');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Agent deleted successfully');
        loadData();
      } else {
        toast.error('Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Error deleting agent');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chimera-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your AI agents, orchestrate tasks, and monitor collaborations
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Agent</DialogTitle>
                <DialogDescription>
                  Configure a new AI agent for your workflow
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                    placeholder="Enter agent name"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-type">Agent Type</Label>
                  <Select value={newAgent.type} onValueChange={(value) => setNewAgent({ ...newAgent, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="agent-description">Description</Label>
                  <Textarea
                    id="agent-description"
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                    placeholder="Describe the agent's purpose"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAgent} disabled={!newAgent.name.trim()}>
                    Create Agent
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Assign a new task to an agent
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Task Title</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <Label htmlFor="task-agent">Assign to Agent</Label>
                  <Select value={newTask.agent_id} onValueChange={(value) => setNewTask({ ...newTask, agent_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Describe the task"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask} disabled={!newTask.title.trim()}>
                    Create Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="collaborations">Collaborations ({collaborations.length})</TabsTrigger>
          <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
              <p className="text-gray-600 mb-4">Create your first agent to get started</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent, index) => {
                const IconComponent = getAgentIcon(agent.type);
                
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-chimera-blue-100 rounded-lg">
                              <IconComponent className="h-6 w-6 text-chimera-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{agent.name}</CardTitle>
                              <Badge className={getStatusColor(agent.status)}>
                                {agent.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {agent.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Performance Metrics */}
                          {agent.performance_metrics && (
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <div className="font-semibold text-chimera-blue-600">
                                  {agent.performance_metrics.tasks_completed}
                                </div>
                                <div className="text-gray-600">Tasks</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-green-600">
                                  {(agent.performance_metrics.success_rate * 100).toFixed(0)}%
                                </div>
                                <div className="text-gray-600">Success</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-orange-600">
                                  {agent.performance_metrics.avg_execution_time}s
                                </div>
                                <div className="text-gray-600">Avg Time</div>
                              </div>
                            </div>
                          )}

                          {/* Current Task */}
                          {agent.current_task && (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              <div className="font-medium text-gray-900">Current Task:</div>
                              <div className="text-gray-600">{agent.current_task}</div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex space-x-2">
                            {agent.status === 'idle' && (
                              <Button
                                size="sm"
                                onClick={() => handleAgentAction(agent.id, 'start')}
                                className="flex-1"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                            {agent.status === 'running' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAgentAction(agent.id, 'pause')}
                                  className="flex-1"
                                >
                                  <Pause className="h-4 w-4 mr-1" />
                                  Pause
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleAgentAction(agent.id, 'stop')}
                                  className="flex-1"
                                >
                                  <Square className="h-4 w-4 mr-1" />
                                  Stop
                                </Button>
                              </>
                            )}
                            {agent.status === 'paused' && (
                              <Button
                                size="sm"
                                onClick={() => handleAgentAction(agent.id, 'resume')}
                                className="flex-1"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </Button>
                            )}
                            {(agent.status === 'error' || agent.status === 'completed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAgentAction(agent.id, 'restart')}
                                className="flex-1"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restart
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-4">Create your first task to get started</p>
              <Button onClick={() => setShowTaskDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-2">{task.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {task.agent_id && (
                              <div className="flex items-center space-x-1">
                                <Bot className="h-4 w-4" />
                                <span>{agents.find(a => a.id === task.agent_id)?.name || 'Unknown Agent'}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                            {task.estimated_duration && (
                              <div className="flex items-center space-x-1">
                                <Activity className="h-4 w-4" />
                                <span>{task.estimated_duration}min estimated</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collaborations" className="space-y-4">
          {collaborations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No collaborations found</h3>
              <p className="text-gray-600 mb-4">Set up agent collaborations to enhance workflows</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Collaboration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {collaborations.map((collab, index) => (
                <motion.div
                  key={collab.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <Network className="h-5 w-5 text-chimera-blue-600" />
                            <span>{collab.name}</span>
                          </CardTitle>
                          <CardDescription>{collab.description}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(collab.status)}>
                          {collab.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Participating Agents */}
                        <div>
                          <h4 className="font-medium mb-2">Participating Agents</h4>
                          <div className="flex flex-wrap gap-2">
                            {collab.participating_agents.map(agentId => {
                              const agent = agents.find(a => a.id === agentId);
                              return (
                                <Badge key={agentId} variant="outline">
                                  {agent?.name || agentId}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Recent Communication */}
                        <div>
                          <h4 className="font-medium mb-2">Recent Communication</h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {collab.communication_log.slice(-3).map((log, idx) => (
                              <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                <div className="flex items-center space-x-2 mb-1">
                                  <MessageSquare className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium">{log.from_agent}</span>
                                  <span className="text-gray-500">→</span>
                                  <span className="font-medium">{log.to_agent}</span>
                                  <span className="text-gray-400 text-xs">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-gray-700">{log.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Task Queue</span>
                </CardTitle>
                <CardDescription>
                  Manage task prioritization and scheduling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'pending').slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-gray-600">
                          Priority: <Badge className={getPriorityColor(task.priority)} size="sm">{task.priority}</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'pending').length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pending tasks</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Agent Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Agent Performance</span>
                </CardTitle>
                <CardDescription>
                  Monitor agent efficiency and workload
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.slice(0, 5).map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-gray-600">
                          Status: <Badge className={getStatusColor(agent.status)} size="sm">{agent.status}</Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        {agent.performance_metrics && (
                          <>
                            <div className="font-medium">{agent.performance_metrics.tasks_completed} tasks</div>
                            <div className="text-gray-600">{(agent.performance_metrics.success_rate * 100).toFixed(0)}% success</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No agents available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}