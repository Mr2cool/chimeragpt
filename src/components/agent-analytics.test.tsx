import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AgentAnalytics } from './agent-analytics'

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockAgentMetrics = [
  {
    id: '1',
    name: 'Code Review Agent',
    status: 'active' as const,
    tasksCompleted: 45,
    tasksInProgress: 3,
    successRate: 92.5,
    averageExecutionTime: 2.3,
    performanceScore: 8.7,
    uptime: 99.2,
    errorCount: 1,
    cpuUsage: 15,
    memoryUsage: 32
  },
  {
    id: '2',
    name: 'Documentation Agent',
    status: 'error' as const,
    tasksCompleted: 23,
    tasksInProgress: 0,
    successRate: 78.3,
    averageExecutionTime: 4.1,
    performanceScore: 6.2,
    uptime: 87.5,
    errorCount: 5,
    cpuUsage: 8,
    memoryUsage: 18
  }
]

const mockSystemMetrics = {
  activeAgents: 8,
  totalAgents: 10,
  completedTasks: 156,
  failedTasks: 12,
  totalTasks: 168,
  averageResponseTime: 2.8,
  systemUptime: 99.5,
  resourceUtilization: {
    cpu: 45,
    memory: 62,
    storage: 78,
    network: 23
  }
}

const mockPerformanceData = [
  {
    timestamp: '2024-01-01T00:00:00Z',
    responseTime: 2.1,
    errorRate: 1.2,
    cpuUsage: 45,
    memoryUsage: 60,
    throughput: 150
  },
  {
    timestamp: '2024-01-01T01:00:00Z',
    responseTime: 2.3,
    errorRate: 0.8,
    cpuUsage: 42,
    memoryUsage: 58,
    throughput: 165
  }
]

const mockAlertRules = [
  {
    id: '1',
    name: 'High CPU Usage',
    metric: 'cpu_usage',
    condition: 'greater_than',
    threshold: 80,
    severity: 'critical' as const,
    enabled: true
  },
  {
    id: '2',
    name: 'Low Success Rate',
    metric: 'success_rate',
    condition: 'less_than',
    threshold: 85,
    severity: 'high' as const,
    enabled: false
  }
]

describe('AgentAnalytics', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    
    // Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAgentMetrics })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSystemMetrics })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPerformanceData })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAlertRules })
      } as Response)
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('renders loading state initially', () => {
    render(<AgentAnalytics />)
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('loads and displays analytics data', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Check system metrics cards
    expect(screen.getByText('8/10')).toBeInTheDocument() // Active agents
    expect(screen.getByText('92.9%')).toBeInTheDocument() // Success rate
    expect(screen.getByText('2.8s')).toBeInTheDocument() // Avg response time
    expect(screen.getByText('99.5%')).toBeInTheDocument() // System uptime
  })

  it('displays agent metrics correctly', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Switch to agents tab
    fireEvent.click(screen.getByText('Agent Details'))
    
    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument()
      expect(screen.getByText('Documentation Agent')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument() // Tasks completed
      expect(screen.getByText('92.5%')).toBeInTheDocument() // Success rate
    })
  })

  it('shows error state for agents with errors', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Switch to agents tab
    fireEvent.click(screen.getByText('Agent Details'))
    
    await waitFor(() => {
      expect(screen.getByText('5 Recent Errors')).toBeInTheDocument()
      expect(screen.getByText('Agent is experiencing issues. Check logs for detailed error information.')).toBeInTheDocument()
    })
  })

  it('renders performance charts', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Check overview tab charts
    expect(screen.getByText('Performance Trends')).toBeInTheDocument()
    expect(screen.getByText('Task Distribution')).toBeInTheDocument()
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Test performance tab
    fireEvent.click(screen.getByText('Performance'))
    expect(screen.getByText('System Performance')).toBeInTheDocument()
    expect(screen.getByText('Real-time performance metrics and trends')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()

    // Test resources tab
    fireEvent.click(screen.getByText('Resources'))
    expect(screen.getByText('CPU & Memory Usage')).toBeInTheDocument()
    expect(screen.getByText('Storage & Network')).toBeInTheDocument()
    expect(screen.getByText('Resource Usage by Agent')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

    // Test alerts tab
    fireEvent.click(screen.getByText('Alerts'))
    expect(screen.getByText('Alert Rules')).toBeInTheDocument()
    expect(screen.getByText('Configure monitoring alerts for system metrics')).toBeInTheDocument()
  })

  it('displays resource utilization correctly', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Switch to resources tab
    fireEvent.click(screen.getByText('Resources'))
    
    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument() // CPU usage
      expect(screen.getByText('62%')).toBeInTheDocument() // Memory usage
      expect(screen.getByText('78%')).toBeInTheDocument() // Storage usage
      expect(screen.getByText('23%')).toBeInTheDocument() // Network usage
    })
  })

  it('displays alert rules correctly', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Switch to alerts tab
    fireEvent.click(screen.getByText('Alerts'))
    
    await waitFor(() => {
      expect(screen.getByText('High CPU Usage')).toBeInTheDocument()
      expect(screen.getByText('Low Success Rate')).toBeInTheDocument()
      expect(screen.getByText('cpu usage greater than 80')).toBeInTheDocument()
      expect(screen.getByText('success rate less than 85')).toBeInTheDocument()
      expect(screen.getByText('Enabled')).toBeInTheDocument()
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))
    
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Should still render the component structure even with API errors
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(screen.getByText('Agent Details')).toBeInTheDocument()
  })

  it('refreshes data automatically', async () => {
    jest.useFakeTimers()
    
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Clear initial calls
    mockFetch.mockClear()
    
    // Mock refresh responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAgentMetrics })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSystemMetrics })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPerformanceData })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAlertRules })
      } as Response)

    // Fast-forward time to trigger refresh
    jest.advanceTimersByTime(30000) // 30 seconds
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })
    
    jest.useRealTimers()
  })

  it('calculates success rate correctly', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Success rate should be (156/168) * 100 = 92.9%
    expect(screen.getByText('92.9%')).toBeInTheDocument()
  })

  it('shows performance score badges with correct colors', async () => {
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Switch to agents tab
    fireEvent.click(screen.getByText('Agent Details'))
    
    await waitFor(() => {
      expect(screen.getByText('Score: 8.7')).toBeInTheDocument()
      expect(screen.getByText('Score: 6.2')).toBeInTheDocument()
    })
  })

  it('handles empty data states', async () => {
    // Mock empty responses
    mockFetch.mockClear()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response)
    
    render(<AgentAnalytics />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument()
    })

    // Should handle empty data gracefully
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })
})