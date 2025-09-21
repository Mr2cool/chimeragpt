import { test, expect } from '@playwright/test';

test.describe('Dashboard and Agent Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test.describe('Dashboard Overview', () => {
    test('should display dashboard with key metrics', async ({ page }) => {
      // Check main dashboard elements
      await expect(page.locator('h1')).toContainText('ChimeraGPT Dashboard');
      
      // Check statistics cards
      await expect(page.locator('[data-testid="total-agents"]')).toBeVisible();
      await expect(page.locator('[data-testid="running-agents"]')).toBeVisible();
      await expect(page.locator('[data-testid="completed-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-repositories"]')).toBeVisible();
      
      // Check that metrics show numbers
      const totalAgents = await page.locator('[data-testid="total-agents"] .metric-value').textContent();
      expect(totalAgents).toMatch(/\d+/);
    });

    test('should display recent activity', async ({ page }) => {
      // Check recent activity section
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
      await expect(page.locator('h3:has-text("Recent Activity")')).toBeVisible();
      
      // Should show activity items or empty state
      const activityItems = page.locator('[data-testid="activity-item"]');
      const emptyState = page.locator('text=No recent activity');
      
      await expect(activityItems.first().or(emptyState)).toBeVisible();
    });

    test('should display agents list', async ({ page }) => {
      // Check agents section
      await expect(page.locator('[data-testid="agents-list"]')).toBeVisible();
      await expect(page.locator('h3:has-text("Your Agents")')).toBeVisible();
      
      // Should show agents or empty state
      const agentItems = page.locator('[data-testid="agent-item"]');
      const emptyState = page.locator('text=No agents created yet');
      
      await expect(agentItems.first().or(emptyState)).toBeVisible();
    });

    test('should navigate between dashboard tabs', async ({ page }) => {
      // Test tab navigation
      await page.click('text=Agents');
      await expect(page.locator('[data-testid="agent-management"]')).toBeVisible();
      
      await page.click('text=Marketplace');
      await expect(page.locator('[data-testid="agent-marketplace"]')).toBeVisible();
      
      await page.click('text=Analytics');
      await expect(page.locator('[data-testid="agent-analytics"]')).toBeVisible();
      
      await page.click('text=Overview');
      await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible();
    });
  });

  test.describe('Agent Management', () => {
    test('should create a new agent', async ({ page }) => {
      // Navigate to agents tab
      await page.click('text=Agents');
      
      // Click create agent button
      await page.click('button:has-text("Create Agent")');
      
      // Fill in agent creation form
      await page.fill('input[name="name"]', 'Test Code Review Agent');
      await page.selectOption('select[name="type"]', 'code-review');
      await page.fill('textarea[name="description"]', 'An agent for reviewing code quality');
      
      // Configure agent settings
      await page.check('input[name="checkSecurity"]');
      await page.check('input[name="checkPerformance"]');
      await page.selectOption('select[name="reviewDepth"]', 'thorough');
      
      // Submit form
      await page.click('button[type="submit"]:has-text("Create Agent")');
      
      // Should show success message
      await expect(page.locator('text=Agent created successfully')).toBeVisible();
      
      // Should appear in agents list
      await expect(page.locator('text=Test Code Review Agent')).toBeVisible();
    });

    test('should edit an existing agent', async ({ page }) => {
      // Navigate to agents tab
      await page.click('text=Agents');
      
      // Assume there's at least one agent, click edit button
      await page.click('[data-testid="agent-item"]:first-child button:has-text("Edit")');
      
      // Modify agent settings
      await page.fill('input[name="name"]', 'Updated Agent Name');
      await page.fill('textarea[name="description"]', 'Updated description');
      
      // Save changes
      await page.click('button[type="submit"]:has-text("Save Changes")');
      
      // Should show success message
      await expect(page.locator('text=Agent updated successfully')).toBeVisible();
      
      // Should show updated name
      await expect(page.locator('text=Updated Agent Name')).toBeVisible();
    });

    test('should delete an agent', async ({ page }) => {
      // Navigate to agents tab
      await page.click('text=Agents');
      
      // Get initial agent count
      const initialCount = await page.locator('[data-testid="agent-item"]').count();
      
      if (initialCount > 0) {
        // Click delete button on first agent
        await page.click('[data-testid="agent-item"]:first-child button:has-text("Delete")');
        
        // Confirm deletion in modal
        await expect(page.locator('text=Are you sure you want to delete this agent?')).toBeVisible();
        await page.click('button:has-text("Delete Agent")');
        
        // Should show success message
        await expect(page.locator('text=Agent deleted successfully')).toBeVisible();
        
        // Agent count should decrease
        const newCount = await page.locator('[data-testid="agent-item"]').count();
        expect(newCount).toBe(initialCount - 1);
      }
    });

    test('should start and stop agents', async ({ page }) => {
      // Navigate to agents tab
      await page.click('text=Agents');
      
      // Find an idle agent and start it
      const idleAgent = page.locator('[data-testid="agent-item"]:has-text("idle")');
      
      if (await idleAgent.count() > 0) {
        await idleAgent.first().locator('button:has-text("Start")').click();
        
        // Should show running status
        await expect(idleAgent.first().locator('text=running')).toBeVisible();
        
        // Stop the agent
        await idleAgent.first().locator('button:has-text("Stop")').click();
        
        // Should return to idle status
        await expect(idleAgent.first().locator('text=idle')).toBeVisible();
      }
    });

    test('should filter agents by type', async ({ page }) => {
      // Navigate to agents tab
      await page.click('text=Agents');
      
      // Apply filter
      await page.selectOption('select[name="agentTypeFilter"]', 'code-review');
      
      // Should only show code-review agents
      const visibleAgents = page.locator('[data-testid="agent-item"]');
      const agentCount = await visibleAgents.count();
      
      for (let i = 0; i < agentCount; i++) {
        await expect(visibleAgents.nth(i).locator('text=code-review')).toBeVisible();
      }
    });

    test('should search agents by name', async ({ page }) => {
      // Navigate to agents tab
      await page.click('text=Agents');
      
      // Search for specific agent
      await page.fill('input[placeholder="Search agents..."]', 'Code Review');
      
      // Should filter results
      const visibleAgents = page.locator('[data-testid="agent-item"]');
      const agentCount = await visibleAgents.count();
      
      if (agentCount > 0) {
        for (let i = 0; i < agentCount; i++) {
          const agentText = await visibleAgents.nth(i).textContent();
          expect(agentText?.toLowerCase()).toContain('code review');
        }
      }
    });
  });

  test.describe('Task Management', () => {
    test('should create and assign a task', async ({ page }) => {
      // Navigate to tasks section (assuming it exists)
      await page.click('text=Tasks');
      
      // Create new task
      await page.click('button:has-text("Create Task")');
      
      // Fill task form
      await page.fill('input[name="title"]', 'Review Pull Request #123');
      await page.fill('textarea[name="description"]', 'Review the latest pull request for security issues');
      await page.selectOption('select[name="priority"]', 'high');
      await page.selectOption('select[name="agentId"]', { index: 0 }); // Select first available agent
      
      // Submit task
      await page.click('button[type="submit"]:has-text("Create Task")');
      
      // Should show success message
      await expect(page.locator('text=Task created successfully')).toBeVisible();
      
      // Should appear in tasks list
      await expect(page.locator('text=Review Pull Request #123')).toBeVisible();
    });

    test('should view task details and results', async ({ page }) => {
      // Navigate to tasks section
      await page.click('text=Tasks');
      
      // Click on a completed task
      await page.click('[data-testid="task-item"]:has-text("completed"):first-child');
      
      // Should show task details modal
      await expect(page.locator('[data-testid="task-details-modal"]')).toBeVisible();
      
      // Should show task results
      await expect(page.locator('[data-testid="task-results"]')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Close")');
      await expect(page.locator('[data-testid="task-details-modal"]')).not.toBeVisible();
    });

    test('should cancel a pending task', async ({ page }) => {
      // Navigate to tasks section
      await page.click('text=Tasks');
      
      // Find a pending task and cancel it
      const pendingTask = page.locator('[data-testid="task-item"]:has-text("pending")');
      
      if (await pendingTask.count() > 0) {
        await pendingTask.first().locator('button:has-text("Cancel")').click();
        
        // Confirm cancellation
        await page.click('button:has-text("Confirm Cancel")');
        
        // Should show cancelled status
        await expect(pendingTask.first().locator('text=cancelled')).toBeVisible();
      }
    });
  });

  test.describe('Agent Marketplace', () => {
    test('should browse available agent templates', async ({ page }) => {
      // Navigate to marketplace
      await page.click('text=Marketplace');
      
      // Should show agent templates
      await expect(page.locator('[data-testid="agent-template"]')).toBeVisible();
      
      // Should show different categories
      await expect(page.locator('text=Code Review')).toBeVisible();
      await expect(page.locator('text=Documentation')).toBeVisible();
      await expect(page.locator('text=Testing')).toBeVisible();
    });

    test('should install agent from marketplace', async ({ page }) => {
      // Navigate to marketplace
      await page.click('text=Marketplace');
      
      // Click install on first template
      await page.click('[data-testid="agent-template"]:first-child button:has-text("Install")');
      
      // Should show installation modal
      await expect(page.locator('[data-testid="install-agent-modal"]')).toBeVisible();
      
      // Configure agent name
      await page.fill('input[name="agentName"]', 'My New Agent');
      
      // Install agent
      await page.click('button:has-text("Install Agent")');
      
      // Should show success message
      await expect(page.locator('text=Agent installed successfully')).toBeVisible();
      
      // Should navigate to agents tab and show new agent
      await page.click('text=Agents');
      await expect(page.locator('text=My New Agent')).toBeVisible();
    });

    test('should filter marketplace by category', async ({ page }) => {
      // Navigate to marketplace
      await page.click('text=Marketplace');
      
      // Filter by category
      await page.click('button:has-text("Code Review")');
      
      // Should only show code review templates
      const templates = page.locator('[data-testid="agent-template"]');
      const templateCount = await templates.count();
      
      for (let i = 0; i < templateCount; i++) {
        await expect(templates.nth(i).locator('text=Code Review')).toBeVisible();
      }
    });
  });

  test.describe('Analytics and Monitoring', () => {
    test('should display agent performance analytics', async ({ page }) => {
      // Navigate to analytics
      await page.click('text=Analytics');
      
      // Should show performance charts
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-completion-chart"]')).toBeVisible();
      
      // Should show metrics
      await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
    });

    test('should filter analytics by date range', async ({ page }) => {
      // Navigate to analytics
      await page.click('text=Analytics');
      
      // Change date range
      await page.click('button:has-text("Last 7 days")');
      await page.click('text=Last 30 days');
      
      // Charts should update (wait for loading)
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure for agent operations
      await page.route('**/api/agents/**', route => route.abort());
      
      // Try to create an agent
      await page.click('text=Agents');
      await page.click('button:has-text("Create Agent")');
      await page.fill('input[name="name"]', 'Test Agent');
      await page.selectOption('select[name="type"]', 'code-review');
      await page.click('button[type="submit"]:has-text("Create Agent")');
      
      // Should show error message
      await expect(page.locator('text=Failed to create agent')).toBeVisible();
    });

    test('should handle empty states properly', async ({ page }) => {
      // Mock empty responses
      await page.route('**/api/agents', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [] })
        });
      });
      
      await page.reload();
      
      // Should show empty state
      await page.click('text=Agents');
      await expect(page.locator('text=No agents created yet')).toBeVisible();
      await expect(page.locator('button:has-text("Create your first agent")')).toBeVisible();
    });
  });
});