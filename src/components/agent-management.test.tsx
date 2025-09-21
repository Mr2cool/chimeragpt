import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@/test/utils';
import { AgentManagement } from './agent-management';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

const mockAgents = [
  {
    id: '1',
    name: 'Code Review Agent',
    description: 'Automated code review and analysis',
    type: 'code-review',
    status: 'idle',
    capabilities: ['code-analysis', 'security-scan'],
    config: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    performance_metrics: {
      tasks_completed: 15,
      success_rate: 0.95,
      avg_execution_time: 120,
    },
  },
  {
    id: '2',
    name: 'Security Agent',
    description: 'Security vulnerability scanning',
    type: 'security',
    status: 'running',
    capabilities: ['vulnerability-scan', 'compliance-check'],
    config: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    current_task: 'Scanning repository for vulnerabilities',
    performance_metrics: {
      tasks_completed: 8,
      success_rate: 0.88,
      avg_execution_time: 180,
    },
  },
];

const mockTasks = [
  {
    id: '1',
    title: 'Review Pull Request #123',
    description: 'Review the authentication changes',
    status: 'completed',
    agent_id: '1',
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    estimated_duration: 30,
    actual_duration: 25,
  },
  {
    id: '2',
    title: 'Security Scan',
    description: 'Perform security vulnerability scan',
    status: 'in_progress',
    agent_id: '2',
    priority: 'critical',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    estimated_duration: 60,
  },
];

describe('AgentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/agents' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ agents: mockAgents }),
        });
      }
      if (url === '/api/tasks' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: mockTasks }),
        });
      }
      if (url === '/api/agents' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '3', ...JSON.parse(options.body) }),
        });
      }
      if (url === '/api/tasks' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '3', ...JSON.parse(options.body) }),
        });
      }
      if (url.includes('/api/agents/') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/execute') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<AgentManagement />);
    expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument();
  });

  it('loads and displays agents correctly', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
      expect(screen.getByText('Security Agent')).toBeInTheDocument();
    });

    // Check agent status badges
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();

    // Check performance metrics
    expect(screen.getByText('15')).toBeInTheDocument(); // tasks completed
    expect(screen.getByText('95%')).toBeInTheDocument(); // success rate
    expect(screen.getByText('120s')).toBeInTheDocument(); // avg time
  });

  it('displays current task for running agents', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Scanning repository for vulnerabilities')).toBeInTheDocument();
    });
  });

  it('shows correct action buttons based on agent status', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      // Idle agent should have Start button
      const idleAgentCard = screen.getByText('Code Review Agent').closest('.space-y-4');
      expect(within(idleAgentCard!).getByText('Start')).toBeInTheDocument();

      // Running agent should have Pause and Stop buttons
      const runningAgentCard = screen.getByText('Security Agent').closest('.space-y-4');
      expect(within(runningAgentCard!).getByText('Pause')).toBeInTheDocument();
      expect(within(runningAgentCard!).getByText('Stop')).toBeInTheDocument();
    });
  });

  it('handles agent actions correctly', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Click start button for idle agent
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents/1/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Agent start successfully');
    });
  });

  it('opens and handles agent creation dialog', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
    });

    // Click New Agent button
    const newAgentButton = screen.getByText('New Agent');
    fireEvent.click(newAgentButton);

    // Check dialog is open
    expect(screen.getByText('Create New Agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText('Agent Name'), {
      target: { value: 'Test Agent' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test agent description' },
    });

    // Submit form
    const createButton = screen.getByRole('button', { name: 'Create Agent' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/agents',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Agent',
            description: 'Test agent description',
            type: 'general',
            capabilities: [],
            config: {},
          }),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Agent created successfully');
    });
  });

  it('handles agent deletion with confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: '' }); // Trash icon buttons
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('h-4')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this agent?');
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/1', {
          method: 'DELETE',
        });
        expect(toast.success).toHaveBeenCalledWith('Agent deleted successfully');
      });
    }
  });

  it('cancels agent deletion when not confirmed', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: '' });
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg')?.getAttribute('class')?.includes('h-4')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/agents/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    }
  });

  it('switches between tabs correctly', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
    });

    // Check initial agents tab
    expect(screen.getByText('Code Review Agent')).toBeInTheDocument();

    // Switch to tasks tab
    const tasksTab = screen.getByText(/Tasks \(\d+\)/);
    fireEvent.click(tasksTab);

    await waitFor(() => {
      expect(screen.getByText('Review Pull Request #123')).toBeInTheDocument();
      expect(screen.getByText('Security Scan')).toBeInTheDocument();
    });
  });

  it('opens and handles task creation dialog', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
    });

    // Click New Task button
    const newTaskButton = screen.getByText('New Task');
    fireEvent.click(newTaskButton);

    // Check dialog is open
    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Task Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Assign to Agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText('Task Title'), {
      target: { value: 'Test Task' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test task description' },
    });

    // Submit form
    const createButton = screen.getByRole('button', { name: 'Create Task' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Task',
            description: 'Test task description',
            priority: 'medium',
            agent_id: '',
            estimated_duration: 0,
          }),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Task created successfully');
    });
  });

  it('displays empty state when no agents exist', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/agents') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ agents: [] }),
        });
      }
      if (url === '/api/tasks') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tasks: [] }),
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });

    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('No agents found')).toBeInTheDocument();
      expect(screen.getByText('Create your first agent to get started')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<AgentManagement />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load agent data');
    });
  });

  it('disables create buttons when required fields are empty', async () => {
    render(<AgentManagement />);

    await waitFor(() => {
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
    });

    // Open agent creation dialog
    fireEvent.click(screen.getByText('New Agent'));
    
    // Create button should be disabled when name is empty
    const createAgentButton = screen.getByRole('button', { name: 'Create Agent' });
    expect(createAgentButton).toBeDisabled();

    // Open task creation dialog
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('New Task'));
    
    // Create button should be disabled when title is empty
    const createTaskButton = screen.getByRole('button', { name: 'Create Task' });
    expect(createTaskButton).toBeDisabled();
  });
});