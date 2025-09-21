import { test, expect } from '@playwright/test';

test.describe('Agent Creation and Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test.describe('Agent Creation Flow', () => {
    test('should create a new agent with basic configuration', async ({ page }) => {
      // Navigate to agents page
      await page.click('text=Agents');
      await expect(page.locator('h1:has-text("Agents")')).toBeVisible();

      // Click create agent button
      await page.click('button:has-text("Create Agent")');
      await expect(page.locator('[data-testid="create-agent-modal"]')).toBeVisible();

      // Fill basic agent information
      await page.fill('input[name="name"]', 'E2E Test Agent');
      await page.selectOption('select[name="type"]', 'code-review');
      await page.fill('textarea[name="description"]', 'An agent created for E2E testing purposes');

      // Configure agent capabilities
      await page.check('input[name="capabilities.codeAnalysis"]');
      await page.check('input[name="capabilities.bugDetection"]');
      await page.check('input[name="capabilities.performanceOptimization"]');

      // Set agent parameters
      await page.selectOption('select[name="reviewDepth"]', 'thorough');
      await page.selectOption('select[name="language"]', 'typescript');
      await page.fill('input[name="maxFileSize"]', '1000');

      // Configure system prompt
      await page.fill('textarea[name="systemPrompt"]', 'You are a senior TypeScript developer focused on code quality and best practices.');

      // Create the agent
      await page.click('button[type="submit"]:has-text("Create Agent")');

      // Verify success message and navigation
      await expect(page.locator('text=Agent created successfully')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/.*agents.*/);

      // Verify agent appears in the list
      await expect(page.locator('[data-testid="agent-item"]:has-text("E2E Test Agent")')).toBeVisible();
    });

    test('should create agent from marketplace template', async ({ page }) => {
      // Navigate to marketplace
      await page.click('text=Marketplace');
      await expect(page.locator('h1:has-text("Agent Marketplace")')).toBeVisible();

      // Find and install a template
      await page.click('[data-testid="agent-template"]:first-child button:has-text("Install")');
      await expect(page.locator('[data-testid="install-agent-modal"]')).toBeVisible();

      // Customize the agent
      await page.fill('input[name="agentName"]', 'Marketplace E2E Agent');
      await page.fill('textarea[name="description"]', 'Agent created from marketplace template for E2E testing');

      // Install the agent
      await page.click('button:has-text("Install Agent")');

      // Verify installation success
      await expect(page.locator('text=Agent installed successfully')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/.*agents.*/);

      // Verify agent appears in the list
      await expect(page.locator('[data-testid="agent-item"]:has-text("Marketplace E2E Agent")')).toBeVisible();
    });

    test('should validate agent creation form', async ({ page }) => {
      await page.click('text=Agents');
      await page.click('button:has-text("Create Agent")');

      // Try to create without required fields
      await page.click('button[type="submit"]:has-text("Create Agent")');

      // Verify validation errors
      await expect(page.locator('text=Agent name is required')).toBeVisible();
      await expect(page.locator('text=Agent type is required')).toBeVisible();
      await expect(page.locator('text=Description is required')).toBeVisible();

      // Test name length validation
      await page.fill('input[name="name"]', 'ab');
      await page.click('button[type="submit"]:has-text("Create Agent")');
      await expect(page.locator('text=Agent name must be at least 3 characters')).toBeVisible();

      // Test description length validation
      await page.fill('input[name="name"]', 'Valid Agent Name');
      await page.fill('textarea[name="description"]', 'Short');
      await page.click('button[type="submit"]:has-text("Create Agent")');
      await expect(page.locator('text=Description must be at least 10 characters')).toBeVisible();
    });
  });

  test.describe('Agent Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test agent for management tests
      await page.click('text=Agents');
      await page.click('button:has-text("Create Agent")');
      await page.fill('input[name="name"]', 'Management Test Agent');
      await page.selectOption('select[name="type"]', 'documentation');
      await page.fill('textarea[name="description"]', 'Agent for testing management operations');
      await page.click('button[type="submit"]:has-text("Create Agent")');
      await expect(page.locator('text=Agent created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should edit agent configuration', async ({ page }) => {
      // Find and edit the test agent
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Management Test Agent")');
      await agentItem.locator('button:has-text("Edit")').click();

      await expect(page.locator('[data-testid="edit-agent-modal"]')).toBeVisible();

      // Update agent information
      await page.fill('input[name="name"]', 'Updated Management Test Agent');
      await page.fill('textarea[name="description"]', 'Updated description for management testing');
      await page.selectOption('select[name="reviewDepth"]', 'comprehensive');

      // Save changes
      await page.click('button:has-text("Save Changes")');

      // Verify update success
      await expect(page.locator('text=Agent updated successfully')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Updated Management Test Agent")')).toBeVisible();
    });

    test('should start and stop agent', async ({ page }) => {
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Management Test Agent")');

      // Start the agent
      await agentItem.locator('button:has-text("Start")').click();
      await expect(page.locator('text=Agent started successfully')).toBeVisible();
      await expect(agentItem.locator('[data-testid="agent-status"]:has-text("Running")')).toBeVisible();

      // Stop the agent
      await agentItem.locator('button:has-text("Stop")').click();
      await expect(page.locator('text=Agent stopped successfully')).toBeVisible();
      await expect(agentItem.locator('[data-testid="agent-status"]:has-text("Stopped")')).toBeVisible();
    });

    test('should view agent details and logs', async ({ page }) => {
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Management Test Agent")');

      // Click on agent to view details
      await agentItem.click();
      await expect(page.locator('[data-testid="agent-details-modal"]')).toBeVisible();

      // Check details tabs
      await expect(page.locator('button:has-text("Overview")')).toBeVisible();
      await expect(page.locator('button:has-text("Configuration")')).toBeVisible();
      await expect(page.locator('button:has-text("Logs")')).toBeVisible();
      await expect(page.locator('button:has-text("Performance")')).toBeVisible();

      // View logs
      await page.click('button:has-text("Logs")');
      await expect(page.locator('[data-testid="agent-logs"]')).toBeVisible();

      // View performance metrics
      await page.click('button:has-text("Performance")');
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    });

    test('should clone agent', async ({ page }) => {
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Management Test Agent")');

      // Clone the agent
      await agentItem.locator('button:has-text("Clone")').click();
      await expect(page.locator('[data-testid="clone-agent-modal"]')).toBeVisible();

      // Update clone name
      await page.fill('input[name="name"]', 'Cloned Management Test Agent');
      await page.click('button:has-text("Clone Agent")');

      // Verify clone success
      await expect(page.locator('text=Agent cloned successfully')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Cloned Management Test Agent")')).toBeVisible();
    });

    test('should delete agent', async ({ page }) => {
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Management Test Agent")');

      // Delete the agent
      await agentItem.locator('button:has-text("Delete")').click();
      await expect(page.locator('text=Are you sure you want to delete this agent?')).toBeVisible();
      await page.click('button:has-text("Delete Agent")');

      // Verify deletion success
      await expect(page.locator('text=Agent deleted successfully')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Management Test Agent")')).not.toBeVisible();
    });
  });

  test.describe('Agent Task Execution', () => {
    test.beforeEach(async ({ page }) => {
      // Create and start a test agent
      await page.click('text=Agents');
      await page.click('button:has-text("Create Agent")');
      await page.fill('input[name="name"]', 'Task Execution Agent');
      await page.selectOption('select[name="type"]', 'code-review');
      await page.fill('textarea[name="description"]', 'Agent for testing task execution');
      await page.click('button[type="submit"]:has-text("Create Agent")');
      await expect(page.locator('text=Agent created successfully')).toBeVisible({ timeout: 10000 });

      // Start the agent
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Task Execution Agent")');
      await agentItem.locator('button:has-text("Start")').click();
      await expect(page.locator('text=Agent started successfully')).toBeVisible();
    });

    test('should assign and execute task', async ({ page }) => {
      // Navigate to tasks or orchestrator
      await page.click('text=Orchestrator');
      await expect(page.locator('h1:has-text("ChimeraGPT")')).toBeVisible();

      // Create a task for the agent
      await page.fill('textarea[name="goal"]', 'Review the code in the main.ts file and provide feedback on code quality, potential bugs, and performance improvements.');
      await page.click('button[type="submit"]:has-text("Execute")');

      // Verify task execution starts
      await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();
      await expect(page.locator('text=Executing your request...')).toBeVisible();

      // Wait for task completion (with longer timeout for actual execution)
      await expect(page.locator('[data-testid="result-content"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-testid="loading-state"]')).not.toBeVisible();

      // Verify result is displayed
      const resultContent = page.locator('[data-testid="result-content"]');
      await expect(resultContent).toContainText('code');
    });

    test('should handle task execution errors', async ({ page }) => {
      // Mock task execution failure
      await page.route('**/api/orchestrator/execute', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Task execution failed' })
        });
      });

      await page.click('text=Orchestrator');
      await page.fill('textarea[name="goal"]', 'This task will fail');
      await page.click('button[type="submit"]:has-text("Execute")');

      // Verify error handling
      await expect(page.locator('[data-testid="error-alert"]')).toBeVisible();
      await expect(page.locator('text=Task execution failed')).toBeVisible();
    });

    test('should cancel running task', async ({ page }) => {
      // Start a long-running task
      await page.click('text=Orchestrator');
      await page.fill('textarea[name="goal"]', 'Perform a comprehensive analysis of the entire codebase');
      await page.click('button[type="submit"]:has-text("Execute")');

      // Verify task is running
      await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();

      // Cancel the task
      await page.click('button:has-text("Cancel")');

      // Verify cancellation
      await expect(page.locator('text=Task cancelled')).toBeVisible();
      await expect(page.locator('[data-testid="loading-state"]')).not.toBeVisible();
    });
  });

  test.describe('Agent Filtering and Search', () => {
    test.beforeEach(async ({ page }) => {
      // Create multiple test agents with different types
      await page.click('text=Agents');
      
      const agentTypes = [
        { name: 'Search Test Code Agent', type: 'code-review' },
        { name: 'Search Test Doc Agent', type: 'documentation' },
        { name: 'Search Test Security Agent', type: 'security' }
      ];

      for (const agent of agentTypes) {
        await page.click('button:has-text("Create Agent")');
        await page.fill('input[name="name"]', agent.name);
        await page.selectOption('select[name="type"]', agent.type);
        await page.fill('textarea[name="description"]', `${agent.type} agent for search testing`);
        await page.click('button[type="submit"]:has-text("Create Agent")');
        await expect(page.locator('text=Agent created successfully')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should search agents by name', async ({ page }) => {
      // Search for specific agent
      await page.fill('input[placeholder="Search agents..."]', 'Code Agent');
      await page.press('input[placeholder="Search agents..."]', 'Enter');

      // Verify filtered results
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Code Agent")')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Doc Agent")')).not.toBeVisible();

      // Clear search
      await page.fill('input[placeholder="Search agents..."]', '');
      await page.press('input[placeholder="Search agents..."]', 'Enter');
    });

    test('should filter agents by type', async ({ page }) => {
      // Filter by code-review type
      await page.selectOption('select[name="typeFilter"]', 'code-review');
      await page.waitForTimeout(500);

      // Verify filtered results
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Code Agent")')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Doc Agent")')).not.toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Security Agent")')).not.toBeVisible();

      // Reset filter
      await page.selectOption('select[name="typeFilter"]', 'all');
    });

    test('should filter agents by status', async ({ page }) => {
      // Start one agent
      const codeAgent = page.locator('[data-testid="agent-item"]:has-text("Search Test Code Agent")');
      await codeAgent.locator('button:has-text("Start")').click();
      await expect(page.locator('text=Agent started successfully')).toBeVisible();

      // Filter by running status
      await page.selectOption('select[name="statusFilter"]', 'running');
      await page.waitForTimeout(500);

      // Verify filtered results
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Code Agent")')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Doc Agent")')).not.toBeVisible();

      // Filter by stopped status
      await page.selectOption('select[name="statusFilter"]', 'stopped');
      await page.waitForTimeout(500);

      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Doc Agent")')).toBeVisible();
      await expect(page.locator('[data-testid="agent-item"]:has-text("Search Test Code Agent")')).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors during agent creation', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/agents', route => route.abort());

      await page.click('text=Agents');
      await page.click('button:has-text("Create Agent")');
      await page.fill('input[name="name"]', 'Network Error Test Agent');
      await page.selectOption('select[name="type"]', 'code-review');
      await page.fill('textarea[name="description"]', 'Testing network error handling');
      await page.click('button[type="submit"]:has-text("Create Agent")');

      // Verify error handling
      await expect(page.locator('text=Failed to create agent')).toBeVisible();
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should handle empty agents list', async ({ page }) => {
      // Mock empty agents response
      await page.route('**/api/agents', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [] })
        });
      });

      await page.click('text=Agents');

      // Verify empty state
      await expect(page.locator('text=No agents found')).toBeVisible();
      await expect(page.locator('text=Create your first agent to get started')).toBeVisible();
      await expect(page.locator('button:has-text("Create Agent")')).toBeVisible();
    });

    test('should handle agent operation failures', async ({ page }) => {
      // Create a test agent first
      await page.click('text=Agents');
      await page.click('button:has-text("Create Agent")');
      await page.fill('input[name="name"]', 'Error Test Agent');
      await page.selectOption('select[name="type"]', 'code-review');
      await page.fill('textarea[name="description"]', 'Agent for testing error scenarios');
      await page.click('button[type="submit"]:has-text("Create Agent")');
      await expect(page.locator('text=Agent created successfully')).toBeVisible({ timeout: 10000 });

      // Mock start operation failure
      await page.route('**/api/agents/*/start', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to start agent' })
        });
      });

      // Try to start agent
      const agentItem = page.locator('[data-testid="agent-item"]:has-text("Error Test Agent")');
      await agentItem.locator('button:has-text("Start")').click();

      // Verify error handling
      await expect(page.locator('text=Failed to start agent')).toBeVisible();
    });
  });
});