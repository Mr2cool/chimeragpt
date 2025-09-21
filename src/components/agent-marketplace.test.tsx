import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@/test/utils';
import { AgentMarketplace } from './agent-marketplace';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTemplates = [
  {
    id: '1',
    name: 'Code Review Agent',
    description: 'Automated code review and analysis with security scanning',
    category: 'code-review',
    capabilities: ['code-analysis', 'security-scan'],
    tags: ['code', 'review', 'security'],
    version: '1.2.0',
    author: 'ChimeraGPT Team',
    featured: true,
    average_rating: 4.8,
    rating_count: 156,
    installation_count: 1250,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'Security Scanner',
    description: 'Advanced security vulnerability detection and compliance checking',
    category: 'security',
    capabilities: ['vulnerability-scan', 'compliance-check'],
    tags: ['security', 'vulnerability', 'compliance'],
    version: '2.1.0',
    author: 'Security Team',
    featured: false,
    average_rating: 4.5,
    rating_count: 89,
    installation_count: 890,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: '3',
    name: 'Documentation Generator',
    description: 'Automatically generate comprehensive documentation for your codebase',
    category: 'documentation',
    capabilities: ['doc-generation', 'api-docs'],
    tags: ['documentation', 'api', 'generator'],
    version: '1.0.5',
    author: 'Docs Team',
    featured: false,
    average_rating: 4.2,
    rating_count: 45,
    installation_count: 320,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
  },
  {
    id: '4',
    name: 'Test Automation Agent',
    description: 'Comprehensive testing automation with coverage analysis',
    category: 'testing',
    capabilities: ['test-generation', 'coverage-analysis'],
    tags: ['testing', 'automation', 'coverage'],
    version: '1.5.2',
    author: 'QA Team',
    featured: true,
    average_rating: 4.9,
    rating_count: 203,
    installation_count: 1580,
    created_at: '2023-12-20T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z',
  },
];

describe('AgentMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses by default
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/marketplace' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        });
      }
      if (url === '/api/marketplace/install' && options?.method === 'POST') {
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
    render(<AgentMarketplace />);
    expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument();
  });

  it('loads and displays marketplace templates correctly', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Agent Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
      expect(screen.getByText('Security Scanner')).toBeInTheDocument();
      expect(screen.getByText('Documentation Generator')).toBeInTheDocument();
      expect(screen.getByText('Test Automation Agent')).toBeInTheDocument();
    });

    // Check featured badges
    const featuredBadges = screen.getAllByText('Featured');
    expect(featuredBadges).toHaveLength(2); // Code Review Agent and Test Automation Agent

    // Check ratings and installation counts
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('(156)')).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
  });

  it('displays template details correctly', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Check author
    expect(screen.getByText('by ChimeraGPT Team')).toBeInTheDocument();
    
    // Check description
    expect(screen.getByText('Automated code review and analysis with security scanning')).toBeInTheDocument();
    
    // Check tags
    expect(screen.getByText('code')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();
    
    // Check version
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
  });

  it('filters templates by search query', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Search for 'security'
    const searchInput = screen.getByPlaceholderText('Search agents...');
    fireEvent.change(searchInput, { target: { value: 'security' } });

    await waitFor(() => {
      // Should show Code Review Agent (has security in description) and Security Scanner
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
      expect(screen.getByText('Security Scanner')).toBeInTheDocument();
      
      // Should not show Documentation Generator or Test Automation Agent
      expect(screen.queryByText('Documentation Generator')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Automation Agent')).not.toBeInTheDocument();
    });
  });

  it('filters templates by category', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Filter by security category
    const categorySelect = screen.getByRole('combobox', { name: /filter/i });
    fireEvent.click(categorySelect);
    
    const securityOption = screen.getByText('Security');
    fireEvent.click(securityOption);

    await waitFor(() => {
      // Should only show Security Scanner
      expect(screen.getByText('Security Scanner')).toBeInTheDocument();
      
      // Should not show other agents
      expect(screen.queryByText('Code Review Agent')).not.toBeInTheDocument();
      expect(screen.queryByText('Documentation Generator')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Automation Agent')).not.toBeInTheDocument();
    });
  });

  it('sorts templates correctly', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Sort by rating
    const sortSelect = screen.getByRole('combobox', { name: /trending/i });
    fireEvent.click(sortSelect);
    
    const ratingOption = screen.getByText('Highest Rated');
    fireEvent.click(ratingOption);

    await waitFor(() => {
      const agentCards = screen.getAllByRole('heading', { level: 3 });
      // Test Automation Agent (4.9) should be first, then Code Review Agent (4.8)
      expect(agentCards[0]).toHaveTextContent('Test Automation Agent');
      expect(agentCards[1]).toHaveTextContent('Code Review Agent');
    });
  });

  it('opens install dialog when install button is clicked', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Click install button for Code Review Agent
    const installButtons = screen.getAllByText('Install Agent');
    fireEvent.click(installButtons[0]);

    // Check dialog is open
    expect(screen.getByText('Install Code Review Agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom Description (Optional)')).toBeInTheDocument();
    
    // Check default name is populated
    const nameInput = screen.getByLabelText('Agent Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Code Review Agent');
  });

  it('handles agent installation successfully', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Open install dialog
    const installButtons = screen.getAllByText('Install Agent');
    fireEvent.click(installButtons[0]);

    // Modify agent name
    const nameInput = screen.getByLabelText('Agent Name');
    fireEvent.change(nameInput, { target: { value: 'My Code Reviewer' } });

    // Add custom description
    const descriptionInput = screen.getByLabelText('Custom Description (Optional)');
    fireEvent.change(descriptionInput, { target: { value: 'Custom code review agent' } });

    // Click install
    const installButton = screen.getByRole('button', { name: 'Install Agent' });
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/marketplace/install',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: '1',
            customName: 'My Code Reviewer',
            customConfig: {
              description: 'Custom code review agent',
            },
          }),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Agent "My Code Reviewer" installed successfully!');
    });
  });

  it('disables install button when name is empty', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Open install dialog
    const installButtons = screen.getAllByText('Install Agent');
    fireEvent.click(installButtons[0]);

    // Clear agent name
    const nameInput = screen.getByLabelText('Agent Name');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Install button should be disabled
    const installButton = screen.getByRole('button', { name: 'Install Agent' });
    expect(installButton).toBeDisabled();
  });

  it('shows loading state during installation', async () => {
    // Mock slow installation
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/marketplace' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        });
      }
      if (url === '/api/marketplace/install' && options?.method === 'POST') {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            });
          }, 100);
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });

    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Open install dialog and install
    const installButtons = screen.getAllByText('Install Agent');
    fireEvent.click(installButtons[0]);
    
    const installButton = screen.getByRole('button', { name: 'Install Agent' });
    fireEvent.click(installButton);

    // Should show installing state
    expect(screen.getByText('Installing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Installing...' })).toBeDisabled();
  });

  it('handles installation errors gracefully', async () => {
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/api/marketplace' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates }),
        });
      }
      if (url === '/api/marketplace/install' && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Installation failed' }),
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });

    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Open install dialog and install
    const installButtons = screen.getAllByText('Install Agent');
    fireEvent.click(installButtons[0]);
    
    const installButton = screen.getByRole('button', { name: 'Install Agent' });
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Installation failed');
    });
  });

  it('displays empty state when no templates match filters', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search agents...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No agents found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  it('displays empty state when no templates are available', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/marketplace') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: [] }),
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });

    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('No agents found')).toBeInTheDocument();
      expect(screen.getByText('No agents available in the marketplace yet')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error loading marketplace');
    });
  });

  it('displays correct category icons', async () => {
    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('Code Review Agent')).toBeInTheDocument();
    });

    // Check that different category icons are rendered
    const agentCards = screen.getAllByRole('article');
    expect(agentCards.length).toBeGreaterThan(0);
    
    // Each card should have an icon
    agentCards.forEach(card => {
      const icon = within(card).getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
    });
  });

  it('shows limited tags with overflow indicator', async () => {
    // Create a template with many tags
    const templateWithManyTags = {
      ...mockTemplates[0],
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
    };

    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/marketplace') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: [templateWithManyTags] }),
        });
      }
      return Promise.reject(new Error('Unhandled fetch'));
    });

    render(<AgentMarketplace />);

    await waitFor(() => {
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('+3')).toBeInTheDocument(); // Overflow indicator
    });
  });
});