"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import {
  Bot,
  Brain,
  Shield,
  Code,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  GitBranch,
  FileText,
  Zap,
  Target,
  Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Repository, TreeNode } from "@/lib/types";

interface EnhancedRepoExplorerProps {
  repo: Repository;
  rawTree: TreeNode[];
  readme: string;
  packageJson?: any;
}

interface AgentAnalysis {
  id: string;
  name: string;
  type: 'security' | 'performance' | 'architecture' | 'quality' | 'dependencies';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  icon: any;
  color: string;
}

interface AnalysisMetrics {
  codeQuality: number;
  security: number;
  performance: number;
  maintainability: number;
  testCoverage: number;
}

interface FileComplexity {
  name: string;
  complexity: number;
  lines: number;
  functions: number;
}

interface DependencyRisk {
  name: string;
  version: string;
  risk: 'low' | 'medium' | 'high';
  vulnerabilities: number;
}

export function EnhancedRepoExplorer({ repo, rawTree, readme, packageJson }: EnhancedRepoExplorerProps) {
  const [agents, setAgents] = useState<AgentAnalysis[]>([
    {
      id: 'security-agent',
      name: 'Security Scanner',
      type: 'security',
      status: 'pending',
      progress: 0,
      icon: Shield,
      color: 'text-red-500'
    },
    {
      id: 'performance-agent',
      name: 'Performance Analyzer',
      type: 'performance',
      status: 'pending',
      progress: 0,
      icon: Zap,
      color: 'text-yellow-500'
    },
    {
      id: 'architecture-agent',
      name: 'Architecture Reviewer',
      type: 'architecture',
      status: 'pending',
      progress: 0,
      icon: Brain,
      color: 'text-blue-500'
    },
    {
      id: 'quality-agent',
      name: 'Code Quality Auditor',
      type: 'quality',
      status: 'pending',
      progress: 0,
      icon: Target,
      color: 'text-green-500'
    },
    {
      id: 'dependency-agent',
      name: 'Dependency Analyzer',
      type: 'dependencies',
      status: 'pending',
      progress: 0,
      icon: GitBranch,
      color: 'text-purple-500'
    }
  ]);

  const [analysisMetrics, setAnalysisMetrics] = useState<AnalysisMetrics>({
    codeQuality: 0,
    security: 0,
    performance: 0,
    maintainability: 0,
    testCoverage: 0
  });

  const [fileComplexity, setFileComplexity] = useState<FileComplexity[]>([]);
  const [dependencyRisks, setDependencyRisks] = useState<DependencyRisk[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const mockMetrics: AnalysisMetrics = {
    codeQuality: 85,
    security: 92,
    performance: 78,
    maintainability: 88,
    testCoverage: 65
  };

  const mockFileComplexity: FileComplexity[] = [
    { name: 'src/components/dashboard.tsx', complexity: 8.5, lines: 450, functions: 12 },
    { name: 'src/lib/supabase.ts', complexity: 4.2, lines: 120, functions: 6 },
    { name: 'src/app/page.tsx', complexity: 3.1, lines: 85, functions: 3 },
    { name: 'src/components/repo-view.tsx', complexity: 6.7, lines: 280, functions: 8 }
  ];

  const mockDependencyRisks: DependencyRisk[] = [
    { name: 'react', version: '19.0.0', risk: 'low', vulnerabilities: 0 },
    { name: 'next', version: '15.1.3', risk: 'low', vulnerabilities: 0 },
    { name: 'lodash', version: '4.17.20', risk: 'medium', vulnerabilities: 2 },
    { name: 'axios', version: '0.21.1', risk: 'high', vulnerabilities: 5 }
  ];

  const startMultiAgentAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate multi-agent analysis
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      // Start agent
      setAgents(prev => prev.map(a => 
        a.id === agent.id ? { ...a, status: 'running' } : a
      ));

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setAgents(prev => prev.map(a => 
          a.id === agent.id ? { ...a, progress } : a
        ));
      }

      // Complete agent
      setAgents(prev => prev.map(a => 
        a.id === agent.id ? { ...a, status: 'completed', progress: 100 } : a
      ));
    }

    // Set mock data after analysis
    setAnalysisMetrics(mockMetrics);
    setFileComplexity(mockFileComplexity);
    setDependencyRisks(mockDependencyRisks);
    setIsAnalyzing(false);
  };

  const metricsData = Object.entries(analysisMetrics).map(([key, value]) => ({
    name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    value,
    color: getMetricColor(value)
  }));

  function getMetricColor(value: number): string {
    if (value >= 80) return '#10B981'; // green
    if (value >= 60) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  }

  const riskColors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444'
  };

  const completedAgents = agents.filter(a => a.status === 'completed').length;
  const overallProgress = (completedAgents / agents.length) * 100;

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
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-chimera-blue-900 to-chimera-teal-700 bg-clip-text text-transparent">
                  {repo.name}
                </h1>
                <p className="text-chimera-blue-600 mt-1">{repo.description}</p>
              </div>
            </div>
            <Button 
              onClick={startMultiAgentAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600 hover:from-chimera-blue-700 hover:to-chimera-teal-700"
            >
              {isAnalyzing ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Start Multi-Agent Analysis
                </>
              )}
            </Button>
          </div>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-white/60 rounded-lg border border-chimera-blue-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-chimera-blue-900">Analysis Progress</h3>
                <span className="text-sm text-chimera-blue-600">{Math.round(overallProgress)}% Complete</span>
              </div>
              <Progress value={overallProgress} className="mb-4" />
              <div className="grid grid-cols-5 gap-3">
                {agents.map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <div key={agent.id} className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${agent.color}`} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-chimera-blue-800">{agent.name}</div>
                        <div className="text-xs text-chimera-blue-600 capitalize">{agent.status}</div>
                      </div>
                      {agent.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="complexity">Complexity</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Agent Status Cards */}
              {agents.map((agent) => {
                const Icon = agent.icon;
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Icon className={`w-6 h-6 ${agent.color}`} />
                          <Badge 
                            variant={agent.status === 'completed' ? 'default' : 'secondary'}
                            className={agent.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {agent.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg text-chimera-blue-900">{agent.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Progress value={agent.progress} className="mb-2" />
                        <p className="text-sm text-chimera-blue-600">{agent.progress}% Complete</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Repository Stats */}
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-chimera-blue-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Repository Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chimera-blue-900">{rawTree.length}</div>
                    <div className="text-sm text-chimera-blue-600">Total Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chimera-blue-900">{repo.stargazers_count || 0}</div>
                    <div className="text-sm text-chimera-blue-600">Stars</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chimera-blue-900">{repo.forks_count || 0}</div>
                    <div className="text-sm text-chimera-blue-600">Forks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-chimera-blue-900">{repo.language || 'N/A'}</div>
                    <div className="text-sm text-chimera-blue-600">Primary Language</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metrics Bar Chart */}
              <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
                <CardHeader>
                  <CardTitle className="text-xl text-chimera-blue-900">Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metricsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="value" fill={(entry) => entry.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Metrics Pie Chart */}
              <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
                <CardHeader>
                  <CardTitle className="text-xl text-chimera-blue-900">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metricsData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {metricsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="complexity" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-chimera-blue-900">File Complexity Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={fileComplexity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="complexity" stroke="#0D9488" fill="#0D9488" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="lines" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-chimera-blue-900">Dependency Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dependencyRisks.map((dep) => (
                    <div key={dep.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: riskColors[dep.risk] }} />
                        <div>
                          <div className="font-medium text-chimera-blue-900">{dep.name}</div>
                          <div className="text-sm text-chimera-blue-600">v{dep.version}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={dep.risk === 'high' ? 'destructive' : dep.risk === 'medium' ? 'default' : 'secondary'}>
                          {dep.risk} risk
                        </Badge>
                        {dep.vulnerabilities > 0 && (
                          <div className="text-sm text-red-600 mt-1">
                            {dep.vulnerabilities} vulnerabilities
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agents.filter(a => a.status === 'completed').map((agent) => {
                const Icon = agent.icon;
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-chimera-blue-900 flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${agent.color}`} />
                          {agent.name} Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                              <CheckCircle className="w-4 h-4" />
                              Strengths Identified
                            </div>
                            <p className="text-sm text-green-700">
                              Well-structured component architecture with proper separation of concerns.
                            </p>
                          </div>
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
                              <AlertTriangle className="w-4 h-4" />
                              Recommendations
                            </div>
                            <p className="text-sm text-yellow-700">
                              Consider implementing error boundaries and optimizing bundle size.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}