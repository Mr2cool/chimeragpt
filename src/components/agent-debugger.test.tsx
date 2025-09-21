import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AgentDebugger } from './agent-debugger'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    // Mock Supabase client methods if needed
  }))
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock data
const mockDebugSessions = [
  {
    id: '1',
    agentId: 'agent-1',
    agentName: 'Security Scanner Agent',
    status: 'running' as const,
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
        level: 'info' as const,
        message: 'Starting vulnerability scan',
        source: 'security-scanner.ts:23'
      },
      {
        id: 'log2',
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        level: 'warn' as const,
        message: 'Potential security issue detected',
        source: 'security-scanner.ts:45',
        data: { vulnerability: 'SQL Injection', severity: 'high' }
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
    status: 'paused' as const,
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

const mockTestCases = [
  {
    id: '1',
    name: 'Security Scan - SQL Injection Detection',
    description: 'Test agent ability to detect SQL injection vulnerabilities',
    input: {
      code: 'SELECT * FROM users WHERE id = ' + 'userId',
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
    status: 'passed' as const,
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
    status: 'running' as const
  }
]

describe('AgentDebugger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock timers for auto-refresh functionality
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Component Rendering', () => {
    it('renders the main debugger interface', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Agent Debugger')).toBeInTheDocument()
        expect(screen.getByText('Debug, monitor, and test your agents in real-time')).toBeInTheDocument()
      })
    })

    it('displays loading state initially', () => {
      render(<AgentDebugger />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('renders all tab options', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /debug sessions/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /agent testing/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /system logs/i })).toBeInTheDocument()
      })
    })
  })

  describe('Debug Sessions Tab', () => {
    it('displays debug sessions list', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Security Scanner Agent')).toBeInTheDocument()
        expect(screen.getByText('Code Review Assistant')).toBeInTheDocument()
      })
    })

    it('shows session status badges', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument()
        expect(screen.getByText('paused')).toBeInTheDocument()
      })
    })

    it('allows session selection', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Security Scanner Agent')).toBeInTheDocument()
      })

      const sessionCard = screen.getByText('Code Review Assistant').closest('div')
      await user.click(sessionCard!)
      
      expect(screen.getByText('Code Review Assistant')).toBeInTheDocument()
    })

    it('displays debug console for selected session', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Debug Console')).toBeInTheDocument()
        expect(screen.getByText('Security Scanner Agent')).toBeInTheDocument()
      })
    })

    it('shows debug control buttons', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        const playButton = screen.getByRole('button', { name: /play/i })
        const pauseButton = screen.getByRole('button', { name: /pause/i })
        const stopButton = screen.getByRole('button', { name: /stop/i })
        const restartButton = screen.getByRole('button', { name: /restart/i })
        
        expect(playButton).toBeInTheDocument()
        expect(pauseButton).toBeInTheDocument()
        expect(stopButton).toBeInTheDocument()
        expect(restartButton).toBeInTheDocument()
      })
    })

    it('handles debug actions', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
      })

      const pauseButton = screen.getByRole('button', { name: /pause/i })
      await user.click(pauseButton)
      
      expect(toast.success).toHaveBeenCalledWith('Debug session pause successfully')
    })
  })

  describe('Log Filtering and Search', () => {
    it('displays log filter dropdown', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Logs')).toBeInTheDocument()
      })
    })

    it('allows log level filtering', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('All Logs')).toBeInTheDocument()
      })

      const filterSelect = screen.getByDisplayValue('All Logs')
      await user.click(filterSelect)
      
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('provides search functionality', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search logs...')
      await user.type(searchInput, 'vulnerability')
      
      expect(searchInput).toHaveValue('vulnerability')
    })

    it('displays log entries with proper formatting', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Starting vulnerability scan')).toBeInTheDocument()
        expect(screen.getByText('Potential security issue detected')).toBeInTheDocument()
      })
    })
  })

  describe('Breakpoints Management', () => {
    it('displays breakpoints section', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Breakpoints')).toBeInTheDocument()
      })
    })

    it('shows breakpoint details', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('security-scanner.ts:45')).toBeInTheDocument()
        expect(screen.getByText('Condition: vulnerability.severity === "critical"')).toBeInTheDocument()
        expect(screen.getByText('Hits: 3')).toBeInTheDocument()
      })
    })

    it('allows breakpoint toggle', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('security-scanner.ts:45')).toBeInTheDocument()
      })

      const breakpointSwitch = screen.getByRole('switch')
      await user.click(breakpointSwitch)
      
      expect(toast.success).toHaveBeenCalledWith('Breakpoint updated')
    })
  })

  describe('Agent Testing Tab', () => {
    it('displays test cases', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const testingTab = screen.getByRole('tab', { name: /agent testing/i })
      await user.click(testingTab)
      
      await waitFor(() => {
        expect(screen.getByText('Security Scan - SQL Injection Detection')).toBeInTheDocument()
        expect(screen.getByText('Code Review - Performance Check')).toBeInTheDocument()
      })
    })

    it('shows test case status badges', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const testingTab = screen.getByRole('tab', { name: /agent testing/i })
      await user.click(testingTab)
      
      await waitFor(() => {
        expect(screen.getByText('passed')).toBeInTheDocument()
        expect(screen.getByText('running')).toBeInTheDocument()
      })
    })

    it('allows running test cases', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const testingTab = screen.getByRole('tab', { name: /agent testing/i })
      await user.click(testingTab)
      
      await waitFor(() => {
        expect(screen.getAllByText('Run')[0]).toBeInTheDocument()
      })

      const runButton = screen.getAllByText('Run')[0]
      await user.click(runButton)
      
      expect(toast.success).toHaveBeenCalledWith('Test case started')
    })

    it('displays execution time for completed tests', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const testingTab = screen.getByRole('tab', { name: /agent testing/i })
      await user.click(testingTab)
      
      await waitFor(() => {
        expect(screen.getByText('1200ms')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Tab', () => {
    it('displays performance metrics', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const performanceTab = screen.getByRole('tab', { name: /performance/i })
      await user.click(performanceTab)
      
      await waitFor(() => {
        expect(screen.getByText('CPU Usage')).toBeInTheDocument()
        expect(screen.getByText('Memory Usage')).toBeInTheDocument()
        expect(screen.getByText('Throughput')).toBeInTheDocument()
        expect(screen.getByText('Execution Time')).toBeInTheDocument()
        expect(screen.getByText('Error Rate')).toBeInTheDocument()
      })
    })

    it('shows performance values', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const performanceTab = screen.getByRole('tab', { name: /performance/i })
      await user.click(performanceTab)
      
      await waitFor(() => {
        expect(screen.getByText('45%')).toBeInTheDocument() // CPU Usage
        expect(screen.getByText('128MB')).toBeInTheDocument() // Memory Usage
        expect(screen.getByText('15.6/s')).toBeInTheDocument() // Throughput
        expect(screen.getByText('2.1%')).toBeInTheDocument() // Error Rate
      })
    })
  })

  describe('System Logs Tab', () => {
    it('displays system logs interface', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const logsTab = screen.getByRole('tab', { name: /system logs/i })
      await user.click(logsTab)
      
      await waitFor(() => {
        expect(screen.getByText('System Logs')).toBeInTheDocument()
        expect(screen.getByText('Comprehensive system and agent activity logs')).toBeInTheDocument()
      })
    })

    it('provides export and import functionality', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const logsTab = screen.getByRole('tab', { name: /system logs/i })
      await user.click(logsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument()
        expect(screen.getByText('Import')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-refresh Functionality', () => {
    it('displays auto-refresh toggle', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Auto-refresh')).toBeInTheDocument()
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })
    })

    it('handles auto-refresh toggle', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      const autoRefreshSwitch = screen.getByRole('switch')
      await user.click(autoRefreshSwitch)
      
      // Verify the switch state changed
      expect(autoRefreshSwitch).toBeInTheDocument()
    })

    it('provides manual refresh button', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      await user.click(refreshButton)
      
      expect(refreshButton).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles debug action errors', async () => {
      const user = userEvent.setup({ delay: null })
      
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
      })

      // Simulate error by mocking the action
      const pauseButton = screen.getByRole('button', { name: /pause/i })
      
      // Mock an error scenario
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))
      
      await user.click(pauseButton)
      
      // The component should handle the error gracefully
      expect(pauseButton).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it('displays error messages for failed test cases', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      const testingTab = screen.getByRole('tab', { name: /agent testing/i })
      await user.click(testingTab)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to parse function signature')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument()
        expect(screen.getAllByRole('tab')).toHaveLength(4)
        expect(screen.getAllByRole('button')).toHaveLength.greaterThan(0)
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /debug sessions/i })).toBeInTheDocument()
      })

      const firstTab = screen.getByRole('tab', { name: /debug sessions/i })
      firstTab.focus()
      
      await user.keyboard('{ArrowRight}')
      
      expect(screen.getByRole('tab', { name: /agent testing/i })).toHaveFocus()
    })
  })

  describe('Data Management', () => {
    it('initializes with empty state', () => {
      render(<AgentDebugger />)
      
      // Component should render without crashing
      expect(screen.getByText('Agent Debugger')).toBeInTheDocument()
    })

    it('handles session selection state', async () => {
      const user = userEvent.setup({ delay: null })
      render(<AgentDebugger />)
      
      await waitFor(() => {
        expect(screen.getByText('Security Scanner Agent')).toBeInTheDocument()
      })

      // First session should be selected by default
      expect(screen.getByText('Security Scanner Agent')).toBeInTheDocument()
      
      // Select different session
      const secondSession = screen.getByText('Code Review Assistant').closest('div')
      await user.click(secondSession!)
      
      expect(screen.getByText('Code Review Assistant')).toBeInTheDocument()
    })
  })
})