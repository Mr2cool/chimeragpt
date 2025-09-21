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
  Database,
  GitBranch,
  ArrowRight,
  MoreHorizontal,
  Calendar,
  Timer
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  total_steps: number;
  completed_steps: number;
  progress: number;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  agent_type: string;
  agent_id?: string;
  name: string;
  description: string;
  order: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  configuration: Record<string, any>;
  dependencies: string[];
  output?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  progress: number;
  current_step?: string;
  results: Record<string, any>;
  error_message?: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'error' | 'paused';
}

const WORKFLOW_TEMPLATES = [
  {
    id: 'code-review-pipeline',
    name: 'Code Review Pipeline',
    description: 'Comprehensive code review with security, performance, and quality checks',
    steps: [
      { agent_type: 'security', name: 'Security Scan', description: 'Scan for vulnerabilities and security issues' },
      { agent_type: 'performance', name: 'Performance Analysis', description: 'Analyze performance bottlenecks' },
      { agent_type: 'code-review', name: 'Code Quality Review', description: 'Review code quality and best practices' },
      { agent_type: 'testing', name: 'Generate Tests', description: 'Generate unit and integration tests' }
    ]
  },
  {
    id: 'deployment-pipeline',
    name: 'Deployment Pipeline',
    description: 'Automated deployment with testing and monitoring',
    steps: [
      { agent_type: 'testing', name: 'Run Tests', description: 'Execute all test suites' },
      { agent_type: 'security', name: 'Security Check', description: 'Final security validation' },
      { agent_type: 'deployment', name: 'Deploy Application', description: 'Deploy to target environment' },
      { agent_type: 'performance', name: 'Monitor Performance', description: 'Monitor post-deployment performance' }
    ]
  },
  {
    id: 'documentation-pipeline',
    name: 'Documentation Pipeline',
    description: 'Generate comprehensive documentation for the project',
    steps: [
      { agent_type: 'code-review', name: 'Code Analysis', description: 'Analyze codebase structure' },
      { agent_type: 'documentation', name: 'Generate API Docs', description: 'Create API documentation' },
      { agent_type: 'documentation', name: 'Generate README', description: 'Create project README' },
      { agent_type: 'documentation', name: 'Generate User Guide', description: 'Create user documentation' }
    ]
  }
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    steps: [] as any[]
  });

  useEffect(() => {
    loadWorkflows();
    loadExecutions();
    loadAgents();
    
    // Set up real-time subscriptions
    const workflowsSubscription = supabase
      .channel('workflows-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows' }, () => {
        loadWorkflows();
      })
      .subscribe();

    const executionsSubscription = supabase
      .channel('executions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_executions' }, () => {
        loadExecutions();
      })
      .subscribe();

    return () => {
      workflowsSubscription.unsubscribe();
      executionsSubscription.unsubscribe();
    };
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    }
  };

  const loadExecutions = async () => {
    try {
      // Mock data for now - in real implementation, this would come from the API
      setExecutions([
        {
          id: '1',
          workflow_id: '1',
          status: 'running',
          started_at: new Date().toISOString(),
          progress: 65,
          current_step: 'Security Scan',
          results: {}
        }
      ]);
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkflow)
      });

      if (response.ok) {
        toast.success('Workflow created successfully');
        setShowCreateDialog(false);
        setNewWorkflow({ name: '', description: '', steps: [] });
        loadWorkflows();
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow');
    }
  };

  const createFromTemplate = async (template: any) => {
    try {
      const workflowData = {
        name: template.name,
        description: template.description,
        steps: template.steps.map((step: any, index: number) => ({
          ...step,
          order: index + 1,
          status: 'pending',
          configuration: {},
          dependencies: index > 0 ? [template.steps[index - 1].name] : []
        }))
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      if (response.ok) {
        toast.success('Workflow created from template');
        setShowTemplateDialog(false);
        loadWorkflows();
      }
    } catch (error) {
      console.error('Error creating workflow from template:', error);
      toast.error('Failed to create workflow from template');
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', workflow_id: workflowId })
      });

      if (response.ok) {
        toast.success('Workflow execution started');
        loadWorkflows();
        loadExecutions();
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error('Failed to execute workflow');
    }
  };

  const pauseWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      });

      if (response.ok) {
        toast.success('Workflow paused');
        loadWorkflows();
      }
    } catch (error) {
      console.error('Error pausing workflow:', error);
      toast.error('Failed to pause workflow');
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Workflow deleted successfully');
        loadWorkflows();
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'running': return <Play className="h-4 w-4 text-green-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'draft': return <Edit className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running': return 'bg-green-500';
      case 'completed': return 'bg-green-600';
      case 'paused': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'draft': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getWorkflowExecution = (workflowId: string) => {
    return executions.find(exec => exec.workflow_id === workflowId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workflows...</p>
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
                <Network className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-2xl font-bold text-foreground">
                  Workflow Management
                </h1>
              </div>
              <Badge variant="secondary" className="bg-chimera-teal-100 text-chimera-teal-800">
                {workflows.length} Workflows
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Workflow</DialogTitle>
                    <DialogDescription>
                      Design a custom workflow to orchestrate your AI agents
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Workflow Name</Label>
                      <Input
                        id="name"
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                        placeholder="Enter workflow name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newWorkflow.description}
                        onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                        placeholder="Describe what this workflow will accomplish"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createWorkflow} disabled={!newWorkflow.name}>
                        Create Workflow
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
                  placeholder="Search workflows..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Workflows Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {filteredWorkflows.map((workflow) => {
            const execution = getWorkflowExecution(workflow.id);
            
            return (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Network className="h-5 w-5" />
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(workflow.status)}
                      <Badge variant="outline" className="text-xs">
                        {workflow.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {workflow.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  {execution && execution.status === 'running' && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Execution Progress</span>
                        <span className="text-sm text-muted-foreground">{execution.progress}%</span>
                      </div>
                      <Progress value={execution.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {execution.current_step}
                      </p>
                    </div>
                  )}

                  {/* Steps Preview */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Workflow Steps</p>
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                      {workflow.steps.slice(0, 4).map((step, index) => (
                        <div key={step.id} className="flex items-center space-x-2 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                            step.status === 'completed' ? 'bg-green-500 text-white' :
                            step.status === 'running' ? 'bg-blue-500 text-white' :
                            step.status === 'failed' ? 'bg-red-500 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          {index < Math.min(workflow.steps.length - 1, 3) && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                      {workflow.steps.length > 4 && (
                        <div className="flex items-center space-x-1">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">+{workflow.steps.length - 4} more</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Steps</p>
                      <p className="font-medium">{workflow.completed_steps}/{workflow.total_steps}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(workflow.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWorkflow(workflow);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      {workflow.status === 'draft' || workflow.status === 'paused' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeWorkflow(workflow.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Execute
                        </Button>
                      ) : workflow.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseWorkflow(workflow.id)}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteWorkflow(workflow.id)}
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
        {filteredWorkflows.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No workflows found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Create your first workflow to orchestrate AI agents'}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button onClick={() => setShowTemplateDialog(true)} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Browse Templates
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Workflow Templates Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Templates</DialogTitle>
            <DialogDescription>
              Choose from pre-built workflow templates to get started quickly
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {WORKFLOW_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Steps:</p>
                    <div className="space-y-2">
                      {template.steps.map((step, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span>{step.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => createFromTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Workflow Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          {selectedWorkflow && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Network className="h-5 w-5" />
                  <span>{selectedWorkflow.name}</span>
                  <Badge variant="outline">{selectedWorkflow.status}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedWorkflow.description}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="steps" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="steps">Workflow Steps</TabsTrigger>
                  <TabsTrigger value="executions">Executions</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="steps" className="space-y-4">
                  <div className="space-y-4">
                    {selectedWorkflow.steps.map((step, index) => (
                      <Card key={step.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                step.status === 'completed' ? 'bg-green-500 text-white' :
                                step.status === 'running' ? 'bg-blue-500 text-white' :
                                step.status === 'failed' ? 'bg-red-500 text-white' :
                                'bg-gray-200 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium">{step.name}</h4>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Agent Type: {step.agent_type}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={step.status === 'completed' ? 'default' : 'secondary'}>
                                {step.status}
                              </Badge>
                              {step.started_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Started: {new Date(step.started_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          {step.error_message && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-600">{step.error_message}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="executions" className="space-y-4">
                  <div className="space-y-4">
                    {executions
                      .filter(exec => exec.workflow_id === selectedWorkflow.id)
                      .map((execution) => (
                        <Card key={execution.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Execution #{execution.id.slice(-8)}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Started: {new Date(execution.started_at).toLocaleString()}
                                </p>
                                {execution.current_step && (
                                  <p className="text-sm text-muted-foreground">
                                    Current Step: {execution.current_step}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant={execution.status === 'completed' ? 'default' : 'secondary'}>
                                  {execution.status}
                                </Badge>
                                <div className="mt-2">
                                  <Progress value={execution.progress} className="w-20 h-2" />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {execution.progress}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Workflow Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Created By</Label>
                          <p className="text-sm text-muted-foreground">{selectedWorkflow.created_by}</p>
                        </div>
                        <div>
                          <Label>Created At</Label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedWorkflow.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label>Last Updated</Label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedWorkflow.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label>Total Steps</Label>
                          <p className="text-sm text-muted-foreground">{selectedWorkflow.total_steps}</p>
                        </div>
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