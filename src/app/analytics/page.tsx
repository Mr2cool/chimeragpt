"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Bot,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Network,
  Cpu,
  Memory,
  HardDrive,
  Wifi,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DateRange } from "react-day-picker";

interface AnalyticsData {
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    completedTasks: number;
    totalWorkflows: number;
    activeWorkflows: number;
    avgExecutionTime: number;
    successRate: number;
  };
  agentPerformance: Array<{
    agent_type: string;
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    avg_execution_time: number;
    success_rate: number;
  }>;
  taskTrends: Array<{
    date: string;
    completed: number;
    failed: number;
    total: number;
  }>;
  workflowMetrics: Array<{
    workflow_name: string;
    executions: number;
    success_rate: number;
    avg_duration: number;
  }>;
  systemMetrics: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_latency: number;
    active_connections: number;
  };
  errorAnalysis: Array<{
    error_type: string;
    count: number;
    percentage: number;
  }>;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      loadAnalyticsData(true); // Silent refresh
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [dateRange]);

  const loadAnalyticsData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(!silent);
    
    try {
      // In a real implementation, this would fetch from your analytics API
      // For now, we'll generate mock data based on the current state
      const mockData: AnalyticsData = {
        overview: {
          totalAgents: 12,
          activeAgents: 8,
          totalTasks: 1247,
          completedTasks: 1089,
          totalWorkflows: 23,
          activeWorkflows: 5,
          avgExecutionTime: 145.7,
          successRate: 87.3
        },
        agentPerformance: [
          {
            agent_type: 'Code Review',
            total_tasks: 234,
            completed_tasks: 210,
            failed_tasks: 24,
            avg_execution_time: 120.5,
            success_rate: 89.7
          },
          {
            agent_type: 'Security',
            total_tasks: 189,
            completed_tasks: 165,
            failed_tasks: 24,
            avg_execution_time: 98.3,
            success_rate: 87.3
          },
          {
            agent_type: 'Testing',
            total_tasks: 156,
            completed_tasks: 142,
            failed_tasks: 14,
            avg_execution_time: 203.1,
            success_rate: 91.0
          },
          {
            agent_type: 'Documentation',
            total_tasks: 134,
            completed_tasks: 125,
            failed_tasks: 9,
            avg_execution_time: 87.6,
            success_rate: 93.3
          },
          {
            agent_type: 'Performance',
            total_tasks: 98,
            completed_tasks: 89,
            failed_tasks: 9,
            avg_execution_time: 156.8,
            success_rate: 90.8
          },
          {
            agent_type: 'Deployment',
            total_tasks: 76,
            completed_tasks: 68,
            failed_tasks: 8,
            avg_execution_time: 234.5,
            success_rate: 89.5
          }
        ],
        taskTrends: generateTaskTrends(),
        workflowMetrics: [
          {
            workflow_name: 'Code Review Pipeline',
            executions: 45,
            success_rate: 91.1,
            avg_duration: 18.5
          },
          {
            workflow_name: 'Deployment Pipeline',
            executions: 32,
            success_rate: 87.5,
            avg_duration: 24.3
          },
          {
            workflow_name: 'Documentation Pipeline',
            executions: 28,
            success_rate: 96.4,
            avg_duration: 12.7
          },
          {
            workflow_name: 'Security Audit',
            executions: 19,
            success_rate: 84.2,
            avg_duration: 31.2
          }
        ],
        systemMetrics: {
          cpu_usage: 34.2,
          memory_usage: 67.8,
          disk_usage: 45.3,
          network_latency: 23.4,
          active_connections: 156
        },
        errorAnalysis: [
          { error_type: 'Timeout', count: 45, percentage: 32.1 },
          { error_type: 'API Error', count: 38, percentage: 27.1 },
          { error_type: 'Validation Error', count: 29, percentage: 20.7 },
          { error_type: 'Network Error', count: 18, percentage: 12.9 },
          { error_type: 'Other', count: 10, percentage: 7.1 }
        ]
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateTaskTrends = () => {
    const trends = [];
    const days = 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const completed = Math.floor(Math.random() * 50) + 20;
      const failed = Math.floor(Math.random() * 10) + 2;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        completed,
        failed,
        total: completed + failed
      });
    }
    
    return trends;
  };

  const getMetricCards = (): MetricCard[] => {
    if (!analyticsData) return [];
    
    return [
      {
        title: 'Total Agents',
        value: analyticsData.overview.totalAgents,
        change: 12.5,
        icon: <Bot className="h-4 w-4" />,
        color: 'text-blue-600'
      },
      {
        title: 'Active Agents',
        value: analyticsData.overview.activeAgents,
        change: 8.3,
        icon: <Activity className="h-4 w-4" />,
        color: 'text-green-600'
      },
      {
        title: 'Tasks Completed',
        value: analyticsData.overview.completedTasks.toLocaleString(),
        change: 15.7,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'text-emerald-600'
      },
      {
        title: 'Success Rate',
        value: `${analyticsData.overview.successRate}%`,
        change: 2.1,
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-purple-600'
      },
      {
        title: 'Avg Execution Time',
        value: `${analyticsData.overview.avgExecutionTime}s`,
        change: -5.2,
        icon: <Clock className="h-4 w-4" />,
        color: 'text-orange-600'
      },
      {
        title: 'Active Workflows',
        value: analyticsData.overview.activeWorkflows,
        change: 25.0,
        icon: <Network className="h-4 w-4" />,
        color: 'text-indigo-600'
      }
    ];
  };

  const exportData = async () => {
    try {
      const dataToExport = {
        exported_at: new Date().toISOString(),
        date_range: dateRange,
        analytics: analyticsData
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chimera-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export analytics data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
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
                <TrendingUp className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-2xl font-bold text-foreground">
                  Analytics Dashboard
                </h1>
              </div>
              <Badge variant="secondary" className="bg-chimera-teal-100 text-chimera-teal-800">
                Real-time
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAnalyticsData()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8"
        >
          {getMetricCards().map((metric, index) => (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                  <div className={`${metric.color}`}>
                    {metric.icon}
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  {metric.change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    metric.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(metric.change)}%
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    vs last period
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Main Analytics Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="performance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Performance</CardTitle>
                    <CardDescription>
                      Task completion rates by agent type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData?.agentPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="agent_type" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completed_tasks" fill="#8884d8" name="Completed" />
                        <Bar dataKey="failed_tasks" fill="#ff7300" name="Failed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Success Rates</CardTitle>
                    <CardDescription>
                      Success rate percentage by agent type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData?.agentPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="agent_type" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                        <Bar dataKey="success_rate" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Agent Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Agent Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Agent Type</th>
                          <th className="text-right p-2">Total Tasks</th>
                          <th className="text-right p-2">Completed</th>
                          <th className="text-right p-2">Failed</th>
                          <th className="text-right p-2">Success Rate</th>
                          <th className="text-right p-2">Avg Time (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData?.agentPerformance.map((agent, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{agent.agent_type}</td>
                            <td className="p-2 text-right">{agent.total_tasks}</td>
                            <td className="p-2 text-right text-green-600">{agent.completed_tasks}</td>
                            <td className="p-2 text-right text-red-600">{agent.failed_tasks}</td>
                            <td className="p-2 text-right">
                              <Badge variant={agent.success_rate > 90 ? 'default' : 'secondary'}>
                                {agent.success_rate.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="p-2 text-right">{agent.avg_execution_time.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Execution Trends</CardTitle>
                  <CardDescription>
                    Daily task completion and failure trends over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={analyticsData?.taskTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        stackId="1" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        name="Completed"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="failed" 
                        stackId="1" 
                        stroke="#ff7300" 
                        fill="#ff7300" 
                        name="Failed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Workflows Tab */}
            <TabsContent value="workflows" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Executions</CardTitle>
                    <CardDescription>
                      Number of executions per workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData?.workflowMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="workflow_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="executions" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Success Rates</CardTitle>
                    <CardDescription>
                      Success rate percentage by workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData?.workflowMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="workflow_name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                        <Bar dataKey="success_rate" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Cpu className="h-4 w-4 mr-2" />
                      CPU Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {analyticsData?.systemMetrics.cpu_usage.toFixed(1)}%
                    </div>
                    <Progress value={analyticsData?.systemMetrics.cpu_usage} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Memory className="h-4 w-4 mr-2" />
                      Memory Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {analyticsData?.systemMetrics.memory_usage.toFixed(1)}%
                    </div>
                    <Progress value={analyticsData?.systemMetrics.memory_usage} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <HardDrive className="h-4 w-4 mr-2" />
                      Disk Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {analyticsData?.systemMetrics.disk_usage.toFixed(1)}%
                    </div>
                    <Progress value={analyticsData?.systemMetrics.disk_usage} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Wifi className="h-4 w-4 mr-2" />
                      Network Latency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {analyticsData?.systemMetrics.network_latency.toFixed(1)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {analyticsData?.systemMetrics.active_connections} connections
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Errors Tab */}
            <TabsContent value="errors" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Error Distribution</CardTitle>
                    <CardDescription>
                      Breakdown of error types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData?.errorAnalysis}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analyticsData?.errorAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Error Details</CardTitle>
                    <CardDescription>
                      Detailed error analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData?.errorAnalysis.map((error, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium">{error.error_type}</p>
                              <p className="text-sm text-muted-foreground">
                                {error.count} occurrences
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {error.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}