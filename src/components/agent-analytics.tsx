"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw, 
  Eye, 
  Settings,
  Target,
  Cpu,
  HardDrive,
  Network,
  Timer,
  LineChart,
  PieChart,
  BarChart,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from '@/lib/supabase'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area
} from 'recharts'

interface AgentMetrics {
  id: string
  name: string
  status: 'active' | 'idle' | 'error' | 'offline'
  tasksCompleted: number
  tasksInProgress: number
  tasksFailed: number
  averageExecutionTime: number
  successRate: number
  cpuUsage: number
  memoryUsage: number
  networkUsage: number
  uptime: number
  lastActivity: string
  errorCount: number
  performanceScore: number
}

interface SystemMetrics {
  totalAgents: number
  activeAgents: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageResponseTime: number
  systemUptime: number
  resourceUtilization: {
    cpu: number
    memory: number
    storage: number
    network: number
  }
}

interface PerformanceData {
  timestamp: string
  responseTime: number
  throughput: number
  errorRate: number
  cpuUsage: number
  memoryUsage: number
}

interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals'
  threshold: number
  enabled: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function AgentAnalytics() {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadAnalyticsData()
    
    if (autoRefresh) {
      const interval = setInterval(loadAnalyticsData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [timeRange, selectedAgent, refreshInterval, autoRefresh])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadAgentMetrics(),
        loadSystemMetrics(),
        loadPerformanceData(),
        loadAlertRules()
      ])
    } catch (error) {
      console.error('Error loading analytics data:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const loadAgentMetrics = async () => {
    // Mock data for demonstration
    const mockMetrics: AgentMetrics[] = [
      {
        id: '1',
        name: 'Code Review Agent',
        status: 'active',
        tasksCompleted: 245,
        tasksInProgress: 3,
        tasksFailed: 12,
        averageExecutionTime: 2.3,
        successRate: 95.3,
        cpuUsage: 45,
        memoryUsage: 67,
        networkUsage: 23,
        uptime: 99.8,
        lastActivity: '2 minutes ago',
        errorCount: 2,
        performanceScore: 92
      },
      {
        id: '2',
        name: 'Documentation Agent',
        status: 'active',
        tasksCompleted: 189,
        tasksInProgress: 1,
        tasksFailed: 8,
        averageExecutionTime: 1.8,
        successRate: 96.0,
        cpuUsage: 32,
        memoryUsage: 54,
        networkUsage: 18,
        uptime: 99.9,
        lastActivity: '5 minutes ago',
        errorCount: 1,
        performanceScore: 94
      },
      {
        id: '3',
        name: 'Testing Agent',
        status: 'idle',
        tasksCompleted: 156,
        tasksInProgress: 0,
        tasksFailed: 15,
        averageExecutionTime: 3.1,
        successRate: 91.2,
        cpuUsage: 12,
        memoryUsage: 28,
        networkUsage: 5,
        uptime: 98.5,
        lastActivity: '1 hour ago',
        errorCount: 0,
        performanceScore: 88
      },
      {
        id: '4',
        name: 'Security Agent',
        status: 'error',
        tasksCompleted: 98,
        tasksInProgress: 0,
        tasksFailed: 23,
        averageExecutionTime: 4.2,
        successRate: 81.0,
        cpuUsage: 78,
        memoryUsage: 89,
        networkUsage: 45,
        uptime: 95.2,
        lastActivity: '3 hours ago',
        errorCount: 5,
        performanceScore: 72
      },
      {
        id: '5',
        name: 'Deployment Agent',
        status: 'active',
        tasksCompleted: 134,
        tasksInProgress: 2,
        tasksFailed: 6,
        averageExecutionTime: 5.7,
        successRate: 95.7,
        cpuUsage: 56,
        memoryUsage: 72,
        networkUsage: 34,
        uptime: 99.1,
        lastActivity: '10 minutes ago',
        errorCount: 1,
        performanceScore: 91
      }
    ]
    setAgentMetrics(mockMetrics)
  }

  const loadSystemMetrics = async () => {
    const mockSystemMetrics: SystemMetrics = {
      totalAgents: 5,
      activeAgents: 3,
      totalTasks: 1247,
      completedTasks: 1183,
      failedTasks: 64,
      averageResponseTime: 2.8,
      systemUptime: 99.2,
      resourceUtilization: {
        cpu: 44,
        memory: 62,
        storage: 78,
        network: 25
      }
    }
    setSystemMetrics(mockSystemMetrics)
  }

  const loadPerformanceData = async () => {
    // Generate mock performance data for the last 24 hours
    const now = new Date()
    const data: PerformanceData[] = []
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
      data.push({
        timestamp: timestamp.toISOString().slice(11, 16),
        responseTime: Math.random() * 3 + 1,
        throughput: Math.random() * 100 + 50,
        errorRate: Math.random() * 5,
        cpuUsage: Math.random() * 80 + 20,
        memoryUsage: Math.random() * 70 + 30
      })
    }
    setPerformanceData(data)
  }

  const loadAlertRules = async () => {
    const mockAlertRules: AlertRule[] = [
      {
        id: '1',
        name: 'High CPU Usage',
        metric: 'cpu_usage',
        condition: 'greater_than',
        threshold: 80,
        enabled: true,
        severity: 'high'
      },
      {
        id: '2',
        name: 'Low Success Rate',
        metric: 'success_rate',
        condition: 'less_than',
        threshold: 90,
        enabled: true,
        severity: 'medium'
      },
      {
        id: '3',
        name: 'High Error Count',
        metric: 'error_count',
        condition: 'greater_than',
        threshold: 10,
        enabled: true,
        severity: 'critical'
      }
    ]
    setAlertRules(mockAlertRules)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'idle':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'offline':
        return <Minus className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-yellow-600'
    if (score >= 70) return 'text-orange-600'
    return 'text-red-600'
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-3 w-3 text-green-500" />
    if (current < previous) return <ArrowDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-gray-500" />
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
          <h2 className="text-2xl font-bold tracking-tight">Agent Analytics</h2>
          <p className="text-muted-foreground">
            Monitor and analyze agent performance and system metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentMetrics.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadAnalyticsData}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* System Overview */}
      {systemMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold">{systemMetrics.activeAgents}/{systemMetrics.totalAgents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <Progress value={(systemMetrics.activeAgents / systemMetrics.totalAgents) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {((systemMetrics.completedTasks / systemMetrics.totalTasks) * 100).toFixed(1)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <Progress value={(systemMetrics.completedTasks / systemMetrics.totalTasks) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">{systemMetrics.averageResponseTime}s</p>
                </div>
                <Timer className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2 flex items-center text-sm text-muted-foreground">
                {getTrendIcon(systemMetrics.averageResponseTime, 3.2)}
                <span className="ml-1">vs last period</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
                  <p className="text-2xl font-bold">{systemMetrics.systemUptime}%</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <Progress value={systemMetrics.systemUptime} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="agents">Agent Details</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="responseTime" stroke="#8884d8" name="Response Time (s)" />
                    <Line type="monotone" dataKey="errorRate" stroke="#ff7300" name="Error Rate (%)" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Task Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: systemMetrics?.completedTasks || 0 },
                        { name: 'Failed', value: systemMetrics?.failedTasks || 0 },
                        { name: 'In Progress', value: agentMetrics.reduce((sum, agent) => sum + agent.tasksInProgress, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>Real-time performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cpuUsage" stackId="1" stroke="#8884d8" fill="#8884d8" name="CPU Usage (%)" />
                  <Area type="monotone" dataKey="memoryUsage" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Memory Usage (%)" />
                  <Area type="monotone" dataKey="throughput" stackId="2" stroke="#ffc658" fill="#ffc658" name="Throughput" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4">
            {agentMetrics.map((agent) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getStatusIcon(agent.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{agent.name}</h3>
                        <Badge variant={agent.status === 'active' ? 'default' : agent.status === 'error' ? 'destructive' : 'secondary'}>
                          {agent.status}
                        </Badge>
                        <Badge variant="outline" className={getPerformanceColor(agent.performanceScore)}>
                          Score: {agent.performanceScore}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Tasks Completed</p>
                          <p className="text-sm font-medium">{agent.tasksCompleted}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <p className="text-sm font-medium">{agent.successRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Execution</p>
                          <p className="text-sm font-medium">{agent.averageExecutionTime}s</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Uptime</p>
                          <p className="text-sm font-medium">{agent.uptime}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {agent.status === 'error' && agent.errorCount > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{agent.errorCount} Recent Errors</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      Agent is experiencing issues. Check logs for detailed error information.
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          {systemMetrics && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU & Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="text-sm text-muted-foreground">{systemMetrics.resourceUtilization.cpu}%</span>
                    </div>
                    <Progress value={systemMetrics.resourceUtilization.cpu} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-muted-foreground">{systemMetrics.resourceUtilization.memory}%</span>
                    </div>
                    <Progress value={systemMetrics.resourceUtilization.memory} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Storage & Network
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Storage Usage</span>
                      <span className="text-sm text-muted-foreground">{systemMetrics.resourceUtilization.storage}%</span>
                    </div>
                    <Progress value={systemMetrics.resourceUtilization.storage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Network Usage</span>
                      <span className="text-sm text-muted-foreground">{systemMetrics.resourceUtilization.network}%</span>
                    </div>
                    <Progress value={systemMetrics.resourceUtilization.network} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage by Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={agentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cpuUsage" fill="#8884d8" name="CPU Usage (%)" />
                  <Bar dataKey="memoryUsage" fill="#82ca9d" name="Memory Usage (%)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alert Rules
              </CardTitle>
              <CardDescription>
                Configure monitoring alerts for system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        rule.severity === 'critical' ? 'bg-red-500' :
                        rule.severity === 'high' ? 'bg-orange-500' :
                        rule.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {rule.metric} {rule.condition.replace('_', ' ')} {rule.threshold}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}