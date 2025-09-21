"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  BarChart3, 
  Bot, 
  Brain, 
  Code, 
  GitBranch, 
  Globe, 
  Lightbulb, 
  Plus, 
  Search, 
  Settings, 
  TrendingUp, 
  Users, 
  Zap,
  Store,
  Network,
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  StopCircle
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { agentManager } from "@/services/agent-manager";
import { toast } from "sonner";
import { AgentMarketplace } from "@/components/agent-marketplace"
import { AgentManagement } from "@/components/agent-management"
import { EnterpriseFeatures } from "@/components/enterprise-features";
import { PluginSystem } from "@/components/plugin-system";
import { AgentAnalytics } from "@/components/agent-analytics";
import { AgentTesting } from "@/components/agent-testing";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'error' | 'stopped';
  created_at: string;
  updated_at: string;
  config: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agent_id: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalRepositories: number;
  activeAnalyses: number;
  completedInsights: number;
  runningAgents: number;
  totalAgents: number;
  completedTasks: number;
  pendingTasks: number;
}

interface RecentActivity {
  id: string;
  type: 'analysis' | 'insight' | 'workflow';
  title: string;
  timestamp: string;
  status: 'completed' | 'running' | 'failed';
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRepositories: 0,
    activeAnalyses: 0,
    completedInsights: 0,
    runningAgents: 0,
    totalAgents: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    setupRealtimeSubscriptions();
  }, []);

  const loadDashboardData = async () => {
    try {
      const supabase = createClient();
      
      // Load repositories count
      const { count: repoCount } = await supabase
        .from('repositories')
        .select('*', { count: 'exact', head: true });
      
      // Load analyses count
      const { count: analysesCount } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');
      
      // Load insights count
      const { count: insightsCount } = await supabase
        .from('insights')
        .select('*', { count: 'exact', head: true });
      
      // Load agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error loading agents:', agentsError);
      } else {
        setAgents(agentsData || []);
      }

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (tasksError) {
        console.error('Error loading tasks:', tasksError);
      } else {
        setTasks(tasksData || []);
      }

      // Calculate stats
      const runningAgents = agentsData?.filter(a => a.status === 'active').length || 0;
      const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
      const pendingTasks = tasksData?.filter(t => t.status === 'pending').length || 0;

      setStats({
        totalRepositories: repoCount || 0,
        activeAnalyses: analysesCount || 0,
        completedInsights: insightsCount || 0,
        runningAgents,
        totalAgents: agentsData?.length || 0,
        completedTasks,
        pendingTasks
      });

      // Generate recent activity from tasks and agents
      const activity = [];
      
      // Add recent task activities
      tasksData?.slice(0, 5).forEach(task => {
        activity.push({
          id: `task-${task.id}`,
          title: task.title,
          type: 'task',
          status: task.status,
          timestamp: formatTimestamp(task.updated_at)
        });
      });

      // Add recent agent activities
      agentsData?.slice(0, 3).forEach(agent => {
        activity.push({
          id: `agent-${agent.id}`,
          title: `${agent.name} ${agent.status}`,
          type: 'agent',
          status: agent.status,
          timestamp: formatTimestamp(agent.updated_at)
        });
      });

      // Sort by most recent and take top 6
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 6));



    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const supabase = createClient();

    // Subscribe to agents changes
    const agentsSubscription = supabase
      .channel('agents-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    // Subscribe to tasks changes
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      agentsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
    };
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const handleAgentAction = async (agentId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Failed to perform agent action');
      }

      toast.success(`Agent ${action} successful`);
      loadDashboardData();
    } catch (error) {
      console.error('Error performing agent action:', error);
      toast.error(`Failed to ${action} agent`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'bg-chimera-teal-600';
      case 'running':
        return 'bg-chimera-blue-600';
      case 'failed':
      case 'error':
        return 'bg-red-500';
      case 'idle':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Search className="h-4 w-4" />;
      case 'insight':
        return <Lightbulb className="h-4 w-4" />;
      case 'workflow':
        return <Bot className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
                <Brain className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-2xl font-bold text-foreground">
                  ChimeraGPT
                </h1>
              </div>
              <Badge variant="secondary" className="bg-chimera-teal-100 text-chimera-teal-800">
                v2.0
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="font-headline text-3xl font-bold text-foreground mb-2">
            Welcome to your AI-Powered Development Hub
          </h2>
          <p className="text-muted-foreground text-lg">
            Orchestrate intelligent agents, analyze repositories, and gain deep insights into your codebase.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8"
        >
          <Card className="border-l-4 border-l-chimera-blue-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chimera-blue-900">{stats.totalRepositories}</div>
              <p className="text-xs text-muted-foreground">Connected and analyzed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chimera-teal-600">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Analyses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chimera-teal-700">{stats.activeAnalyses}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chimera-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insights Generated</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chimera-blue-700">{stats.completedInsights}</div>
              <p className="text-xs text-muted-foreground">AI-powered recommendations</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chimera-teal-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chimera-teal-600">
                {stats.runningAgents}/{stats.totalAgents}
              </div>
              <p className="text-xs text-muted-foreground">Active/Total agents</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">Successfully finished</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingTasks}</div>
              <p className="text-xs text-muted-foreground">Waiting to execute</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-10">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Agent Status</TabsTrigger>
              <TabsTrigger value="insights">Recent Insights</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
              <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
              <TabsTrigger value="plugins">Plugins</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Recent Activity</span>
                    </CardTitle>
                    <CardDescription>
                      Latest updates from your AI agents and analyses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                        <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.timestamp}
                          </p>
                        </div>
                        <Badge 
                          variant={activity.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Quick Actions</span>
                    </CardTitle>
                    <CardDescription>
                      Start new analyses and workflows
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/agents">
                        <Bot className="h-4 w-4 mr-2" />
                        Manage Agents
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/workflows">
                        <Network className="h-4 w-4 mr-2" />
                        Workflows
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/marketplace">
                        <Store className="h-4 w-4 mr-2" />
                        Marketplace
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link href="/analytics">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="agents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Agent Status Monitor</span>
                    <Button size="sm" asChild>
                      <Link href="/agents">
                        <Plus className="h-4 w-4 mr-2" />
                        New Agent
                      </Link>
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Real-time status of your AI agents and their performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading agents...</p>
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No agents yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first AI agent to start automating your workflow
                      </p>
                      <Button asChild>
                        <Link href="/agents">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Agent
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {agents.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                            <div>
                              <h4 className="font-medium">{agent.name}</h4>
                              <p className="text-sm text-muted-foreground">{agent.type} Agent</p>
                              <p className="text-xs text-muted-foreground">
                                Created {formatTimestamp(agent.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Last updated</p>
                              <p className="text-sm">{formatTimestamp(agent.updated_at)}</p>
                            </div>
                            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                              {agent.status}
                            </Badge>
                            <div className="flex space-x-1">
                              {agent.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAgentAction(agent.id, 'stop')}
                                >
                                  <PauseCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAgentAction(agent.id, 'start')}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAgentAction(agent.id, 'restart')}
                              >
                                <StopCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Tasks & Insights</span>
                    <Button size="sm" asChild>
                      <Link href="/tasks">
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                      </Link>
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Latest tasks and AI-generated insights from your agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading tasks...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create tasks for your agents to start generating insights
                      </p>
                      <Button asChild>
                        <Link href="/tasks">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Task
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">{task.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                task.status === 'completed' ? 'default' :
                                task.status === 'running' ? 'secondary' :
                                task.status === 'failed' ? 'destructive' : 'outline'
                              }
                            >
                              {task.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Agent: {task.agent_id}</span>
                            <span>Updated {formatTimestamp(task.updated_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AgentAnalytics />
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-4">
              <AgentMarketplace />
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              <AgentManagement />
            </TabsContent>

            <TabsContent value="enterprise" className="space-y-4">
              <EnterpriseFeatures />
            </TabsContent>
            
            <TabsContent value="plugins" className="space-y-4">
              <PluginSystem />
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
               <AgentAnalytics />
             </TabsContent>
             
            <TabsContent value="testing" className="space-y-4">
              <AgentTesting />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}