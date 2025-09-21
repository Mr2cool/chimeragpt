import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: 'utility' | 'integration' | 'ai-model' | 'data-source' | 'notification' | 'security' | 'monitoring';
  tags: string[];
  main_file: string;
  dependencies: string[];
  permissions: {
    file_system: boolean;
    network: boolean;
    database: boolean;
    environment: boolean;
    agent_communication: boolean;
  };
  configuration_schema: any;
  hooks: string[]; // Available hook points
  status: 'active' | 'inactive' | 'error';
  installed_at: string;
  updated_at: string;
}

interface PluginInstance {
  id: string;
  plugin_id: string;
  agent_id: string;
  configuration: any;
  status: 'enabled' | 'disabled' | 'error';
  error_message?: string;
  performance_metrics: {
    execution_count: number;
    total_execution_time: number;
    average_execution_time: number;
    error_count: number;
    last_execution: string;
  };
  created_at: string;
  updated_at: string;
}

interface HookRegistry {
  [hookName: string]: {
    plugins: string[]; // plugin instance IDs
    priority: { [pluginId: string]: number };
  };
}

interface DebugSession {
  id: string;
  agent_id: string;
  plugin_id?: string;
  type: 'agent' | 'plugin' | 'workflow';
  status: 'active' | 'paused' | 'completed';
  breakpoints: {
    id: string;
    location: string;
    condition?: string;
    enabled: boolean;
  }[];
  variables: Record<string, any>;
  call_stack: string[];
  logs: {
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: any;
  }[];
  created_at: string;
  updated_at: string;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  target_type: 'agent' | 'plugin' | 'workflow';
  target_id: string;
  test_cases: TestCase[];
  status: 'draft' | 'ready' | 'running' | 'completed' | 'failed';
  last_run?: string;
  results?: TestResults;
  created_at: string;
  updated_at: string;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'performance' | 'security';
  input: any;
  expected_output: any;
  setup?: string; // Setup code
  teardown?: string; // Cleanup code
  timeout: number; // milliseconds
  enabled: boolean;
}

interface TestResults {
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  execution_time: number;
  test_results: {
    test_case_id: string;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    execution_time: number;
    error_message?: string;
    actual_output?: any;
  }[];
}

class AgentPluginSystem extends EventEmitter {
  private supabase: any;
  private loadedPlugins: Map<string, any> = new Map();
  private pluginInstances: Map<string, PluginInstance> = new Map();
  private hookRegistry: HookRegistry = {};
  private debugSessions: Map<string, DebugSession> = new Map();
  private testRunner: TestRunner;

  constructor() {
    super();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.testRunner = new TestRunner(this.supabase);
    this.initializeSystem();
  }

  private async initializeSystem() {
    await this.loadInstalledPlugins();
    await this.loadPluginInstances();
    this.setupHookRegistry();
  }

  // Plugin Management
  async installPlugin(pluginData: Omit<Plugin, 'id' | 'status' | 'installed_at' | 'updated_at'>): Promise<string> {
    // Validate plugin
    await this.validatePlugin(pluginData);

    const plugin: Omit<Plugin, 'id'> = {
      ...pluginData,
      status: 'inactive',
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('plugins')
      .insert(plugin)
      .select()
      .single();

    if (error) throw error;

    // Load plugin code
    await this.loadPlugin(data.id);

    return data.id;
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    // Disable all instances first
    const instances = Array.from(this.pluginInstances.values())
      .filter(instance => instance.plugin_id === pluginId);

    for (const instance of instances) {
      await this.disablePluginInstance(instance.id);
    }

    // Remove from database
    await this.supabase
      .from('plugins')
      .delete()
      .eq('id', pluginId);

    // Clean up loaded plugin
    this.loadedPlugins.delete(pluginId);
    this.emit('plugin_uninstalled', { pluginId });
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const { error } = await this.supabase
      .from('plugins')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', pluginId);

    if (error) throw error;

    await this.loadPlugin(pluginId);
    this.emit('plugin_enabled', { pluginId });
  }

  async disablePlugin(pluginId: string): Promise<void> {
    // Disable all instances
    const instances = Array.from(this.pluginInstances.values())
      .filter(instance => instance.plugin_id === pluginId);

    for (const instance of instances) {
      await this.disablePluginInstance(instance.id);
    }

    const { error } = await this.supabase
      .from('plugins')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', pluginId);

    if (error) throw error;

    this.loadedPlugins.delete(pluginId);
    this.emit('plugin_disabled', { pluginId });
  }

  private async loadPlugin(pluginId: string): Promise<void> {
    const { data: plugin } = await this.supabase
      .from('plugins')
      .select('*')
      .eq('id', pluginId)
      .single();

    if (!plugin || plugin.status !== 'active') return;

    try {
      // In a real implementation, this would safely load and sandbox the plugin code
      const pluginCode = await this.loadPluginCode(plugin.main_file);
      const pluginInstance = await this.instantiatePlugin(pluginCode, plugin);
      
      this.loadedPlugins.set(pluginId, pluginInstance);
      this.emit('plugin_loaded', { pluginId, plugin });
    } catch (error) {
      await this.supabase
        .from('plugins')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', pluginId);
      
      this.emit('plugin_error', { pluginId, error });
    }
  }

  private async loadInstalledPlugins(): Promise<void> {
    const { data: plugins } = await this.supabase
      .from('plugins')
      .select('*')
      .eq('status', 'active');

    if (plugins) {
      for (const plugin of plugins) {
        await this.loadPlugin(plugin.id);
      }
    }
  }

  // Plugin Instance Management
  async createPluginInstance(
    pluginId: string,
    agentId: string,
    configuration: any
  ): Promise<string> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not loaded or not active');
    }

    // Validate configuration
    const { data: pluginData } = await this.supabase
      .from('plugins')
      .select('configuration_schema')
      .eq('id', pluginId)
      .single();

    if (pluginData?.configuration_schema) {
      const isValid = this.validateConfiguration(configuration, pluginData.configuration_schema);
      if (!isValid) {
        throw new Error('Invalid plugin configuration');
      }
    }

    const instance: Omit<PluginInstance, 'id'> = {
      plugin_id: pluginId,
      agent_id: agentId,
      configuration,
      status: 'enabled',
      performance_metrics: {
        execution_count: 0,
        total_execution_time: 0,
        average_execution_time: 0,
        error_count: 0,
        last_execution: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('plugin_instances')
      .insert(instance)
      .select()
      .single();

    if (error) throw error;

    this.pluginInstances.set(data.id, data);
    this.registerPluginHooks(data.id, pluginId);
    
    this.emit('plugin_instance_created', { instanceId: data.id, pluginId, agentId });
    return data.id;
  }

  async enablePluginInstance(instanceId: string): Promise<void> {
    const instance = this.pluginInstances.get(instanceId);
    if (!instance) {
      throw new Error('Plugin instance not found');
    }

    instance.status = 'enabled';
    instance.updated_at = new Date().toISOString();

    await this.supabase
      .from('plugin_instances')
      .update({
        status: instance.status,
        updated_at: instance.updated_at
      })
      .eq('id', instanceId);

    this.registerPluginHooks(instanceId, instance.plugin_id);
    this.emit('plugin_instance_enabled', { instanceId });
  }

  async disablePluginInstance(instanceId: string): Promise<void> {
    const instance = this.pluginInstances.get(instanceId);
    if (!instance) return;

    instance.status = 'disabled';
    instance.updated_at = new Date().toISOString();

    await this.supabase
      .from('plugin_instances')
      .update({
        status: instance.status,
        updated_at: instance.updated_at
      })
      .eq('id', instanceId);

    this.unregisterPluginHooks(instanceId);
    this.emit('plugin_instance_disabled', { instanceId });
  }

  private async loadPluginInstances(): Promise<void> {
    const { data: instances } = await this.supabase
      .from('plugin_instances')
      .select('*')
      .eq('status', 'enabled');

    if (instances) {
      for (const instance of instances) {
        this.pluginInstances.set(instance.id, instance);
      }
    }
  }

  // Hook System
  private setupHookRegistry(): void {
    const commonHooks = [
      'before_task_execution',
      'after_task_execution',
      'before_agent_communication',
      'after_agent_communication',
      'on_error',
      'on_agent_start',
      'on_agent_stop',
      'before_data_processing',
      'after_data_processing'
    ];

    for (const hook of commonHooks) {
      this.hookRegistry[hook] = { plugins: [], priority: {} };
    }
  }

  private registerPluginHooks(instanceId: string, pluginId: string): void {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin || !plugin.hooks) return;

    for (const hook of plugin.hooks) {
      if (!this.hookRegistry[hook]) {
        this.hookRegistry[hook] = { plugins: [], priority: {} };
      }

      if (!this.hookRegistry[hook].plugins.includes(instanceId)) {
        this.hookRegistry[hook].plugins.push(instanceId);
        this.hookRegistry[hook].priority[instanceId] = plugin.priority || 50;
        
        // Sort by priority
        this.hookRegistry[hook].plugins.sort((a, b) => 
          this.hookRegistry[hook].priority[a] - this.hookRegistry[hook].priority[b]
        );
      }
    }
  }

  private unregisterPluginHooks(instanceId: string): void {
    for (const hook in this.hookRegistry) {
      const index = this.hookRegistry[hook].plugins.indexOf(instanceId);
      if (index > -1) {
        this.hookRegistry[hook].plugins.splice(index, 1);
        delete this.hookRegistry[hook].priority[instanceId];
      }
    }
  }

  async executeHook(hookName: string, context: any): Promise<any> {
    const hookData = this.hookRegistry[hookName];
    if (!hookData || hookData.plugins.length === 0) {
      return context;
    }

    let result = context;

    for (const instanceId of hookData.plugins) {
      const instance = this.pluginInstances.get(instanceId);
      if (!instance || instance.status !== 'enabled') continue;

      const plugin = this.loadedPlugins.get(instance.plugin_id);
      if (!plugin) continue;

      try {
        const startTime = Date.now();
        result = await plugin.executeHook(hookName, result, instance.configuration);
        const executionTime = Date.now() - startTime;

        // Update metrics
        await this.updatePluginMetrics(instanceId, executionTime, false);
      } catch (error) {
        await this.updatePluginMetrics(instanceId, 0, true);
        this.emit('plugin_hook_error', { instanceId, hookName, error });
        
        // Continue with other plugins unless it's a critical error
        if (error.critical) {
          throw error;
        }
      }
    }

    return result;
  }

  private async updatePluginMetrics(
    instanceId: string,
    executionTime: number,
    isError: boolean
  ): Promise<void> {
    const instance = this.pluginInstances.get(instanceId);
    if (!instance) return;

    const metrics = instance.performance_metrics;
    metrics.execution_count += 1;
    metrics.total_execution_time += executionTime;
    metrics.average_execution_time = metrics.total_execution_time / metrics.execution_count;
    metrics.last_execution = new Date().toISOString();
    
    if (isError) {
      metrics.error_count += 1;
    }

    await this.supabase
      .from('plugin_instances')
      .update({ performance_metrics: metrics })
      .eq('id', instanceId);
  }

  // Debugging System
  async createDebugSession(
    agentId: string,
    options: {
      pluginId?: string;
      type?: 'agent' | 'plugin' | 'workflow';
    } = {}
  ): Promise<string> {
    const session: Omit<DebugSession, 'id'> = {
      agent_id: agentId,
      plugin_id: options.pluginId,
      type: options.type || 'agent',
      status: 'active',
      breakpoints: [],
      variables: {},
      call_stack: [],
      logs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('debug_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;

    this.debugSessions.set(data.id, data);
    this.emit('debug_session_created', { sessionId: data.id, agentId });
    
    return data.id;
  }

  async addBreakpoint(
    sessionId: string,
    location: string,
    condition?: string
  ): Promise<string> {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error('Debug session not found');
    }

    const breakpoint = {
      id: this.generateId(),
      location,
      condition,
      enabled: true
    };

    session.breakpoints.push(breakpoint);
    session.updated_at = new Date().toISOString();

    await this.supabase
      .from('debug_sessions')
      .update({
        breakpoints: session.breakpoints,
        updated_at: session.updated_at
      })
      .eq('id', sessionId);

    this.emit('breakpoint_added', { sessionId, breakpoint });
    return breakpoint.id;
  }

  async logDebugMessage(
    sessionId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: any
  ): Promise<void> {
    const session = this.debugSessions.get(sessionId);
    if (!session) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    session.logs.push(logEntry);
    
    // Keep only last 1000 logs
    if (session.logs.length > 1000) {
      session.logs = session.logs.slice(-1000);
    }

    session.updated_at = new Date().toISOString();

    await this.supabase
      .from('debug_sessions')
      .update({
        logs: session.logs,
        updated_at: session.updated_at
      })
      .eq('id', sessionId);

    this.emit('debug_log', { sessionId, logEntry });
  }

  async updateDebugVariables(
    sessionId: string,
    variables: Record<string, any>
  ): Promise<void> {
    const session = this.debugSessions.get(sessionId);
    if (!session) return;

    session.variables = { ...session.variables, ...variables };
    session.updated_at = new Date().toISOString();

    await this.supabase
      .from('debug_sessions')
      .update({
        variables: session.variables,
        updated_at: session.updated_at
      })
      .eq('id', sessionId);

    this.emit('debug_variables_updated', { sessionId, variables });
  }

  // Testing System
  async createTestSuite(
    testSuiteData: Omit<TestSuite, 'id' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const testSuite: Omit<TestSuite, 'id'> = {
      ...testSuiteData,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('test_suites')
      .insert(testSuite)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async runTestSuite(testSuiteId: string): Promise<TestResults> {
    const { data: testSuite } = await this.supabase
      .from('test_suites')
      .select('*')
      .eq('id', testSuiteId)
      .single();

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    // Update status to running
    await this.supabase
      .from('test_suites')
      .update({ 
        status: 'running',
        last_run: new Date().toISOString()
      })
      .eq('id', testSuiteId);

    try {
      const results = await this.testRunner.runTestSuite(testSuite);
      
      // Update with results
      await this.supabase
        .from('test_suites')
        .update({
          status: results.failed > 0 ? 'failed' : 'completed',
          results,
          updated_at: new Date().toISOString()
        })
        .eq('id', testSuiteId);

      this.emit('test_suite_completed', { testSuiteId, results });
      return results;
    } catch (error) {
      await this.supabase
        .from('test_suites')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', testSuiteId);

      this.emit('test_suite_failed', { testSuiteId, error });
      throw error;
    }
  }

  // Utility Methods
  private async validatePlugin(pluginData: any): Promise<void> {
    // Validate required fields
    const requiredFields = ['name', 'version', 'main_file', 'permissions'];
    for (const field of requiredFields) {
      if (!pluginData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate permissions
    const validPermissions = ['file_system', 'network', 'database', 'environment', 'agent_communication'];
    for (const permission of validPermissions) {
      if (typeof pluginData.permissions[permission] !== 'boolean') {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  private validateConfiguration(config: any, schema: any): boolean {
    // Simple validation - in production, use a proper JSON schema validator
    try {
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in config)) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  private async loadPluginCode(mainFile: string): Promise<string> {
    // In a real implementation, this would load the plugin code from a secure location
    return `
      class Plugin {
        constructor(config) {
          this.config = config;
        }
        
        async executeHook(hookName, context, config) {
          // Plugin implementation
          return context;
        }
      }
      
      module.exports = Plugin;
    `;
  }

  private async instantiatePlugin(code: string, plugin: Plugin): Promise<any> {
    // In a real implementation, this would safely execute the plugin code in a sandbox
    return {
      hooks: plugin.hooks,
      priority: 50,
      executeHook: async (hookName: string, context: any, config: any) => {
        // Mock implementation
        return context;
      }
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics and Monitoring
  async getPluginAnalytics(): Promise<{
    totalPlugins: number;
    activePlugins: number;
    totalInstances: number;
    enabledInstances: number;
    averageExecutionTime: number;
    errorRate: number;
    topPlugins: { plugin_id: string; execution_count: number }[];
  }> {
    const [pluginsData, instancesData] = await Promise.all([
      this.supabase.from('plugins').select('status'),
      this.supabase.from('plugin_instances').select('status, performance_metrics')
    ]);

    const plugins = pluginsData.data || [];
    const instances = instancesData.data || [];

    const totalExecutions = instances.reduce((sum, i) => 
      sum + (i.performance_metrics?.execution_count || 0), 0);
    const totalTime = instances.reduce((sum, i) => 
      sum + (i.performance_metrics?.total_execution_time || 0), 0);
    const totalErrors = instances.reduce((sum, i) => 
      sum + (i.performance_metrics?.error_count || 0), 0);

    return {
      totalPlugins: plugins.length,
      activePlugins: plugins.filter(p => p.status === 'active').length,
      totalInstances: instances.length,
      enabledInstances: instances.filter(i => i.status === 'enabled').length,
      averageExecutionTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
      errorRate: totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0,
      topPlugins: [] // Would calculate from actual data
    };
  }

  // Cleanup
  async shutdown(): Promise<void> {
    // Stop all debug sessions
    for (const sessionId of this.debugSessions.keys()) {
      await this.supabase
        .from('debug_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    }

    // Clear all data
    this.loadedPlugins.clear();
    this.pluginInstances.clear();
    this.debugSessions.clear();
    this.hookRegistry = {};
    
    this.removeAllListeners();
  }
}

// Test Runner Class
class TestRunner {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async runTestSuite(testSuite: TestSuite): Promise<TestResults> {
    const startTime = Date.now();
    const results: TestResults = {
      total_tests: testSuite.test_cases.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      execution_time: 0,
      test_results: []
    };

    for (const testCase of testSuite.test_cases) {
      if (!testCase.enabled) {
        results.skipped++;
        results.test_results.push({
          test_case_id: testCase.id,
          status: 'skipped',
          execution_time: 0
        });
        continue;
      }

      const testResult = await this.runTestCase(testCase, testSuite);
      results.test_results.push(testResult);

      if (testResult.status === 'passed') {
        results.passed++;
      } else if (testResult.status === 'failed' || testResult.status === 'error') {
        results.failed++;
      }
    }

    results.execution_time = Date.now() - startTime;
    return results;
  }

  private async runTestCase(
    testCase: TestCase,
    testSuite: TestSuite
  ): Promise<TestResults['test_results'][0]> {
    const startTime = Date.now();

    try {
      // Setup
      if (testCase.setup) {
        await this.executeCode(testCase.setup);
      }

      // Execute test
      const actualOutput = await this.executeTest(testCase, testSuite);
      
      // Compare results
      const passed = this.compareResults(actualOutput, testCase.expected_output);

      // Teardown
      if (testCase.teardown) {
        await this.executeCode(testCase.teardown);
      }

      return {
        test_case_id: testCase.id,
        status: passed ? 'passed' : 'failed',
        execution_time: Date.now() - startTime,
        actual_output: actualOutput,
        error_message: passed ? undefined : 'Output does not match expected result'
      };
    } catch (error) {
      return {
        test_case_id: testCase.id,
        status: 'error',
        execution_time: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeTest(testCase: TestCase, testSuite: TestSuite): Promise<any> {
    // Mock test execution - in a real implementation, this would execute the actual test
    switch (testCase.type) {
      case 'unit':
        return this.executeUnitTest(testCase, testSuite);
      case 'integration':
        return this.executeIntegrationTest(testCase, testSuite);
      case 'performance':
        return this.executePerformanceTest(testCase, testSuite);
      case 'security':
        return this.executeSecurityTest(testCase, testSuite);
      default:
        throw new Error(`Unknown test type: ${testCase.type}`);
    }
  }

  private async executeUnitTest(testCase: TestCase, testSuite: TestSuite): Promise<any> {
    // Mock unit test execution
    return { success: true, result: 'Unit test passed' };
  }

  private async executeIntegrationTest(testCase: TestCase, testSuite: TestSuite): Promise<any> {
    // Mock integration test execution
    return { success: true, result: 'Integration test passed' };
  }

  private async executePerformanceTest(testCase: TestCase, testSuite: TestSuite): Promise<any> {
    // Mock performance test execution
    return { 
      execution_time: 150,
      memory_usage: 1024,
      cpu_usage: 25
    };
  }

  private async executeSecurityTest(testCase: TestCase, testSuite: TestSuite): Promise<any> {
    // Mock security test execution
    return {
      vulnerabilities_found: 0,
      security_score: 95
    };
  }

  private async executeCode(code: string): Promise<any> {
    // Mock code execution - in a real implementation, this would safely execute the code
    return { success: true };
  }

  private compareResults(actual: any, expected: any): boolean {
    // Simple comparison - in a real implementation, this would be more sophisticated
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
}

export default AgentPluginSystem;
export type {
  Plugin,
  PluginInstance,
  DebugSession,
  TestSuite,
  TestCase,
  TestResults
};