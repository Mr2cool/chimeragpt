import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test/utils';
import { Dashboard } from './dashboard';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/supabase/client');
vi.mock('sonner');
vi.mock('@/services/agent-manager');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
}));

// Mock child components
vi.mock('@/components/agent-marketplace', () => ({
  AgentMarketplace: () => <div data-testid="agent-marketplace">Agent Marketplace</div>,
}));

vi.mock('@/components/agent-management', () => ({
  AgentManagement: () => <div data-testid="agent-management">Agent Management</div>,
}));

vi.mock('@/components/enterprise-features', () => ({
  EnterpriseFeatures: () => <div data-testid="enterprise-features">Enterprise Features</div>,
}));

vi.mock('@/components/plugin-system', () => ({
  PluginSystem: () => <div data-testid="plugin-system">Plugin System</div>,
}));

vi.mock('@/components/agent-analytics', () => ({
  AgentAnalytics: () => <div data-testid="agent-analytics">Agent Analytics</div>,
}));

vi.mock('@/components/agent-testing', () => ({
  AgentTesting: () => <div data-testid="agent-testing">Agent Testing</div>,
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
};

const mockAgents = [
  {
    id: '1',
    name: 'Code Review Agent',
    type: 'code-review',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    config: {},
  },
  {
    id: '2',
    name: 'Documentation Agent',
    type: 'documentation',
    status: 'idle',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    config: {},
  },
];

const mockTasks = [
  {
    id: '1',
    title: 'Review Pull Request',
    description: 'Review the latest pull request',
    status: 'completed',
    agent_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Generate Documentation',
    description: 'Generate API documentation',
    status: 'pending',
    agent_id: '2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);
    
    // Mock successful data loading
    mockSupabaseClient.from.mockImplementation((table: string) => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      if (table === 'repositories') {
        mockQuery.select.mockResolvedValue({ count: 5, error: null });
      } else if (table === 'analyses') {
        mockQuery.select.mockResolvedValue({ count: 3, error: null });
        mockQuery.eq.mockReturnThis();
      } else if (table === 'insights') {
        mockQuery.select.mockResolvedValue({ count: 10, error: null });
      } else if (table === 'agents') {
        mockQuery.select.mockResolvedValue({ data: mockAgents, error: null });
        mockQuery.order.mockReturnThis();
      } else if (table === 'tasks') {
        mockQuery.select.mockResolvedValue({ data: mockTasks, error: null });
        mockQuery.order.mockReturnThis();
        mockQuery.limit.mockReturnThis();
      }

      return mockQuery;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with loading state initially', () => {
    render(<Dashboard />);
    
    // Should show loading state or skeleton
    expect(screen.getByText('ChimeraGPT Dashboard')).toBeInTheDocument();
  });

  it('loads and displays dashboard statistics', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Total repositories
      expect(screen.getByText('3')).toBeInTheDocument(); // Active analyses
      expect(screen.getByText('10')).toBeInTheDocument(); // Completed insights
    });
  });

  it('displays agents list correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
      expect(screen.getByText('Documentation Agent')).toBeInTheDocument();
    });
  });

  it('displays tasks list correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Review Pull Request')).toBeInTheDocument();
      expect(screen.getByText('Generate Documentation')).toBeInTheDocument();
    });
  });

  it('handles tab navigation correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click on Agents tab
    const agentsTab = screen.getByText('Agents');
    fireEvent.click(agentsTab);

    await waitFor(() => {
      expect(screen.getByTestId('agent-management')).toBeInTheDocument();
    });

    // Click on Marketplace tab
    const marketplaceTab = screen.getByText('Marketplace');
    fireEvent.click(marketplaceTab);

    await waitFor(() => {
      expect(screen.getByTestId('agent-marketplace')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock error response
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error('Database error')),
    }));

    render(<Dashboard />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');
    });
  });

  it('displays correct agent status badges', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Should show active and idle status badges
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('idle')).toBeInTheDocument();
    });
  });

  it('displays correct task status indicators', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Should show completed and pending status
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Should calculate running agents (1 active out of 2 total)
      expect(screen.getByText('1')).toBeInTheDocument(); // Running agents
      expect(screen.getByText('2')).toBeInTheDocument(); // Total agents
    });
  });

  it('renders all tab content components', async () => {
    render(<Dashboard />);

    // Test Analytics tab
    const analyticsTab = screen.getByText('Analytics');
    fireEvent.click(analyticsTab);

    await waitFor(() => {
      expect(screen.getByTestId('agent-analytics')).toBeInTheDocument();
    });

    // Test Testing tab
    const testingTab = screen.getByText('Testing');
    fireEvent.click(testingTab);

    await waitFor(() => {
      expect(screen.getByTestId('agent-testing')).toBeInTheDocument();
    });

    // Test Enterprise tab
    const enterpriseTab = screen.getByText('Enterprise');
    fireEvent.click(enterpriseTab);

    await waitFor(() => {
      expect(screen.getByTestId('enterprise-features')).toBeInTheDocument();
    });

    // Test Plugins tab
    const pluginsTab = screen.getByText('Plugins');
    fireEvent.click(pluginsTab);

    await waitFor(() => {
      expect(screen.getByTestId('plugin-system')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly in recent activity', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      // Should display formatted timestamps
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });
});