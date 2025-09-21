import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface MetricData {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface AgentMetrics {
  agent_id: string;
  metrics: {
    tasks_completed: MetricData[];
    tasks_failed: MetricData[];
    average_execution_time: MetricData[];
    memory_usage: MetricData[];
    cpu_usage: MetricData[];
    error_rate: MetricData[];
    success_rate: MetricData[];
    throughput: MetricData[];
    response_time: MetricData[];
    uptime: MetricData[];
  };
  alerts: Alert[];
  health_status: 'healthy' | 'warning' | 'critical' | 'offline';
  last_updated: string;
}

interface SystemMetrics {
  total_agents: number;
  active_agents: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  average_system_load: number;
  memory_usage_percentage: number;
  disk_usage_percentage: number;
  network_throughput: number;
  error_rate: number;
  uptime: number;
  timestamp: string;
}

interface Alert {
  id: string;
  agent_id?: string;
  type: 'performance' | 'error' | 'security' | 'resource' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  threshold: number;
  current_value: number;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  actions_taken: string[];
}

interface PerformanceReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  agents_analyzed: string[];
  summary: {
    total_tasks: number;
    success_rate: number;
    average_response_time: number;
    peak_performance_time: string;
    lowest_performance_time: string;
    most_active_agent: string;
    least_active_agent: string;
    total_errors: number;
    critical_alerts: number;
  };
  detailed_metrics: {
    agent_id: string;
    tasks_completed: number;
    success_rate: number;
    average_execution_time: number;
    error_count: number;
    uptime_percentage: number;
    performance_score: number;
  }[];
  recommendations: {
    type: 'optimization' | 'scaling' | 'maintenance' | 'security';
    priority: 'low' | 'medium' | 'high';
    description: string;
    estimated_impact: string;
  }[];
  charts_data: {
    performance_trends: { timestamp: string; value: number }[];
    error_distribution: { agent_id: string; error_count: number }[];
    resource_usage: { timestamp: string; cpu: number; memory: number }[];
  };
  created_at: string;
}

interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  agent_id?: string; // null for system-wide rules
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains';
  threshold: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notification_channels: ('email' | 'slack' | 'webhook' | 'dashboard')[];
  cooldown_period: number; // minutes
  auto_resolve: boolean;
  actions: {
    type: 'restart_agent' | 'scale_resources' | 'notify_admin' | 'run_script';
    parameters: Record<string, any>;
  }[];
  created_at: string;
  updated_at: string;
}

class AgentMonitoringService extends EventEmitter {
  private supabase: any;
  private metricsCache: Map<string, AgentMetrics> = new Map();
  private systemMetrics: SystemMetrics | null = null;
  private monitoringRules: Map<string, MonitoringRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.initializeMonitoring();
  }

  private async initializeMonitoring() {
    await this.loadMonitoringRules();
    await this.loadActiveAlerts();
    this.startMetricsCollection();
    this.startAlertChecking();
  }

  // Metrics Collection
  private startMetricsCollection() {
    // Collect metrics every 30 seconds
    this.metricsCollectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.collectAgentMetrics();
    }, 30000);
  }

  private async collectSystemMetrics() {
    try {
      const [agentsData, tasksData] = await Promise.all([
        this.supabase.from('agents').select('id, status'),
        this.supabase.from('tasks').select('status, created_at, completed_at')
      ]);

      const agents = agentsData.data || [];
      const tasks = tasksData.data || [];

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentTasks = tasks.filter(task => 
        new Date(task.created_at) > oneDayAgo
      );

      const completedTasks = recentTasks.filter(task => 
        task.status === 'completed'
      );

      const failedTasks = recentTasks.filter(task => 
        task.status === 'failed'
      );

      this.systemMetrics = {
        total_agents: agents.length,
        active_agents: agents.filter(a => a.status === 'active').length,
        total_tasks: recentTasks.length,
        completed_tasks: completedTasks.length,
        failed_tasks: failedTasks.length,
        average_system_load: await this.getSystemLoad(),
        memory_usage_percentage: await this.getMemoryUsage(),
        disk_usage_percentage: await this.getDiskUsage(),
        network_throughput: await this.getNetworkThroughput(),
        error_rate: recentTasks.length > 0 ? (failedTasks.length / recentTasks.length) * 100 : 0,
        uptime: await this.getSystemUptime(),
        timestamp: now.toISOString()
      };

      // Store in database
      await this.supabase
        .from('system_metrics')
        .insert(this.systemMetrics);

      this.emit('system_metrics_collected', this.systemMetrics);
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  private async collectAgentMetrics() {
    try {
      const { data: agents } = await this.supabase
        .from('agents')
        .select('id, status');

      if (!agents) return;

      for (const agent of agents) {
        const metrics = await this.collectSingleAgentMetrics(agent.id);
        this.metricsCache.set(agent.id, metrics);

        // Store in database
        await this.supabase
          .from('agent_metrics')
          .upsert({
            agent_id: agent.id,
            metrics: metrics.metrics,
            health_status: metrics.health_status,
            last_updated: metrics.last_updated
          });

        this.emit('agent_metrics_collected', { agentId: agent.id, metrics });
      }
    } catch (error) {
      console.error('Error collecting agent metrics:', error);
    }
  }

  private async collectSingleAgentMetrics(agentId: string): Promise<AgentMetrics> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent tasks for this agent
    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', oneHourAgo.toISOString());

    const recentTasks = tasks || [];
    const completedTasks = recentTasks.filter(t => t.status === 'completed');
    const failedTasks = recentTasks.filter(t => t.status === 'failed');

    // Calculate execution times
    const executionTimes = completedTasks
      .filter(t => t.completed_at)
      .map(t => {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.completed_at).getTime();
        return end - start;
      });

    const avgExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
      : 0;

    const successRate = recentTasks.length > 0 
      ? (completedTasks.length / recentTasks.length) * 100 
      : 100;

    const errorRate = recentTasks.length > 0 
      ? (failedTasks.length / recentTasks.length) * 100 
      : 0;

    // Get resource usage (mock data - in real implementation, get from system)
    const memoryUsage = await this.getAgentMemoryUsage(agentId);
    const cpuUsage = await this.getAgentCpuUsage(agentId);
    const uptime = await this.getAgentUptime(agentId);

    const timestamp = now.toISOString();

    const metrics: AgentMetrics = {
      agent_id: agentId,
      metrics: {
        tasks_completed: [{ timestamp, value: completedTasks.length }],
        tasks_failed: [{ timestamp, value: failedTasks.length }],
        average_execution_time: [{ timestamp, value: avgExecutionTime }],
        memory_usage: [{ timestamp, value: memoryUsage }],
        cpu_usage: [{ timestamp, value: cpuUsage }],
        error_rate: [{ timestamp, value: errorRate }],
        success_rate: [{ timestamp, value: successRate }],
        throughput: [{ timestamp, value: recentTasks.length }],
        response_time: [{ timestamp, value: avgExecutionTime }],
        uptime: [{ timestamp, value: uptime }]
      },
      alerts: [],
      health_status: this.calculateHealthStatus(successRate, errorRate, memoryUsage, cpuUsage),
      last_updated: timestamp
    };

    return metrics;
  }

  private calculateHealthStatus(
    successRate: number,
    errorRate: number,
    memoryUsage: number,
    cpuUsage: number
  ): 'healthy' | 'warning' | 'critical' | 'offline' {
    if (successRate === 0 && errorRate === 0) {
      return 'offline';
    }

    if (errorRate > 50 || memoryUsage > 90 || cpuUsage > 90) {
      return 'critical';
    }

    if (errorRate > 20 || successRate < 80 || memoryUsage > 70 || cpuUsage > 70) {
      return 'warning';
    }

    return 'healthy';
  }

  // Alert Management
  private startAlertChecking() {
    // Check alerts every minute
    this.alertCheckInterval = setInterval(async () => {
      await this.checkAlerts();
    }, 60000);
  }

  private async checkAlerts() {
    for (const rule of this.monitoringRules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateRule(rule: MonitoringRule) {
    const currentValue = await this.getCurrentMetricValue(rule.metric, rule.agent_id);
    const shouldAlert = this.evaluateCondition(currentValue, rule.condition, rule.threshold);

    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => 
        alert.agent_id === rule.agent_id && 
        alert.metric === rule.metric &&
        alert.status === 'active'
      );

    if (shouldAlert && !existingAlert) {
      // Create new alert
      const alert = await this.createAlert(rule, currentValue);
      await this.executeAlertActions(rule, alert);
    } else if (!shouldAlert && existingAlert) {
      // Resolve existing alert
      await this.resolveAlert(existingAlert.id);
    }
  }

  private async getCurrentMetricValue(metric: string, agentId?: string): Promise<number> {
    if (agentId) {
      const agentMetrics = this.metricsCache.get(agentId);
      if (!agentMetrics) return 0;

      const metricData = agentMetrics.metrics[metric as keyof typeof agentMetrics.metrics];
      return metricData && metricData.length > 0 ? metricData[metricData.length - 1].value : 0;
    } else {
      // System metric
      if (!this.systemMetrics) return 0;
      return this.systemMetrics[metric as keyof SystemMetrics] as number || 0;
    }
  }

  private evaluateCondition(
    currentValue: number | string,
    condition: MonitoringRule['condition'],
    threshold: number | string
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return Number(currentValue) > Number(threshold);
      case 'less_than':
        return Number(currentValue) < Number(threshold);
      case 'equals':
        return currentValue === threshold;
      case 'not_equals':
        return currentValue !== threshold;
      case 'contains':
        return String(currentValue).includes(String(threshold));
      default:
        return false;
    }
  }

  private async createAlert(rule: MonitoringRule, currentValue: number | string): Promise<Alert> {
    const alert: Omit<Alert, 'id'> = {
      agent_id: rule.agent_id,
      type: this.getAlertType(rule.metric),
      severity: rule.severity,
      title: `${rule.name} Alert`,
      description: `${rule.description}. Current value: ${currentValue}, Threshold: ${rule.threshold}`,
      metric: rule.metric,
      threshold: Number(rule.threshold),
      current_value: Number(currentValue),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      actions_taken: []
    };

    const { data, error } = await this.supabase
      .from('alerts')
      .insert(alert)
      .select()
      .single();

    if (error) throw error;

    this.activeAlerts.set(data.id, data);
    this.emit('alert_created', data);

    return data;
  }

  private async resolveAlert(alertId: string) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolved_at = new Date().toISOString();
    alert.updated_at = new Date().toISOString();

    await this.supabase
      .from('alerts')
      .update({
        status: alert.status,
        resolved_at: alert.resolved_at,
        updated_at: alert.updated_at
      })
      .eq('id', alertId);

    this.activeAlerts.delete(alertId);
    this.emit('alert_resolved', alert);
  }

  private async executeAlertActions(rule: MonitoringRule, alert: Alert) {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, alert);
        alert.actions_taken.push(`${action.type}: ${new Date().toISOString()}`);
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
      }
    }

    // Update alert with actions taken
    await this.supabase
      .from('alerts')
      .update({ actions_taken: alert.actions_taken })
      .eq('id', alert.id);
  }

  private async executeAction(action: MonitoringRule['actions'][0], alert: Alert) {
    switch (action.type) {
      case 'restart_agent':
        if (alert.agent_id) {
          await this.restartAgent(alert.agent_id);
        }
        break;
      case 'scale_resources':
        await this.scaleResources(action.parameters);
        break;
      case 'notify_admin':
        await this.notifyAdmin(alert, action.parameters);
        break;
      case 'run_script':
        await this.runScript(action.parameters.script, action.parameters.args);
        break;
    }
  }

  private getAlertType(metric: string): Alert['type'] {
    if (metric.includes('error') || metric.includes('failed')) {
      return 'error';
    }
    if (metric.includes('memory') || metric.includes('cpu') || metric.includes('disk')) {
      return 'resource';
    }
    if (metric.includes('security') || metric.includes('vulnerability')) {
      return 'security';
    }
    if (metric.includes('uptime') || metric.includes('availability')) {
      return 'availability';
    }
    return 'performance';
  }

  // Monitoring Rules Management
  async createMonitoringRule(
    ruleData: Omit<MonitoringRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const rule: Omit<MonitoringRule, 'id'> = {
      ...ruleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('monitoring_rules')
      .insert(rule)
      .select()
      .single();

    if (error) throw error;

    this.monitoringRules.set(data.id, data);
    this.emit('monitoring_rule_created', data);

    return data.id;
  }

  async updateMonitoringRule(
    ruleId: string,
    updates: Partial<MonitoringRule>
  ): Promise<void> {
    const rule = this.monitoringRules.get(ruleId);
    if (!rule) {
      throw new Error('Monitoring rule not found');
    }

    const updatedRule = {
      ...rule,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await this.supabase
      .from('monitoring_rules')
      .update(updatedRule)
      .eq('id', ruleId);

    this.monitoringRules.set(ruleId, updatedRule);
    this.emit('monitoring_rule_updated', updatedRule);
  }

  async deleteMonitoringRule(ruleId: string): Promise<void> {
    await this.supabase
      .from('monitoring_rules')
      .delete()
      .eq('id', ruleId);

    this.monitoringRules.delete(ruleId);
    this.emit('monitoring_rule_deleted', { ruleId });
  }

  private async loadMonitoringRules() {
    const { data: rules } = await this.supabase
      .from('monitoring_rules')
      .select('*')
      .eq('enabled', true);

    if (rules) {
      for (const rule of rules) {
        this.monitoringRules.set(rule.id, rule);
      }
    }
  }

  private async loadActiveAlerts() {
    const { data: alerts } = await this.supabase
      .from('alerts')
      .select('*')
      .eq('status', 'active');

    if (alerts) {
      for (const alert of alerts) {
        this.activeAlerts.set(alert.id, alert);
      }
    }
  }

  // Performance Reports
  async generatePerformanceReport(
    type: PerformanceReport['type'],
    periodStart: string,
    periodEnd: string,
    agentIds?: string[]
  ): Promise<string> {
    const report = await this.createPerformanceReport(
      type,
      periodStart,
      periodEnd,
      agentIds
    );

    const { data, error } = await this.supabase
      .from('performance_reports')
      .insert(report)
      .select()
      .single();

    if (error) throw error;

    this.emit('performance_report_generated', data);
    return data.id;
  }

  private async createPerformanceReport(
    type: PerformanceReport['type'],
    periodStart: string,
    periodEnd: string,
    agentIds?: string[]
  ): Promise<Omit<PerformanceReport, 'id'>> {
    // Get tasks data for the period
    let query = this.supabase
      .from('tasks')
      .select('*')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    if (agentIds && agentIds.length > 0) {
      query = query.in('agent_id', agentIds);
    }

    const { data: tasks } = await query;
    const allTasks = tasks || [];

    // Get agents data
    const agentsToAnalyze = agentIds || [...new Set(allTasks.map(t => t.agent_id))];
    const { data: agents } = await this.supabase
      .from('agents')
      .select('*')
      .in('id', agentsToAnalyze);

    const allAgents = agents || [];

    // Calculate summary metrics
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const failedTasks = allTasks.filter(t => t.status === 'failed');
    const successRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    const executionTimes = completedTasks
      .filter(t => t.completed_at)
      .map(t => {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.completed_at).getTime();
        return end - start;
      });

    const avgResponseTime = executionTimes.length > 0 
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
      : 0;

    // Find peak and low performance times
    const hourlyPerformance = this.calculateHourlyPerformance(allTasks);
    const peakHour = hourlyPerformance.reduce((max, hour) => 
      hour.performance > max.performance ? hour : max
    );
    const lowHour = hourlyPerformance.reduce((min, hour) => 
      hour.performance < min.performance ? hour : min
    );

    // Calculate agent-specific metrics
    const detailedMetrics = agentsToAnalyze.map(agentId => {
      const agentTasks = allTasks.filter(t => t.agent_id === agentId);
      const agentCompleted = agentTasks.filter(t => t.status === 'completed');
      const agentFailed = agentTasks.filter(t => t.status === 'failed');
      
      const agentExecutionTimes = agentCompleted
        .filter(t => t.completed_at)
        .map(t => {
          const start = new Date(t.created_at).getTime();
          const end = new Date(t.completed_at).getTime();
          return end - start;
        });

      const agentAvgTime = agentExecutionTimes.length > 0 
        ? agentExecutionTimes.reduce((a, b) => a + b, 0) / agentExecutionTimes.length 
        : 0;

      const agentSuccessRate = agentTasks.length > 0 
        ? (agentCompleted.length / agentTasks.length) * 100 
        : 0;

      return {
        agent_id: agentId,
        tasks_completed: agentCompleted.length,
        success_rate: agentSuccessRate,
        average_execution_time: agentAvgTime,
        error_count: agentFailed.length,
        uptime_percentage: 95, // Mock data
        performance_score: this.calculatePerformanceScore(
          agentSuccessRate,
          agentAvgTime,
          agentFailed.length
        )
      };
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(detailedMetrics, allTasks);

    // Generate charts data
    const chartsData = {
      performance_trends: this.generatePerformanceTrends(allTasks, periodStart, periodEnd),
      error_distribution: detailedMetrics.map(m => ({
        agent_id: m.agent_id,
        error_count: m.error_count
      })),
      resource_usage: this.generateResourceUsageData(periodStart, periodEnd)
    };

    return {
      type,
      period_start: periodStart,
      period_end: periodEnd,
      agents_analyzed: agentsToAnalyze,
      summary: {
        total_tasks: allTasks.length,
        success_rate: successRate,
        average_response_time: avgResponseTime,
        peak_performance_time: peakHour.hour,
        lowest_performance_time: lowHour.hour,
        most_active_agent: detailedMetrics.reduce((max, agent) => 
          agent.tasks_completed > max.tasks_completed ? agent : max
        ).agent_id,
        least_active_agent: detailedMetrics.reduce((min, agent) => 
          agent.tasks_completed < min.tasks_completed ? agent : min
        ).agent_id,
        total_errors: failedTasks.length,
        critical_alerts: Array.from(this.activeAlerts.values())
          .filter(a => a.severity === 'critical').length
      },
      detailed_metrics: detailedMetrics,
      recommendations,
      charts_data: chartsData,
      created_at: new Date().toISOString()
    };
  }

  private calculateHourlyPerformance(tasks: any[]) {
    const hourlyData: { hour: string; performance: number }[] = [];
    
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      const hourTasks = tasks.filter(t => {
        const taskHour = new Date(t.created_at).getHours();
        return taskHour === i;
      });
      
      const completed = hourTasks.filter(t => t.status === 'completed').length;
      const performance = hourTasks.length > 0 ? (completed / hourTasks.length) * 100 : 0;
      
      hourlyData.push({ hour, performance });
    }
    
    return hourlyData;
  }

  private calculatePerformanceScore(
    successRate: number,
    avgExecutionTime: number,
    errorCount: number
  ): number {
    // Simple scoring algorithm
    let score = successRate; // Start with success rate (0-100)
    
    // Penalize for slow execution (assuming 5000ms is baseline)
    if (avgExecutionTime > 5000) {
      score -= Math.min(20, (avgExecutionTime - 5000) / 1000);
    }
    
    // Penalize for errors
    score -= Math.min(30, errorCount * 2);
    
    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(
    metrics: any[],
    tasks: any[]
  ): PerformanceReport['recommendations'] {
    const recommendations: PerformanceReport['recommendations'] = [];

    // Check for low-performing agents
    const lowPerformers = metrics.filter(m => m.performance_score < 70);
    if (lowPerformers.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        description: `${lowPerformers.length} agents have performance scores below 70%. Consider optimization or retraining.`,
        estimated_impact: 'Could improve overall system performance by 15-25%'
      });
    }

    // Check for high error rates
    const highErrorAgents = metrics.filter(m => m.error_count > 10);
    if (highErrorAgents.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'high',
        description: `${highErrorAgents.length} agents have high error rates. Review logs and update configurations.`,
        estimated_impact: 'Could reduce system errors by 40-60%'
      });
    }

    // Check for scaling needs
    const totalTasks = tasks.length;
    const avgTasksPerAgent = totalTasks / metrics.length;
    if (avgTasksPerAgent > 100) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        description: 'High task volume detected. Consider adding more agent instances.',
        estimated_impact: 'Could reduce response times by 20-30%'
      });
    }

    return recommendations;
  }

  private generatePerformanceTrends(
    tasks: any[],
    periodStart: string,
    periodEnd: string
  ): { timestamp: string; value: number }[] {
    const trends: { timestamp: string; value: number }[] = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const interval = (end.getTime() - start.getTime()) / 20; // 20 data points

    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(start.getTime() + i * interval);
      const nextTimestamp = new Date(start.getTime() + (i + 1) * interval);
      
      const periodTasks = tasks.filter(t => {
        const taskTime = new Date(t.created_at);
        return taskTime >= timestamp && taskTime < nextTimestamp;
      });
      
      const completed = periodTasks.filter(t => t.status === 'completed').length;
      const performance = periodTasks.length > 0 ? (completed / periodTasks.length) * 100 : 0;
      
      trends.push({
        timestamp: timestamp.toISOString(),
        value: performance
      });
    }

    return trends;
  }

  private generateResourceUsageData(
    periodStart: string,
    periodEnd: string
  ): { timestamp: string; cpu: number; memory: number }[] {
    // Mock data - in real implementation, get from system metrics
    const data: { timestamp: string; cpu: number; memory: number }[] = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const interval = (end.getTime() - start.getTime()) / 20;

    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(start.getTime() + i * interval);
      data.push({
        timestamp: timestamp.toISOString(),
        cpu: Math.random() * 100,
        memory: Math.random() * 100
      });
    }

    return data;
  }

  // Action Implementations
  private async restartAgent(agentId: string) {
    // Implementation would restart the agent
    console.log(`Restarting agent ${agentId}`);
  }

  private async scaleResources(parameters: any) {
    // Implementation would scale resources
    console.log('Scaling resources:', parameters);
  }

  private async notifyAdmin(alert: Alert, parameters: any) {
    // Implementation would send notifications
    console.log('Notifying admin:', alert.title);
  }

  private async runScript(script: string, args: any[]) {
    // Implementation would run the script
    console.log(`Running script: ${script}`, args);
  }

  // System Resource Methods (Mock implementations)
  private async getSystemLoad(): Promise<number> {
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<number> {
    return Math.random() * 100;
  }

  private async getNetworkThroughput(): Promise<number> {
    return Math.random() * 1000;
  }

  private async getSystemUptime(): Promise<number> {
    return 99.9;
  }

  private async getAgentMemoryUsage(agentId: string): Promise<number> {
    return Math.random() * 100;
  }

  private async getAgentCpuUsage(agentId: string): Promise<number> {
    return Math.random() * 100;
  }

  private async getAgentUptime(agentId: string): Promise<number> {
    return Math.random() * 100;
  }

  // Public API Methods
  async getAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
    return this.metricsCache.get(agentId) || null;
  }

  async getSystemMetrics(): Promise<SystemMetrics | null> {
    return this.systemMetrics;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getMonitoringRules(): Promise<MonitoringRule[]> {
    return Array.from(this.monitoringRules.values());
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'acknowledged';
    alert.updated_at = new Date().toISOString();

    await this.supabase
      .from('alerts')
      .update({
        status: alert.status,
        updated_at: alert.updated_at
      })
      .eq('id', alertId);

    this.emit('alert_acknowledged', alert);
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }

    this.metricsCache.clear();
    this.monitoringRules.clear();
    this.activeAlerts.clear();
    this.removeAllListeners();
  }
}

export default AgentMonitoringService;
export type {
  AgentMetrics,
  SystemMetrics,
  Alert,
  PerformanceReport,
  MonitoringRule,
  MetricData
};