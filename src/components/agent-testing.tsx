"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Bug, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Code, 
  FileText, 
  Settings, 
  Download, 
  Upload, 
  Save, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Filter, 
  Search, 
  Plus, 
  Minus, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  Activity, 
  BarChart3, 
  Timer, 
  Target, 
  Layers, 
  GitBranch, 
  Database, 
  Network, 
  Cpu, 
  Memory
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from '@/lib/supabase'

interface TestCase {
  id: string
  name: string
  description: string
  agentId: string
  agentName: string
  input: any
  expectedOutput: any
  actualOutput?: any
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error'
  duration?: number
  createdAt: string
  lastRun?: string
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface TestSuite {
  id: string
  name: string
  description: string
  testCases: string[]
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  results: {
    total: number
    passed: number
    failed: number
    errors: number
  }
  createdAt: string
  lastRun?: string
}

interface DebugSession {
  id: string
  agentId: string
  agentName: string
  status: 'active' | 'paused' | 'stopped'
  startTime: string
  breakpoints: string[]
  variables: Record<string, any>
  callStack: string[]
  logs: DebugLog[]
  stepMode: boolean
}

interface DebugLog {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: any
}

interface PerformanceMetric {
  id: string
  testCaseId: string
  metric: string
  value: number
  unit: string
  timestamp: string
  threshold?: number
  status: 'good' | 'warning' | 'critical'
}

export function AgentTesting() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [debugSessions, setDebugSessions] = useState<DebugSession[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  const [selectedDebugSession, setSelectedDebugSession] = useState<DebugSession | null>(null)
  const [newTestCase, setNewTestCase] = useState({
    name: '',
    description: '',
    agentId: '',
    input: '',
    expectedOutput: '',
    tags: '',
    priority: 'medium' as const
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadTestingData()
  }, [])

  const loadTestingData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadTestCases(),
        loadTestSuites(),
        loadDebugSessions(),
        loadPerformanceMetrics()
      ])
    } catch (error) {
      console.error('Error loading testing data:', error)
      toast.error('Failed to load testing data')
    } finally {
      setLoading(false)
    }
  }

  const loadTestCases = async () => {
    // Mock data for demonstration
    const mockTestCases: TestCase[] = [
      {
        id: '1',
        name: 'Code Review - Basic Function',
        description: 'Test code review agent with a simple function',
        agentId: '1',
        agentName: 'Code Review Agent',
        input: {
          code: 'function add(a, b) { return a + b; }',
          language: 'javascript'
        },
        expectedOutput: {
          issues: [],
          suggestions: ['Add type annotations'],
          score: 85
        },
        actualOutput: {
          issues: [],
          suggestions: ['Add type annotations', 'Consider input validation'],
          score: 88
        },
        status: 'passed',
        duration: 1.2,
        createdAt: '2024-01-15T10:00:00Z',
        lastRun: '2024-01-20T14:30:00Z',
        tags: ['code-review', 'javascript', 'basic'],
        priority: 'medium'
      },
      {
        id: '2',
        name: 'Documentation Generation',
        description: 'Test documentation agent with API endpoint',
        agentId: '2',
        agentName: 'Documentation Agent',
        input: {
          code: 'async function getUserById(id: string): Promise<User> { /* implementation */ }',
          format: 'jsdoc'
        },
        expectedOutput: {
          documentation: '/**\n * Retrieves a user by ID\n * @param {string} id - User ID\n * @returns {Promise<User>} User object\n */'
        },
        status: 'running',
        createdAt: '2024-01-15T11:00:00Z',
        tags: ['documentation', 'typescript', 'api'],
        priority: 'high'
      },
      {
        id: '3',
        name: 'Security Scan - SQL Injection',
        description: 'Test security agent with vulnerable code',
        agentId: '4',
        agentName: 'Security Agent',
        input: {
          code: 'const query = "SELECT * FROM users WHERE id = " + userId;',
          scanType: 'sql-injection'
        },
        expectedOutput: {
          vulnerabilities: [{
            type: 'sql-injection',
            severity: 'high',
            line: 1
          }]
        },
        actualOutput: {
          vulnerabilities: []
        },
        status: 'failed',
        duration: 0.8,
        createdAt: '2024-01-15T12:00:00Z',
        lastRun: '2024-01-20T15:45:00Z',
        tags: ['security', 'sql-injection', 'vulnerability'],
        priority: 'critical'
      }
    ]
    setTestCases(mockTestCases)
  }

  const loadTestSuites = async () => {
    const mockTestSuites: TestSuite[] = [
      {
        id: '1',
        name: 'Code Quality Suite',
        description: 'Comprehensive code quality testing',
        testCases: ['1', '2'],
        status: 'completed',
        progress: 100,
        results: {
          total: 2,
          passed: 1,
          failed: 1,
          errors: 0
        },
        createdAt: '2024-01-15T09:00:00Z',
        lastRun: '2024-01-20T16:00:00Z'
      },
      {
        id: '2',
        name: 'Security Testing Suite',
        description: 'Security vulnerability detection tests',
        testCases: ['3'],
        status: 'running',
        progress: 60,
        results: {
          total: 1,
          passed: 0,
          failed: 0,
          errors: 0
        },
        createdAt: '2024-01-15T13:00:00Z'
      }
    ]
    setTestSuites(mockTestSuites)
  }

  const loadDebugSessions = async () => {
    const mockDebugSessions: DebugSession[] = [
      {
        id: '1',
        agentId: '1',
        agentName: 'Code Review Agent',
        status: 'active',
        startTime: '2024-01-20T16:30:00Z',
        breakpoints: ['line:45', 'function:analyzeCode'],
        variables: {
          currentFile: 'src/utils/parser.ts',
          issueCount: 3,
          suggestions: ['Add error handling', 'Optimize performance']
        },
        callStack: [
          'analyzeCode()',
          'processFile()',
          'runAnalysis()'
        ],
        logs: [
          {
            id: '1',
            timestamp: '2024-01-20T16:30:15Z',
            level: 'info',
            message: 'Starting code analysis',
            context: { file: 'src/utils/parser.ts' }
          },
          {
            id: '2',
            timestamp: '2024-01-20T16:30:18Z',
            level: 'debug',
            message: 'Found potential issue at line 23',
            context: { line: 23, issue: 'unused variable' }
          },
          {
            id: '3',
            timestamp: '2024-01-20T16:30:20Z',
            level: 'warn',
            message: 'Performance bottleneck detected',
            context: { function: 'parseAST', duration: '2.3s' }
          }
        ],
        stepMode: true
      }
    ]
    setDebugSessions(mockDebugSessions)
  }

  const loadPerformanceMetrics = async () => {
    const mockMetrics: PerformanceMetric[] = [
      {
        id: '1',
        testCaseId: '1',
        metric: 'execution_time',
        value: 1.2,
        unit: 'seconds',
        timestamp: '2024-01-20T14:30:00Z',
        threshold: 2.0,
        status: 'good'
      },
      {
        id: '2',
        testCaseId: '1',
        metric: 'memory_usage',
        value: 45.6,
        unit: 'MB',
        timestamp: '2024-01-20T14:30:00Z',
        threshold: 100.0,
        status: 'good'
      },
      {
        id: '3',
        testCaseId: '3',
        metric: 'execution_time',
        value: 0.8,
        unit: 'seconds',
        timestamp: '2024-01-20T15:45:00Z',
        threshold: 1.0,
        status: 'good'
      }
    ]
    setPerformanceMetrics(mockMetrics)
  }

  const runTestCase = async (testCaseId: string) => {
    const testCase = testCases.find(tc => tc.id === testCaseId)
    if (!testCase) return

    // Update status to running
    setTestCases(prev => prev.map(tc => 
      tc.id === testCaseId ? { ...tc, status: 'running' } : tc
    ))

    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock result
      const success = Math.random() > 0.3
      const duration = Math.random() * 3 + 0.5
      
      setTestCases(prev => prev.map(tc => 
        tc.id === testCaseId ? { 
          ...tc, 
          status: success ? 'passed' : 'failed',
          duration,
          lastRun: new Date().toISOString(),
          actualOutput: success ? testCase.expectedOutput : { error: 'Test failed' }
        } : tc
      ))
      
      toast.success(`Test case "${testCase.name}" ${success ? 'passed' : 'failed'}`)
    } catch (error) {
      setTestCases(prev => prev.map(tc => 
        tc.id === testCaseId ? { ...tc, status: 'error' } : tc
      ))
      toast.error('Test execution failed')
    }
  }

  const runTestSuite = async (suiteId: string) => {
    const suite = testSuites.find(s => s.id === suiteId)
    if (!suite) return

    setTestSuites(prev => prev.map(s => 
      s.id === suiteId ? { ...s, status: 'running', progress: 0 } : s
    ))

    try {
      for (let i = 0; i < suite.testCases.length; i++) {
        const testCaseId = suite.testCases[i]
        await runTestCase(testCaseId)
        
        const progress = ((i + 1) / suite.testCases.length) * 100
        setTestSuites(prev => prev.map(s => 
          s.id === suiteId ? { ...s, progress } : s
        ))
      }
      
      // Calculate results
      const results = suite.testCases.reduce((acc, tcId) => {
        const testCase = testCases.find(tc => tc.id === tcId)
        if (testCase) {
          acc.total++
          if (testCase.status === 'passed') acc.passed++
          else if (testCase.status === 'failed') acc.failed++
          else if (testCase.status === 'error') acc.errors++
        }
        return acc
      }, { total: 0, passed: 0, failed: 0, errors: 0 })
      
      setTestSuites(prev => prev.map(s => 
        s.id === suiteId ? { 
          ...s, 
          status: 'completed', 
          progress: 100, 
          results,
          lastRun: new Date().toISOString()
        } : s
      ))
      
      toast.success(`Test suite "${suite.name}" completed`)
    } catch (error) {
      setTestSuites(prev => prev.map(s => 
        s.id === suiteId ? { ...s, status: 'failed' } : s
      ))
      toast.error('Test suite execution failed')
    }
  }

  const createTestCase = async () => {
    if (!newTestCase.name || !newTestCase.agentId) {
      toast.error('Please fill in required fields')
      return
    }

    const testCase: TestCase = {
      id: Date.now().toString(),
      name: newTestCase.name,
      description: newTestCase.description,
      agentId: newTestCase.agentId,
      agentName: 'Selected Agent', // Would be fetched from agent data
      input: JSON.parse(newTestCase.input || '{}'),
      expectedOutput: JSON.parse(newTestCase.expectedOutput || '{}'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      tags: newTestCase.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      priority: newTestCase.priority
    }

    setTestCases(prev => [...prev, testCase])
    setNewTestCase({
      name: '',
      description: '',
      agentId: '',
      input: '',
      expectedOutput: '',
      tags: '',
      priority: 'medium'
    })
    setShowCreateForm(false)
    toast.success('Test case created successfully')
  }

  const startDebugSession = async (agentId: string) => {
    const session: DebugSession = {
      id: Date.now().toString(),
      agentId,
      agentName: 'Debug Agent', // Would be fetched from agent data
      status: 'active',
      startTime: new Date().toISOString(),
      breakpoints: [],
      variables: {},
      callStack: [],
      logs: [],
      stepMode: false
    }

    setDebugSessions(prev => [...prev, session])
    setSelectedDebugSession(session)
    toast.success('Debug session started')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'error':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTestCases = testCases.filter(testCase => {
    const matchesStatus = filterStatus === 'all' || testCase.status === filterStatus
    const matchesSearch = testCase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
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
          <h2 className="text-2xl font-bold tracking-tight">Agent Testing & Debugging</h2>
          <p className="text-muted-foreground">
            Test, debug, and monitor agent performance and behavior
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Test Case
          </Button>
          <Button variant="outline" onClick={loadTestingData}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="test-cases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
          <TabsTrigger value="test-suites">Test Suites</TabsTrigger>
          <TabsTrigger value="debugging">Debugging</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases" className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredTestCases.map((testCase) => (
              <motion.div
                key={testCase.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getStatusIcon(testCase.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{testCase.name}</h3>
                        <Badge className={getStatusColor(testCase.status)}>
                          {testCase.status}
                        </Badge>
                        <Badge variant="outline">
                          {testCase.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{testCase.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Agent: {testCase.agentName}</span>
                        {testCase.duration && (
                          <span>Duration: {testCase.duration}s</span>
                        )}
                        {testCase.lastRun && (
                          <span>Last run: {new Date(testCase.lastRun).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        {testCase.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => runTestCase(testCase.id)}
                      disabled={testCase.status === 'running'}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTestCase(testCase)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="test-suites" className="space-y-4">
          <div className="grid gap-4">
            {testSuites.map((suite) => (
              <Card key={suite.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        {suite.name}
                      </CardTitle>
                      <CardDescription>{suite.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(suite.status)}>
                        {suite.status}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runTestSuite(suite.id)}
                        disabled={suite.status === 'running'}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {suite.status === 'running' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-muted-foreground">{suite.progress}%</span>
                        </div>
                        <Progress value={suite.progress} className="h-2" />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{suite.results.total}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{suite.results.passed}</p>
                        <p className="text-sm text-muted-foreground">Passed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{suite.results.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{suite.results.errors}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </div>
                    </div>
                    
                    {suite.lastRun && (
                      <p className="text-sm text-muted-foreground">
                        Last run: {new Date(suite.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="debugging" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Debug Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {debugSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4" />
                          <span className="font-medium">{session.agentName}</span>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Started: {new Date(session.startTime).toLocaleString()}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary">
                          {session.breakpoints.length} breakpoints
                        </Badge>
                        <Badge variant="secondary">
                          {session.logs.length} logs
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => startDebugSession('1')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start Debug Session
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {selectedDebugSession && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Debug Console
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {selectedDebugSession.logs.map((log) => (
                        <div key={log.id} className="text-sm">
                          <span className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={`ml-2 font-medium ${
                            log.level === 'error' ? 'text-red-600' :
                            log.level === 'warn' ? 'text-orange-600' :
                            log.level === 'info' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            [{log.level.toUpperCase()}]
                          </span>
                          <span className="ml-2">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {performanceMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {metric.metric.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-2xl font-bold">
                        {metric.value} {metric.unit}
                      </p>
                    </div>
                    <div className={`p-2 rounded-full ${
                      metric.status === 'good' ? 'bg-green-100' :
                      metric.status === 'warning' ? 'bg-yellow-100' :
                      'bg-red-100'
                    }`}>
                      {metric.status === 'good' ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : metric.status === 'warning' ? (
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  </div>
                  {metric.threshold && (
                    <div className="mt-2">
                      <Progress 
                        value={(metric.value / metric.threshold) * 100} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Threshold: {metric.threshold} {metric.unit}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Test Case Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Test Case</CardTitle>
              <CardDescription>
                Define a new test case for agent validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Test Name</Label>
                  <Input
                    id="name"
                    value={newTestCase.name}
                    onChange={(e) => setNewTestCase(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter test name"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={newTestCase.priority} 
                    onValueChange={(value: any) => setNewTestCase(prev => ({ ...prev, priority: value }))}
                  >
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
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTestCase.description}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this test validates"
                />
              </div>
              
              <div>
                <Label htmlFor="agentId">Target Agent</Label>
                <Select 
                  value={newTestCase.agentId} 
                  onValueChange={(value) => setNewTestCase(prev => ({ ...prev, agentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Code Review Agent</SelectItem>
                    <SelectItem value="2">Documentation Agent</SelectItem>
                    <SelectItem value="3">Testing Agent</SelectItem>
                    <SelectItem value="4">Security Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="input">Test Input (JSON)</Label>
                <Textarea
                  id="input"
                  value={newTestCase.input}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, input: e.target.value }))}
                  placeholder='{"code": "function example() {}", "language": "javascript"}'
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="expectedOutput">Expected Output (JSON)</Label>
                <Textarea
                  id="expectedOutput"
                  value={newTestCase.expectedOutput}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, expectedOutput: e.target.value }))}
                  placeholder='{"issues": [], "suggestions": ["Add comments"], "score": 85}'
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={newTestCase.tags}
                  onChange={(e) => setNewTestCase(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="javascript, code-review, basic"
                />
              </div>
            </CardContent>
            <div className="flex items-center justify-end space-x-2 p-6 border-t">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button onClick={createTestCase}>
                Create Test Case
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}