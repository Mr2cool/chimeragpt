"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bot,
  Brain,
  Shield,
  Code,
  Zap,
  Target,
  GitBranch,
  Play,
  Pause,
  Stop,
  Plus,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Workflow,
  Monitor,
  Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Agent {
  id: string;
  name: string;
  type: 'security' | 'performance' | 'architecture' | 'quality' | 'dependencies' | 'custom';
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  icon: any;
  color: string;
  config: Record<string, any>;
  dependencies: string[];
  outputs: any[];
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  agents: Agent[];
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  createdAt: Date;
  lastRun?: Date;
  executionTime?: number;
}

interface ExecutionLog {
  id: string;
  workflowId: string;
  agentId: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

export default function AgentOrchestratorPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    agents: [] as Agent[]
  });

  const availableAgents: Agent[] = [
    {
      id: 'security-scanner',
      name: 'Security Scanner',
      type: 'security',
      description: 'Scans code for security vulnerabilities and potential threats',
      status: 'idle',
      progress: 0,
      icon: Shield,
      color: 'text-red-500',
      config: { depth: 'deep', includeThirdParty: true },
      dependencies: [],
      outputs: []
    },
    {
      id: 'performance-analyzer',
      name: 'Performance Analyzer',
      type: 'performance',
      description: 'Analyzes code performance and identifies bottlenecks',
      status: 'idle',
      progress: 0,
      icon: Zap,
      color: 'text-yellow-500',
      config: { metrics: ['speed', 'memory', 'cpu'], threshold: 80 },
      dependencies: [],
      outputs: []
    },
    {
      id: 'architecture-reviewer',
      name: 'Architecture Reviewer',
      type: 'architecture',
      description: 'Reviews system architecture and design patterns',
      status: 'idle',
      progress: 0,
      icon: Brain,
      color: 'text-blue-500',
      config: { patterns: ['mvc', 'microservices', 'layered'], complexity: 'medium' },
      dependencies: [],
      outputs: []
    },
    {
      id: 'quality-auditor',
      name: 'Code Quality Auditor',
      type: 'quality',
      description: 'Audits code quality and adherence to best practices',
      status: 'idle',
      progress: 0,
      icon: Target,
      color: 'text-green-500',
      config: { standards: ['clean-code', 'solid', 'dry'], strictness: 'high' },
      dependencies: [],
      outputs: []
    },
    {
      id: 'dependency-analyzer',
      name: 'Dependency Analyzer',
      type: 'dependencies',
      description: 'Analyzes project dependencies and identifies risks',
      status: 'idle',
      progress: 0,
      icon: GitBranch,
      color: 'text-purple-500',
      config: { checkVulnerabilities: true, updateRecommendations: true },
      dependencies: [],
      outputs: []
    }
  ];

  // Mock workflows for demonstration
  useEffect(() => {
    const mockWorkflows: Workflow[] = [
      {
        id: 'workflow-1',
        name: 'Full Security Audit',
        description: 'Comprehensive security analysis with multiple specialized agents',
        agents: [availableAgents[0], availableAgents[4]], // Security + Dependencies
        status: 'completed',
        progress: 100,
        createdAt: new Date('2024-01-15'),
        lastRun: new Date('2024-01-20'),
        executionTime: 45000
      },
      {
        id: 'workflow-2',
        name: 'Performance Optimization',
        description: 'Performance analysis and architecture review workflow',
        agents: [availableAgents[1], availableAgents[2]], // Performance + Architecture
        status: 'running',
        progress: 65,
        createdAt: new Date('2024-01-18'),
        lastRun: new Date(),
        executionTime: 30000
      },
      {
        id: 'workflow-3',
        name: 'Code Quality Assessment',
        description: 'Complete code quality and best practices evaluation',
        agents: [availableAgents[3]], // Quality only
        status: 'draft',
        progress: 0,
        createdAt: new Date('2024-01-22')
      }
    ];
    setWorkflows(mockWorkflows);
    setSelectedWorkflow(mockWorkflows[0]);
  }, []);

  // Mock execution logs
  useEffect(() => {
    const mockLogs: ExecutionLog[] = [
      {
        id: 'log-1',
        workflowId: 'workflow-1',
        agentId: 'security-scanner',
        timestamp: new Date('2024-01-20T10:30:00'),
        level: 'info',
        message: 'Security scan initiated for repository analysis'
      },
      {
        id: 'log-2',
        workflowId: 'workflow-1',
        agentId: 'security-scanner',
        timestamp: new Date('2024-01-20T10:35:00'),
        level: 'warning',
        message: 'Potential vulnerability detected in dependency lodash@4.17.20'
      },
      {
        id: 'log-3',
        workflowId: 'workflow-1',
        agentId: 'dependency-analyzer',
        timestamp: new Date('2024-01-20T10:40:00'),
        level: 'success',
        message: 'Dependency analysis completed successfully'
      },
      {
        id: 'log-4',
        workflowId: 'workflow-2',
        agentId: 'performance-analyzer',
        timestamp: new Date(),
        level: 'info',
        message: 'Performance analysis in progress - analyzing bundle size'
      }
    ];
    setExecutionLogs(mockLogs);
  }, []);

  const createWorkflow = () => {
    const workflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: newWorkflow.name,
      description: newWorkflow.description,
      agents: newWorkflow.agents,
      status: 'draft',
      progress: 0,
      createdAt: new Date()
    };
    setWorkflows(prev => [...prev, workflow]);
    setNewWorkflow({ name: '', description: '', agents: [] });
    setIsCreateDialogOpen(false);
  };

  const executeWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    // Update workflow status
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, status: 'running', lastRun: new Date() } : w
    ));

    // Simulate agent execution
    for (let i = 0; i < workflow.agents.length; i++) {
      const agent = workflow.agents[i];
      
      // Update agent status
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflowId) {
          const updatedAgents = [...w.agents];
          updatedAgents[i] = { ...agent, status: 'running' };
          return { ...w, agents: updatedAgents, progress: (i / workflow.agents.length) * 100 };
        }
        return w;
      }));

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 25) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setWorkflows(prev => prev.map(w => {
          if (w.id === workflowId) {
            const updatedAgents = [...w.agents];
            updatedAgents[i] = { ...agent, progress };
            return { ...w, agents: updatedAgents };
          }
          return w;
        }));
      }

      // Complete agent
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflowId) {
          const updatedAgents = [...w.agents];
          updatedAgents[i] = { ...agent, status: 'completed', progress: 100 };
          return { ...w, agents: updatedAgents };
        }
        return w;
      }));
    }

    // Complete workflow
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, status: 'completed', progress: 100 } : w
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-chimera-blue-50 to-chimera-teal-50">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-chimera-blue-200"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600 rounded-xl">
                <Workflow className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-chimera-blue-900 to-chimera-teal-700 bg-clip-text text-transparent">
                  Agent Orchestrator
                </h1>
                <p className="text-chimera-blue-600 mt-1">Design, manage, and execute multi-agent workflows</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600 hover:from-chimera-blue-700 hover:to-chimera-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Design a custom workflow by selecting and configuring AI agents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Workflow Name</label>
                    <Input
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the workflow purpose"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Select Agents</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {availableAgents.map((agent) => {
                        const Icon = agent.icon;
                        const isSelected = newWorkflow.agents.some(a => a.id === agent.id);
                        return (
                          <div
                            key={agent.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-chimera-blue-500 bg-chimera-blue-50' 
                                : 'border-gray-200 hover:border-chimera-blue-300'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setNewWorkflow(prev => ({
                                  ...prev,
                                  agents: prev.agents.filter(a => a.id !== agent.id)
                                }));
                              } else {
                                setNewWorkflow(prev => ({
                                  ...prev,
                                  agents: [...prev.agents, agent]
                                }));
                              }
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className={`w-4 h-4 ${agent.color}`} />
                              <div>
                                <div className="font-medium text-sm">{agent.name}</div>
                                <div className="text-xs text-gray-500">{agent.type}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createWorkflow}
                    disabled={!newWorkflow.name || newWorkflow.agents.length === 0}
                  >
                    Create Workflow
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
            <TabsTrigger value="monitor">Execution Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Workflow List */}
              <div className="lg:col-span-2 space-y-4">
                {workflows.map((workflow) => (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`cursor-pointer transition-all ${
                      selectedWorkflow?.id === workflow.id ? 'ring-2 ring-chimera-blue-500' : ''
                    }`}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200 hover:shadow-lg">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(workflow.status)}
                            <div>
                              <CardTitle className="text-lg text-chimera-blue-900">{workflow.name}</CardTitle>
                              <p className="text-sm text-chimera-blue-600">{workflow.description}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={workflow.status === 'completed' ? 'default' : 
                                   workflow.status === 'running' ? 'secondary' : 'outline'}
                            className={workflow.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                     workflow.status === 'running' ? 'bg-blue-100 text-blue-800' : ''}
                          >
                            {workflow.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-chimera-blue-600">Progress</span>
                            <span className="font-medium">{workflow.progress}%</span>
                          </div>
                          <Progress value={workflow.progress} className="h-2" />
                          <div className="flex items-center justify-between text-sm text-chimera-blue-600">
                            <span>{workflow.agents.length} agents</span>
                            <span>Created {workflow.createdAt.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                executeWorkflow(workflow.id);
                              }}
                              disabled={workflow.status === 'running'}
                              className="bg-chimera-blue-600 hover:bg-chimera-blue-700"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              {workflow.status === 'running' ? 'Running' : 'Execute'}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="w-3 h-3 mr-1" />
                              Configure
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Workflow Details */}
              <div className="space-y-6">
                {selectedWorkflow && (
                  <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
                    <CardHeader>
                      <CardTitle className="text-xl text-chimera-blue-900">Workflow Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-chimera-blue-900 mb-2">Agents ({selectedWorkflow.agents.length})</h4>
                        <div className="space-y-2">
                          {selectedWorkflow.agents.map((agent, index) => {
                            const Icon = agent.icon;
                            return (
                              <div key={agent.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                <Icon className={`w-4 h-4 ${agent.color}`} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{agent.name}</div>
                                  <div className="text-xs text-gray-500">{agent.type}</div>
                                </div>
                                {getStatusIcon(agent.status)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-chimera-blue-600">Status:</span>
                          <span className="font-medium capitalize">{selectedWorkflow.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-chimera-blue-600">Created:</span>
                          <span className="font-medium">{selectedWorkflow.createdAt.toLocaleDateString()}</span>
                        </div>
                        {selectedWorkflow.lastRun && (
                          <div className="flex justify-between">
                            <span className="text-chimera-blue-600">Last Run:</span>
                            <span className="font-medium">{selectedWorkflow.lastRun.toLocaleDateString()}</span>
                          </div>
                        )}
                        {selectedWorkflow.executionTime && (
                          <div className="flex justify-between">
                            <span className="text-chimera-blue-600">Execution Time:</span>
                            <span className="font-medium">{Math.round(selectedWorkflow.executionTime / 1000)}s</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="designer" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-chimera-blue-900 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Workflow Designer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Workflow className="w-16 h-16 text-chimera-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-chimera-blue-900 mb-2">Visual Workflow Designer</h3>
                  <p className="text-chimera-blue-600 mb-6">Drag and drop interface for creating complex agent workflows</p>
                  <Button className="bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Start Designing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-chimera-blue-900 flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Execution Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-chimera-blue-900">Real-time Execution Logs</h4>
                    <Button size="sm" variant="outline">
                      <Activity className="w-3 h-3 mr-1" />
                      Live View
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {executionLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-3 rounded-lg border text-sm ${getLogLevelColor(log.level)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{log.level.toUpperCase()}</span>
                          <span className="text-xs opacity-75">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="font-medium mb-1">Agent: {log.agentId}</div>
                        <div>{log.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}