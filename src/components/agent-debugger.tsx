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
import { motion } from "framer-motion"
import { 
  Bug, 
  Activity, 
  Terminal, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Eye,
  Download,
  Upload,
  Filter,
  Search,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from '@/lib/supabase'

interface DebugSession {
  id: string
  agentId: string
  agentName: string
  status: 'running' | 'paused' | 'stopped' | 'error'
  startTime: string
  endTime?: string
  breakpoints: Breakpoint[]
  logs: LogEntry[]
  performance: PerformanceMetrics
}

interface Breakpoint {
  id: string
  line: number
  file: string
  condition?: string
  enabled: boolean
  hitCount: number
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  source: string
  data?: any
}

interface PerformanceMetrics {
  cpuUsage: number
  memoryUsage: number
  executionTime: number
  apiCalls: number
  errorRate: number
  throughput: number
}

interface TestCase {
  id: string
  name: string
  description: string
  input: any
  expectedOutput: any
  actualOutput?: any
  status: 'pending' | 'running' | 'passed' | 'failed'
  executionTime?: number
  error?: string
}

export function AgentDebugger() {
  const [debugSessions, setDebugSessions] = useState<DebugSession[]>([])
  const [selectedSession, setSelectedSession] = useState<DebugSession | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [logFilter, setLogFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadDebugData()
    if (autoRefresh) {
      const interval = setInterval(loadDebugData, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadDebugData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadDebugSessions(),
        loadTestCases()
      ])
    } catch (error) {
      console.error('Error loading debug data:', error)
      toast.error('Failed to load debug data')
    } finally {
      setLoading(false)
    }
  }

  const loadDebugSessions = async () => {
    // Mock data for demonstration
    const mockSessions: DebugSession[] = [
      {
        id: '1',
        agentId: 'agent-1',
        agentName: 'Security Scanner Agent',
        status: 'running',
        startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        breakpoints: [
          {
            id: 'bp1',
            line: 45,
            file: 'security-scanner.ts',
            condition: 'vulnerability.severity === "critical"',
            enabled: true,
            hitCount: 3
          }
        ],
        logs: [
          {
            id: 'log1',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            level: 'info',
            message: 'Starting vulnerability scan',
            source: 'security-scanner.ts:23'
          },
          {
            id: 'log2',
            timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            level: 'warn',
            message: 'Potential security issue detected',
            source: 'security-scanner.ts:45',
            data: { vulnerability: 'SQL Injection', severity: 'high' }
          },
          {
            id: 'log3',
            timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
            level: 'error',
            message: 'Failed to connect to security database',
            source: 'security-scanner.ts:67'
          }
        ],
        performance: {
          cpuUsage: 45,
          memoryUsage: 128,
          executionTime: 1800,
          apiCalls: 23,
          errorRate: 2.1,
          throughput: 15.6
        }
      },
      {
        id: '2',
        agentId: 'agent-2',
        agentName: 'Code Review Assistant',
        status: 'paused',
        startTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        breakpoints: [],
        logs: [],
        performance: {
          cpuUsage: 0,
          memoryUsage: 64,
          executionTime: 3600,
          apiCalls: 45,
          errorRate: 0,
          throughput: 8.2
        }
      }
    ]
    setDebugSessions(mockSessions)
    if (!selectedSession && mockSessions.length > 0) {
      setSelectedSession(mockSessions[0])
    }
  }

  const loadTestCases = async () => {
    const mockTestCases: TestCase[] = [
      {
        id: '1',
        name: 'Security Scan - SQL Injection Detection',
        description: 'Test agent ability to detect SQL injection vulnerabilities',
        input: {
          code: 'SELECT * FROM users WHERE id = ' + userId,
          language: 'javascript'
        },
        expectedOutput: {
          vulnerabilities: [{
            type: 'SQL Injection',
            severity: 'high',
            line: 1
          }]
        },
        actualOutput: {
          vulnerabilities: [{
            type: 'SQL Injection',
            severity: 'high',
            line: 1
          }]
        },
        status: 'passed',
        executionTime: 1200
      },
      {
        id: '2',
        name: 'Code Review - Performance Check',
        description: 'Test agent ability to identify performance issues',
        input: {
          code: 'for(let i=0; i<1000000; i++) { console.log(i); }',
          language: 'javascript'
        },
        expectedOutput: {
          issues: [{
            type: 'Performance',
            severity: 'medium',
            suggestion: 'Consider using batch processing'
          }]
        },
        status: 'running'
      },
      {
        id: '3',
        name: 'Documentation Generation - API Docs',
        description: 'Test agent ability to generate API documentation',
        input: {
          functions: [{
            name: 'getUserById',
            params: ['id: string'],
            returns: 'User | null'
          }]
        },
        expectedOutput: {
          documentation: 'Generated API documentation'
        },
        status: 'failed',
        error: 'Failed to parse function signature'
      }
    ]
    setTestCases(mockTestCases)
  }

  const handleDebugAction = async (action: string, sessionId: string) => {
    try {
      // Implement debug actions (start, pause, stop, restart)
      toast.success(`Debug session ${action} successfully`)
      await loadDebugSessions()
    } catch (error) {
      toast.error(`Failed to ${action} debug session`)
    }
  }

  const handleBreakpointToggle = async (sessionId: string, breakpointId: string) => {
    try {
      // Implement breakpoint toggle
      toast.success('Breakpoint updated')
      await loadDebugSessions()
    } catch (error) {
      toast.error('Failed to update breakpoint')
    }
  }

  const runTestCase = async (testId: string) => {
    try {
      // Implement test case execution
      toast.success('Test case started')
      await loadTestCases()
    } catch (error) {
      toast.error('Failed to run test case')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      stopped: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800'
    }
    return variants[status as keyof typeof variants] || variants.pending
  }

  const getLogLevelColor = (level: string) => {
    const colors = {
      debug: 'text-gray-600',
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600'
    }
    return colors[level as keyof typeof colors] || colors.info
  }

  const filteredLogs = selectedSession?.logs.filter(log => {
    const matchesFilter = logFilter === 'all' || log.level === logFilter
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  }) || []

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
          <h2 className="text-2xl font-bold tracking-tight">Agent Debugger</h2>
          <p className="text-muted-foreground">
            Debug, monitor, and test your agents in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Switch 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh}
            />
            <Label>Auto-refresh</Label>
          </div>
          <Button onClick={loadDebugData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Debug Sessions</TabsTrigger>
          <TabsTrigger value="testing">Agent Testing</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {debugSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSession?.id === session.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{session.agentName}</p>
                        <Badge className={getStatusBadge(session.status)}>
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started: {formatTimestamp(session.startTime)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Debug Console
                    {selectedSession && (
                      <Badge variant="outline">{selectedSession.agentName}</Badge>
                    )}
                  </CardTitle>
                  {selectedSession && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDebugAction('play', selectedSession.id)}
                        disabled={selectedSession.status === 'running'}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDebugAction('pause', selectedSession.id)}
                        disabled={selectedSession.status !== 'running'}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDebugAction('stop', selectedSession.id)}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDebugAction('restart', selectedSession.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedSession ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4" />
                        <Select value={logFilter} onValueChange={setLogFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Logs</SelectItem>
                            <SelectItem value="debug">Debug</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warn">Warning</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <Search className="h-4 w-4" />
                        <Input
                          placeholder="Search logs..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-64 border rounded-lg p-3">
                      <div className="space-y-2">
                        {filteredLogs.map((log) => (
                          <div key={log.id} className="text-sm font-mono">
                            <span className="text-gray-500">
                              [{formatTimestamp(log.timestamp)}]
                            </span>
                            <span className={`ml-2 font-semibold ${getLogLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="ml-2">{log.message}</span>
                            <span className="ml-2 text-gray-400 text-xs">
                              ({log.source})
                            </span>
                            {log.data && (
                              <pre className="ml-8 mt-1 text-xs text-gray-600">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Select a debug session to view console output
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Breakpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedSession.breakpoints.map((breakpoint) => (
                    <div key={breakpoint.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Switch 
                          checked={breakpoint.enabled}
                          onCheckedChange={() => handleBreakpointToggle(selectedSession.id, breakpoint.id)}
                        />
                        <div>
                          <p className="font-medium">{breakpoint.file}:{breakpoint.line}</p>
                          {breakpoint.condition && (
                            <p className="text-sm text-muted-foreground">
                              Condition: {breakpoint.condition}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        Hits: {breakpoint.hitCount}
                      </Badge>
                    </div>
                  ))}
                  {selectedSession.breakpoints.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No breakpoints set
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Agent Test Cases
                  </CardTitle>
                  <CardDescription>
                    Automated testing for agent functionality and performance
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Test
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testCases.map((testCase) => (
                  <motion.div
                    key={testCase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{testCase.name}</h3>
                        <p className="text-sm text-muted-foreground">{testCase.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusBadge(testCase.status)}>
                          {testCase.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          onClick={() => runTestCase(testCase.id)}
                          disabled={testCase.status === 'running'}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Run
                        </Button>
                      </div>
                    </div>
                    {testCase.executionTime && (
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {testCase.executionTime}ms
                        </span>
                      </div>
                    )}
                    {testCase.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-red-800 text-sm">{testCase.error}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {selectedSession && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    CPU Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSession.performance.cpuUsage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${selectedSession.performance.cpuUsage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSession.performance.memoryUsage}MB</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(selectedSession.performance.memoryUsage / 512) * 100}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Throughput
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSession.performance.throughput}/s</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedSession.performance.apiCalls} API calls
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Execution Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.floor(selectedSession.performance.executionTime / 60)}m</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedSession.performance.executionTime % 60}s
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Error Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSession.performance.errorRate}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${selectedSession.performance.errorRate}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                System Logs
              </CardTitle>
              <CardDescription>
                Comprehensive system and agent activity logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        <SelectItem value="security">Security Scanner</SelectItem>
                        <SelectItem value="review">Code Review</SelectItem>
                        <SelectItem value="docs">Documentation</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Search logs..." className="w-64" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-96 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {/* System logs would be displayed here */}
                    <div className="text-sm text-muted-foreground text-center py-8">
                      System logs will be displayed here
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}