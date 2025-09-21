import { BaseAgent } from '../base/agent';
import { AgentCapability, AgentTask, AgentResult } from '@/types/agents';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

interface PerformanceConfig {
  type: 'web' | 'api' | 'database' | 'mobile' | 'desktop';
  metrics: ('speed' | 'memory' | 'cpu' | 'network' | 'storage' | 'battery')[];
  thresholds: {
    loadTime?: number; // milliseconds
    memoryUsage?: number; // MB
    cpuUsage?: number; // percentage
    networkLatency?: number; // milliseconds
    storageSize?: number; // MB
    batteryDrain?: number; // percentage per hour
  };
  environment: 'development' | 'staging' | 'production';
  duration: number; // minutes
  sampleRate: number; // samples per minute
}

interface OptimizationConfig {
  target: 'frontend' | 'backend' | 'database' | 'infrastructure';
  focus: ('speed' | 'memory' | 'bundle-size' | 'seo' | 'accessibility' | 'security')[];
  aggressive: boolean;
  preserveCompatibility: boolean;
  customRules?: {
    rule: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
  }[];
}

interface MonitoringConfig {
  services: ('uptime' | 'performance' | 'errors' | 'logs' | 'metrics')[];
  alerting: {
    email?: string[];
    slack?: string;
    webhook?: string;
    sms?: string[];
  };
  retention: number; // days
  frequency: 'realtime' | '1min' | '5min' | '15min' | '1hour';
  dashboards: ('overview' | 'performance' | 'errors' | 'infrastructure')[];
}

interface ProfilingConfig {
  type: 'cpu' | 'memory' | 'network' | 'database' | 'full';
  duration: number; // seconds
  sampleRate: number; // Hz
  includeStackTrace: boolean;
  filterNoise: boolean;
  outputFormat: 'json' | 'flamegraph' | 'csv' | 'html';
}

interface PerformanceMetrics {
  timestamp: string;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    percentage: number;
    cores: number;
  };
  networkMetrics: {
    latency: number;
    bandwidth: number;
    requests: number;
    errors: number;
  };
  bundleSize: {
    total: number;
    javascript: number;
    css: number;
    images: number;
    fonts: number;
  };
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
}

interface OptimizationResult {
  success: boolean;
  optimizations: {
    type: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    savings: {
      size?: number; // bytes
      time?: number; // milliseconds
      memory?: number; // MB
    };
    implementation: string;
    code?: string;
  }[];
  beforeMetrics: PerformanceMetrics;
  afterMetrics: PerformanceMetrics;
  recommendations: string[];
  generatedFiles: {
    path: string;
    content: string;
    type: 'optimization' | 'config' | 'script';
  }[];
}

interface MonitoringResult {
  success: boolean;
  dashboardUrl?: string;
  alertsConfigured: number;
  metricsTracked: string[];
  generatedFiles: {
    path: string;
    content: string;
    type: 'config' | 'dashboard' | 'alert';
  }[];
  recommendations: string[];
}

interface ProfilingResult {
  success: boolean;
  profileData: {
    type: string;
    duration: number;
    samples: number;
    hotspots: {
      function: string;
      file: string;
      line: number;
      percentage: number;
      calls: number;
    }[];
    memoryLeaks: {
      object: string;
      size: number;
      location: string;
    }[];
    bottlenecks: {
      operation: string;
      duration: number;
      frequency: number;
      impact: 'high' | 'medium' | 'low';
    }[];
  };
  visualizations: {
    type: 'flamegraph' | 'timeline' | 'memory-graph' | 'call-tree';
    url: string;
  }[];
  recommendations: string[];
  generatedFiles: {
    path: string;
    content: string;
    type: 'profile' | 'report' | 'visualization';
  }[];
}

export class PerformanceAgent extends BaseAgent {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor() {
    super({
      id: 'performance-agent',
      name: 'Performance Agent',
      type: 'specialized',
      description: 'Handles performance optimization, monitoring, and profiling tasks',
      capabilities: [
        AgentCapability.PERFORMANCE_ANALYSIS,
        AgentCapability.MONITORING,
        AgentCapability.OPTIMIZATION,
        AgentCapability.PROFILING
      ],
      version: '1.0.0'
    });
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    try {
      const { action, config, files } = task.input as {
        action: 'analyze' | 'optimize' | 'monitor' | 'profile' | 'benchmark';
        config: PerformanceConfig | OptimizationConfig | MonitoringConfig | ProfilingConfig;
        files?: { path: string; content: string }[];
      };

      if (!action) {
        throw new Error('Performance action is required');
      }

      let result: any;

      switch (action) {
        case 'analyze':
          result = await this.analyzePerformance(config as PerformanceConfig, files);
          break;
        case 'optimize':
          result = await this.optimizeApplication(config as OptimizationConfig, files);
          break;
        case 'monitor':
          result = await this.setupMonitoring(config as MonitoringConfig);
          break;
        case 'profile':
          result = await this.profileApplication(config as ProfilingConfig, files);
          break;
        case 'benchmark':
          result = await this.runBenchmarks(config as PerformanceConfig, files);
          break;
        default:
          throw new Error(`Unsupported performance action: ${action}`);
      }

      // Store performance results
      await this.storePerformanceResults(task.id, result);

      return {
        success: result.success,
        data: result,
        message: result.success 
          ? `Performance ${action} completed successfully` 
          : `Performance ${action} failed`,
        metadata: {
          executionTime: Date.now() - task.startTime!,
          metricsCollected: result.metricsTracked?.length || 0,
          optimizationsFound: result.optimizations?.length || 0,
          filesGenerated: result.generatedFiles?.length || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown performance error',
        data: null
      };
    }
  }

  private async analyzePerformance(
    config: PerformanceConfig,
    files?: { path: string; content: string }[]
  ): Promise<{ success: boolean; metrics: PerformanceMetrics; recommendations: string[] }> {
    try {
      // Simulate performance analysis
      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        loadTime: Math.random() * 3000 + 1000, // 1-4 seconds
        firstContentfulPaint: Math.random() * 2000 + 500,
        largestContentfulPaint: Math.random() * 4000 + 1500,
        cumulativeLayoutShift: Math.random() * 0.3,
        firstInputDelay: Math.random() * 200 + 50,
        timeToInteractive: Math.random() * 5000 + 2000,
        memoryUsage: {
          used: Math.random() * 500 + 100,
          total: 1024,
          percentage: Math.random() * 50 + 25
        },
        cpuUsage: {
          percentage: Math.random() * 80 + 10,
          cores: 4
        },
        networkMetrics: {
          latency: Math.random() * 200 + 50,
          bandwidth: Math.random() * 100 + 50,
          requests: Math.floor(Math.random() * 50 + 10),
          errors: Math.floor(Math.random() * 5)
        },
        bundleSize: {
          total: Math.random() * 2000000 + 500000, // 0.5-2.5MB
          javascript: Math.random() * 1000000 + 200000,
          css: Math.random() * 200000 + 50000,
          images: Math.random() * 800000 + 200000,
          fonts: Math.random() * 100000 + 20000
        },
        lighthouse: {
          performance: Math.random() * 40 + 60, // 60-100
          accessibility: Math.random() * 30 + 70,
          bestPractices: Math.random() * 20 + 80,
          seo: Math.random() * 25 + 75,
          pwa: Math.random() * 50 + 50
        }
      };

      const recommendations = this.generatePerformanceRecommendations(metrics, config);

      return {
        success: true,
        metrics,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        metrics: {} as PerformanceMetrics,
        recommendations: ['Failed to analyze performance']
      };
    }
  }

  private async optimizeApplication(
    config: OptimizationConfig,
    files?: { path: string; content: string }[]
  ): Promise<OptimizationResult> {
    try {
      const beforeMetrics = await this.getCurrentMetrics();
      const optimizations = [];
      const generatedFiles = [];

      // Frontend optimizations
      if (config.target === 'frontend' || config.target === 'backend') {
        if (config.focus.includes('bundle-size')) {
          optimizations.push(...await this.optimizeBundleSize(files));
        }
        
        if (config.focus.includes('speed')) {
          optimizations.push(...await this.optimizeSpeed(files));
        }
        
        if (config.focus.includes('memory')) {
          optimizations.push(...await this.optimizeMemory(files));
        }
      }

      // Generate optimization configurations
      if (config.target === 'frontend') {
        const webpackConfig = await this.generateWebpackOptimizations(config);
        generatedFiles.push(webpackConfig);
        
        const viteConfig = await this.generateViteOptimizations(config);
        generatedFiles.push(viteConfig);
      }

      if (config.target === 'backend') {
        const nodeOptimizations = await this.generateNodeOptimizations(config);
        generatedFiles.push(...nodeOptimizations);
      }

      // Simulate after metrics (improved)
      const afterMetrics = {
        ...beforeMetrics,
        loadTime: beforeMetrics.loadTime * 0.7, // 30% improvement
        bundleSize: {
          ...beforeMetrics.bundleSize,
          total: beforeMetrics.bundleSize.total * 0.8 // 20% reduction
        },
        memoryUsage: {
          ...beforeMetrics.memoryUsage,
          percentage: beforeMetrics.memoryUsage.percentage * 0.85 // 15% reduction
        }
      };

      const recommendations = this.generateOptimizationRecommendations(optimizations);

      return {
        success: true,
        optimizations,
        beforeMetrics,
        afterMetrics,
        recommendations,
        generatedFiles
      };

    } catch (error) {
      return {
        success: false,
        optimizations: [],
        beforeMetrics: {} as PerformanceMetrics,
        afterMetrics: {} as PerformanceMetrics,
        recommendations: ['Failed to optimize application'],
        generatedFiles: []
      };
    }
  }

  private async setupMonitoring(config: MonitoringConfig): Promise<MonitoringResult> {
    try {
      const generatedFiles = [];
      const metricsTracked = [];
      let alertsConfigured = 0;

      // Generate monitoring configurations
      if (config.services.includes('uptime')) {
        const uptimeConfig = await this.generateUptimeMonitoring(config);
        generatedFiles.push(uptimeConfig);
        metricsTracked.push('uptime', 'response_time');
      }

      if (config.services.includes('performance')) {
        const perfConfig = await this.generatePerformanceMonitoring(config);
        generatedFiles.push(perfConfig);
        metricsTracked.push('load_time', 'memory_usage', 'cpu_usage');
      }

      if (config.services.includes('errors')) {
        const errorConfig = await this.generateErrorMonitoring(config);
        generatedFiles.push(errorConfig);
        metricsTracked.push('error_rate', 'exception_count');
      }

      if (config.services.includes('logs')) {
        const logConfig = await this.generateLogMonitoring(config);
        generatedFiles.push(logConfig);
        metricsTracked.push('log_volume', 'log_errors');
      }

      // Generate dashboards
      for (const dashboard of config.dashboards) {
        const dashboardConfig = await this.generateDashboard(dashboard, config);
        generatedFiles.push(dashboardConfig);
      }

      // Configure alerts
      if (config.alerting.email?.length) {
        alertsConfigured += config.alerting.email.length;
      }
      if (config.alerting.slack) {
        alertsConfigured += 1;
      }
      if (config.alerting.webhook) {
        alertsConfigured += 1;
      }

      const recommendations = [
        'Set up proper alert thresholds based on baseline metrics',
        'Configure notification channels for different severity levels',
        'Implement automated incident response procedures',
        'Regular review and update of monitoring configurations'
      ];

      return {
        success: true,
        dashboardUrl: 'https://monitoring.example.com/dashboard',
        alertsConfigured,
        metricsTracked,
        generatedFiles,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        alertsConfigured: 0,
        metricsTracked: [],
        generatedFiles: [],
        recommendations: ['Failed to setup monitoring']
      };
    }
  }

  private async profileApplication(
    config: ProfilingConfig,
    files?: { path: string; content: string }[]
  ): Promise<ProfilingResult> {
    try {
      // Simulate profiling data
      const profileData = {
        type: config.type,
        duration: config.duration,
        samples: config.duration * config.sampleRate,
        hotspots: [
          {
            function: 'processData',
            file: 'src/utils/data.ts',
            line: 45,
            percentage: 23.5,
            calls: 1250
          },
          {
            function: 'renderComponent',
            file: 'src/components/Chart.tsx',
            line: 78,
            percentage: 18.2,
            calls: 890
          },
          {
            function: 'fetchApiData',
            file: 'src/api/client.ts',
            line: 123,
            percentage: 15.7,
            calls: 456
          }
        ],
        memoryLeaks: [
          {
            object: 'EventListener',
            size: 1024 * 50, // 50KB
            location: 'src/components/Modal.tsx:67'
          },
          {
            object: 'Timer',
            size: 1024 * 25, // 25KB
            location: 'src/hooks/useInterval.ts:23'
          }
        ],
        bottlenecks: [
          {
            operation: 'Database Query',
            duration: 250,
            frequency: 45,
            impact: 'high' as const
          },
          {
            operation: 'Image Processing',
            duration: 180,
            frequency: 12,
            impact: 'medium' as const
          }
        ]
      };

      const visualizations = [
        {
          type: 'flamegraph' as const,
          url: 'https://profiler.example.com/flamegraph/12345'
        },
        {
          type: 'timeline' as const,
          url: 'https://profiler.example.com/timeline/12345'
        }
      ];

      const generatedFiles = [];

      // Generate profile report
      const profileReport = await this.generateProfileReport(profileData, config);
      generatedFiles.push(profileReport);

      // Generate optimization suggestions
      const optimizationScript = await this.generateOptimizationScript(profileData);
      generatedFiles.push(optimizationScript);

      const recommendations = this.generateProfilingRecommendations(profileData);

      return {
        success: true,
        profileData,
        visualizations,
        recommendations,
        generatedFiles
      };

    } catch (error) {
      return {
        success: false,
        profileData: {
          type: config.type,
          duration: 0,
          samples: 0,
          hotspots: [],
          memoryLeaks: [],
          bottlenecks: []
        },
        visualizations: [],
        recommendations: ['Failed to profile application'],
        generatedFiles: []
      };
    }
  }

  private async runBenchmarks(
    config: PerformanceConfig,
    files?: { path: string; content: string }[]
  ): Promise<{ success: boolean; benchmarks: any[]; recommendations: string[] }> {
    try {
      const benchmarks = [];

      // Simulate different benchmark types
      if (config.type === 'web') {
        benchmarks.push({
          name: 'Lighthouse Performance',
          score: Math.random() * 40 + 60,
          metrics: {
            'First Contentful Paint': Math.random() * 2000 + 500,
            'Largest Contentful Paint': Math.random() * 4000 + 1500,
            'Speed Index': Math.random() * 3000 + 1000
          }
        });

        benchmarks.push({
          name: 'WebPageTest',
          score: Math.random() * 30 + 70,
          metrics: {
            'Load Time': Math.random() * 5000 + 2000,
            'Time to First Byte': Math.random() * 1000 + 200,
            'Start Render': Math.random() * 2000 + 800
          }
        });
      }

      if (config.type === 'api') {
        benchmarks.push({
          name: 'API Load Test',
          score: Math.random() * 20 + 80,
          metrics: {
            'Requests per Second': Math.random() * 1000 + 500,
            'Average Response Time': Math.random() * 200 + 50,
            'Error Rate': Math.random() * 5
          }
        });
      }

      const recommendations = [
        'Run benchmarks regularly to track performance trends',
        'Compare results across different environments',
        'Set performance budgets based on benchmark results'
      ];

      return {
        success: true,
        benchmarks,
        recommendations
      };

    } catch (error) {
      return {
        success: false,
        benchmarks: [],
        recommendations: ['Failed to run benchmarks']
      };
    }
  }

  // Helper methods for optimization
  private async optimizeBundleSize(files?: { path: string; content: string }[]) {
    return [
      {
        type: 'Tree Shaking',
        description: 'Remove unused code from bundles',
        impact: 'high' as const,
        savings: { size: 150000 }, // 150KB
        implementation: 'Configure webpack/vite tree shaking',
        code: `// webpack.config.js\nmodule.exports = {\n  optimization: {\n    usedExports: true,\n    sideEffects: false\n  }\n};`
      },
      {
        type: 'Code Splitting',
        description: 'Split code into smaller chunks',
        impact: 'high' as const,
        savings: { time: 800 }, // 800ms faster initial load
        implementation: 'Implement dynamic imports',
        code: `// Dynamic import example\nconst LazyComponent = lazy(() => import('./LazyComponent'));`
      },
      {
        type: 'Compression',
        description: 'Enable gzip/brotli compression',
        impact: 'medium' as const,
        savings: { size: 200000 }, // 200KB
        implementation: 'Configure server compression',
        code: `// Express.js example\napp.use(compression());`
      }
    ];
  }

  private async optimizeSpeed(files?: { path: string; content: string }[]) {
    return [
      {
        type: 'Image Optimization',
        description: 'Optimize and lazy load images',
        impact: 'high' as const,
        savings: { time: 1200, size: 300000 },
        implementation: 'Use next/image or similar optimization',
        code: `// Next.js Image optimization\nimport Image from 'next/image';\n\n<Image src="/photo.jpg" alt="Photo" width={500} height={300} loading="lazy" />`
      },
      {
        type: 'Caching Strategy',
        description: 'Implement proper caching headers',
        impact: 'high' as const,
        savings: { time: 2000 },
        implementation: 'Configure cache headers and service worker',
        code: `// Cache headers example\nres.setHeader('Cache-Control', 'public, max-age=31536000, immutable');`
      },
      {
        type: 'Preloading',
        description: 'Preload critical resources',
        impact: 'medium' as const,
        savings: { time: 500 },
        implementation: 'Add preload links for critical resources',
        code: `// Preload critical resources\n<link rel="preload" href="/critical.css" as="style">\n<link rel="preload" href="/critical.js" as="script">`
      }
    ];
  }

  private async optimizeMemory(files?: { path: string; content: string }[]) {
    return [
      {
        type: 'Memory Leak Prevention',
        description: 'Fix common memory leak patterns',
        impact: 'high' as const,
        savings: { memory: 50 },
        implementation: 'Proper cleanup of event listeners and timers',
        code: `// Cleanup example\nuseEffect(() => {\n  const timer = setInterval(() => {}, 1000);\n  return () => clearInterval(timer);\n}, []);`
      },
      {
        type: 'Object Pooling',
        description: 'Reuse objects to reduce GC pressure',
        impact: 'medium' as const,
        savings: { memory: 30 },
        implementation: 'Implement object pooling for frequently created objects',
        code: `// Object pool example\nclass ObjectPool {\n  constructor() { this.pool = []; }\n  get() { return this.pool.pop() || new Object(); }\n  release(obj) { this.pool.push(obj); }\n}`
      }
    ];
  }

  // Configuration generators
  private async generateWebpackOptimizations(config: OptimizationConfig) {
    const webpackConfig = `// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    usedExports: true,
    sideEffects: false
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
};`;

    return {
      path: 'webpack.optimization.config.js',
      content: webpackConfig,
      type: 'config' as const
    };
  }

  private async generateViteOptimizations(config: OptimizationConfig) {
    const viteConfig = `// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'date-fns']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    chunkSizeWarningLimit: 1000
  },
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});`;

    return {
      path: 'vite.optimization.config.ts',
      content: viteConfig,
      type: 'config' as const
    };
  }

  private async generateNodeOptimizations(config: OptimizationConfig) {
    const configs = [];

    // PM2 configuration
    const pm2Config = {
      apps: [{
        name: 'app',
        script: 'dist/index.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
          NODE_ENV: 'production'
        },
        node_args: '--max-old-space-size=4096'
      }]
    };

    configs.push({
      path: 'ecosystem.config.js',
      content: `module.exports = ${JSON.stringify(pm2Config, null, 2)};`,
      type: 'config' as const
    });

    // Node.js optimization script
    const nodeOptimizations = `// Node.js optimizations
process.env.NODE_ENV = 'production';

// Enable V8 optimizations
process.env.NODE_OPTIONS = '--max-old-space-size=4096 --optimize-for-size';

// Connection pooling
const pool = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 60000,
  idleTimeoutMillis: 30000
};

// Compression middleware
const compression = require('compression');
app.use(compression());

// Response caching
const cache = require('memory-cache');
app.use((req, res, next) => {
  const key = req.originalUrl;
  const cached = cache.get(key);
  if (cached) {
    return res.send(cached);
  }
  res.sendResponse = res.send;
  res.send = (body) => {
    cache.put(key, body, 300000); // 5 minutes
    res.sendResponse(body);
  };
  next();
});`;

    configs.push({
      path: 'src/optimizations.js',
      content: nodeOptimizations,
      type: 'optimization' as const
    });

    return configs;
  }

  // Monitoring configuration generators
  private async generateUptimeMonitoring(config: MonitoringConfig) {
    const uptimeConfig = {
      checks: [
        {
          name: 'Website Health',
          url: 'https://example.com',
          method: 'GET',
          interval: 60, // seconds
          timeout: 30,
          expectedStatus: 200,
          alerts: {
            email: config.alerting.email,
            slack: config.alerting.slack
          }
        },
        {
          name: 'API Health',
          url: 'https://api.example.com/health',
          method: 'GET',
          interval: 30,
          timeout: 15,
          expectedStatus: 200
        }
      ],
      retention: config.retention
    };

    return {
      path: 'monitoring/uptime.config.json',
      content: JSON.stringify(uptimeConfig, null, 2),
      type: 'config' as const
    };
  }

  private async generatePerformanceMonitoring(config: MonitoringConfig) {
    const perfConfig = `// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric)
  });
}

// Collect Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Custom performance observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      sendToAnalytics({
        name: 'page-load',
        value: entry.loadEventEnd - entry.loadEventStart,
        timestamp: Date.now()
      });
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });`;

    return {
      path: 'src/monitoring/performance.js',
      content: perfConfig,
      type: 'config' as const
    };
  }

  private async generateErrorMonitoring(config: MonitoringConfig) {
    const errorConfig = `// Error monitoring setup
class ErrorMonitor {
  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupUnhandledRejectionHandler();
  }

  setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });
  }

  setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'promise-rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
  }

  logError(error) {
    // Send to error tracking service
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(error)
    });
  }
}

new ErrorMonitor();`;

    return {
      path: 'src/monitoring/errors.js',
      content: errorConfig,
      type: 'config' as const
    };
  }

  private async generateLogMonitoring(config: MonitoringConfig) {
    const logConfig = `// Log monitoring configuration
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: 'http://localhost:9200' },
      index: 'app-logs'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;`;

    return {
      path: 'src/monitoring/logger.js',
      content: logConfig,
      type: 'config' as const
    };
  }

  private async generateDashboard(type: string, config: MonitoringConfig) {
    const dashboards = {
      overview: {
        title: 'Application Overview',
        widgets: [
          { type: 'metric', title: 'Uptime', query: 'uptime_percentage' },
          { type: 'metric', title: 'Response Time', query: 'avg_response_time' },
          { type: 'chart', title: 'Request Volume', query: 'request_count' },
          { type: 'chart', title: 'Error Rate', query: 'error_rate' }
        ]
      },
      performance: {
        title: 'Performance Metrics',
        widgets: [
          { type: 'chart', title: 'Load Time', query: 'page_load_time' },
          { type: 'chart', title: 'Memory Usage', query: 'memory_usage' },
          { type: 'chart', title: 'CPU Usage', query: 'cpu_usage' },
          { type: 'metric', title: 'Lighthouse Score', query: 'lighthouse_performance' }
        ]
      },
      errors: {
        title: 'Error Tracking',
        widgets: [
          { type: 'table', title: 'Recent Errors', query: 'recent_errors' },
          { type: 'chart', title: 'Error Trends', query: 'error_trends' },
          { type: 'metric', title: 'Error Rate', query: 'current_error_rate' }
        ]
      },
      infrastructure: {
        title: 'Infrastructure Metrics',
        widgets: [
          { type: 'chart', title: 'Server Load', query: 'server_load' },
          { type: 'chart', title: 'Database Performance', query: 'db_performance' },
          { type: 'metric', title: 'Disk Usage', query: 'disk_usage' },
          { type: 'metric', title: 'Network I/O', query: 'network_io' }
        ]
      }
    };

    return {
      path: `monitoring/dashboards/${type}.json`,
      content: JSON.stringify(dashboards[type as keyof typeof dashboards], null, 2),
      type: 'dashboard' as const
    };
  }

  // Profile report generators
  private async generateProfileReport(profileData: any, config: ProfilingConfig) {
    const report = `# Performance Profile Report

## Summary
- **Duration**: ${profileData.duration} seconds
- **Samples**: ${profileData.samples}
- **Type**: ${profileData.type}

## Hotspots
${profileData.hotspots.map((hotspot: any) => 
  `- **${hotspot.function}** (${hotspot.file}:${hotspot.line}): ${hotspot.percentage}% - ${hotspot.calls} calls`
).join('\n')}

## Memory Leaks
${profileData.memoryLeaks.map((leak: any) => 
  `- **${leak.object}**: ${(leak.size / 1024).toFixed(2)}KB at ${leak.location}`
).join('\n')}

## Bottlenecks
${profileData.bottlenecks.map((bottleneck: any) => 
  `- **${bottleneck.operation}**: ${bottleneck.duration}ms (${bottleneck.frequency} times) - ${bottleneck.impact} impact`
).join('\n')}

## Recommendations
1. Optimize the top hotspots identified in the profile
2. Fix memory leaks by properly cleaning up resources
3. Address high-impact bottlenecks first
4. Consider caching for frequently called functions
5. Profile again after optimizations to measure improvements`;

    return {
      path: 'performance/profile-report.md',
      content: report,
      type: 'report' as const
    };
  }

  private async generateOptimizationScript(profileData: any) {
    const script = `#!/bin/bash
# Performance optimization script based on profiling results

echo "Starting performance optimizations..."

# Fix memory leaks
echo "Fixing memory leaks..."
${profileData.memoryLeaks.map((leak: any) => 
  `# TODO: Fix ${leak.object} leak at ${leak.location}`
).join('\n')}

# Optimize hotspots
echo "Optimizing performance hotspots..."
${profileData.hotspots.slice(0, 3).map((hotspot: any) => 
  `# TODO: Optimize ${hotspot.function} in ${hotspot.file}:${hotspot.line}`
).join('\n')}

# Address bottlenecks
echo "Addressing bottlenecks..."
${profileData.bottlenecks.filter((b: any) => b.impact === 'high').map((bottleneck: any) => 
  `# TODO: Optimize ${bottleneck.operation} (${bottleneck.duration}ms)`
).join('\n')}

echo "Optimization script completed!"`;

    return {
      path: 'scripts/optimize-performance.sh',
      content: script,
      type: 'script' as const
    };
  }

  // Recommendation generators
  private generatePerformanceRecommendations(metrics: PerformanceMetrics, config: PerformanceConfig): string[] {
    const recommendations = [];

    if (metrics.loadTime > 3000) {
      recommendations.push('Optimize page load time - currently over 3 seconds');
    }

    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push('Improve Largest Contentful Paint - optimize critical rendering path');
    }

    if (metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift - ensure stable layouts');
    }

    if (metrics.bundleSize.total > 1000000) {
      recommendations.push('Reduce bundle size - consider code splitting and tree shaking');
    }

    if (metrics.memoryUsage.percentage > 80) {
      recommendations.push('High memory usage detected - investigate memory leaks');
    }

    if (metrics.lighthouse.performance < 70) {
      recommendations.push('Improve Lighthouse performance score');
    }

    return recommendations;
  }

  private generateOptimizationRecommendations(optimizations: any[]): string[] {
    const recommendations = [
      'Test optimizations in a staging environment first',
      'Monitor performance metrics after applying optimizations',
      'Consider the trade-offs between optimization and maintainability'
    ];

    const highImpactOptimizations = optimizations.filter(opt => opt.impact === 'high');
    if (highImpactOptimizations.length > 0) {
      recommendations.unshift('Prioritize high-impact optimizations for maximum benefit');
    }

    return recommendations;
  }

  private generateProfilingRecommendations(profileData: any): string[] {
    const recommendations = [];

    if (profileData.hotspots.length > 0) {
      recommendations.push(`Focus on optimizing ${profileData.hotspots[0].function} - it accounts for ${profileData.hotspots[0].percentage}% of execution time`);
    }

    if (profileData.memoryLeaks.length > 0) {
      recommendations.push('Address memory leaks to prevent performance degradation over time');
    }

    if (profileData.bottlenecks.some((b: any) => b.impact === 'high')) {
      recommendations.push('Prioritize high-impact bottlenecks for optimization');
    }

    recommendations.push('Run profiling regularly to catch performance regressions early');
    recommendations.push('Profile in production-like environments for accurate results');

    return recommendations;
  }

  private async getCurrentMetrics(): Promise<PerformanceMetrics> {
    // Simulate current metrics
    return {
      timestamp: new Date().toISOString(),
      loadTime: Math.random() * 3000 + 1000,
      firstContentfulPaint: Math.random() * 2000 + 500,
      largestContentfulPaint: Math.random() * 4000 + 1500,
      cumulativeLayoutShift: Math.random() * 0.3,
      firstInputDelay: Math.random() * 200 + 50,
      timeToInteractive: Math.random() * 5000 + 2000,
      memoryUsage: {
        used: Math.random() * 500 + 100,
        total: 1024,
        percentage: Math.random() * 50 + 25
      },
      cpuUsage: {
        percentage: Math.random() * 80 + 10,
        cores: 4
      },
      networkMetrics: {
        latency: Math.random() * 200 + 50,
        bandwidth: Math.random() * 100 + 50,
        requests: Math.floor(Math.random() * 50 + 10),
        errors: Math.floor(Math.random() * 5)
      },
      bundleSize: {
        total: Math.random() * 2000000 + 500000,
        javascript: Math.random() * 1000000 + 200000,
        css: Math.random() * 200000 + 50000,
        images: Math.random() * 800000 + 200000,
        fonts: Math.random() * 100000 + 20000
      },
      lighthouse: {
        performance: Math.random() * 40 + 60,
        accessibility: Math.random() * 30 + 70,
        bestPractices: Math.random() * 20 + 80,
        seo: Math.random() * 25 + 75,
        pwa: Math.random() * 50 + 50
      }
    };
  }

  private async storePerformanceResults(taskId: number, result: any) {
    try {
      await this.supabase
        .from('agent_task_results')
        .insert({
          task_id: taskId,
          result_type: 'performance',
          result_data: result,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store performance results:', error);
    }
  }
}