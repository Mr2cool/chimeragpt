import { test, expect } from '@playwright/test';

test.describe('Agent Marketplace Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Navigate to marketplace
    await page.click('text=Marketplace');
  });

  test.describe('Marketplace Browse and Search', () => {
    test('should display marketplace with agent templates', async ({ page }) => {
      // Check marketplace header
      await expect(page.locator('h1:has-text("Agent Marketplace")')).toBeVisible();
      
      // Check that templates are displayed
      await expect(page.locator('[data-testid="agent-template"]')).toBeVisible();
      
      // Check template cards have required information
      const firstTemplate = page.locator('[data-testid="agent-template"]').first();
      await expect(firstTemplate.locator('[data-testid="template-name"]')).toBeVisible();
      await expect(firstTemplate.locator('[data-testid="template-description"]')).toBeVisible();
      await expect(firstTemplate.locator('[data-testid="template-category"]')).toBeVisible();
      await expect(firstTemplate.locator('[data-testid="template-rating"]')).toBeVisible();
    });

    test('should search for specific agent templates', async ({ page }) => {
      // Search for code review agents
      await page.fill('input[placeholder="Search agent templates..."]', 'code review');
      await page.press('input[placeholder="Search agent templates..."]', 'Enter');
      
      // Should show filtered results
      const templates = page.locator('[data-testid="agent-template"]');
      const templateCount = await templates.count();
      
      if (templateCount > 0) {
        for (let i = 0; i < templateCount; i++) {
          const templateText = await templates.nth(i).textContent();
          expect(templateText?.toLowerCase()).toContain('code');
        }
      }
      
      // Clear search
      await page.fill('input[placeholder="Search agent templates..."]', '');
      await page.press('input[placeholder="Search agent templates..."]', 'Enter');
    });

    test('should filter templates by category', async ({ page }) => {
      // Test category filters
      const categories = ['Code Review', 'Documentation', 'Testing', 'Security', 'Performance'];
      
      for (const category of categories) {
        // Click category filter
        await page.click(`button:has-text("${category}")`);
        
        // Wait for filter to apply
        await page.waitForTimeout(500);
        
        // Check that only templates of this category are shown
        const templates = page.locator('[data-testid="agent-template"]');
        const templateCount = await templates.count();
        
        if (templateCount > 0) {
          for (let i = 0; i < Math.min(templateCount, 3); i++) {
            await expect(templates.nth(i).locator(`text=${category}`)).toBeVisible();
          }
        }
      }
      
      // Reset filters
      await page.click('button:has-text("All Categories")');
    });

    test('should sort templates by different criteria', async ({ page }) => {
      // Test sorting options
      await page.click('[data-testid="sort-dropdown"]');
      
      // Sort by rating
      await page.click('text=Highest Rated');
      await page.waitForTimeout(500);
      
      // Verify sorting (check first few templates have high ratings)
      const ratings = await page.locator('[data-testid="template-rating"]').allTextContents();
      if (ratings.length > 1) {
        const firstRating = parseFloat(ratings[0]);
        const secondRating = parseFloat(ratings[1]);
        expect(firstRating).toBeGreaterThanOrEqual(secondRating);
      }
      
      // Sort by newest
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Newest');
      await page.waitForTimeout(500);
      
      // Sort by most popular
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Most Popular');
      await page.waitForTimeout(500);
    });
  });

  test.describe('Template Details and Preview', () => {
    test('should view template details', async ({ page }) => {
      // Click on first template
      await page.click('[data-testid="agent-template"]').first();
      
      // Should open template details modal
      await expect(page.locator('[data-testid="template-details-modal"]')).toBeVisible();
      
      // Check modal content
      await expect(page.locator('[data-testid="template-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-full-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-features"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-requirements"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-configuration"]')).toBeVisible();
      
      // Check action buttons
      await expect(page.locator('button:has-text("Install")')).toBeVisible();
      await expect(page.locator('button:has-text("Preview")')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Close")');
      await expect(page.locator('[data-testid="template-details-modal"]')).not.toBeVisible();
    });

    test('should preview template configuration', async ({ page }) => {
      // Click on first template
      await page.click('[data-testid="agent-template"]').first();
      
      // Click preview button
      await page.click('button:has-text("Preview")');
      
      // Should show preview modal
      await expect(page.locator('[data-testid="template-preview-modal"]')).toBeVisible();
      
      // Check preview content
      await expect(page.locator('[data-testid="preview-configuration"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-capabilities"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-example-usage"]')).toBeVisible();
      
      // Close preview
      await page.click('button:has-text("Close Preview")');
      await expect(page.locator('[data-testid="template-preview-modal"]')).not.toBeVisible();
    });

    test('should view template reviews and ratings', async ({ page }) => {
      // Click on first template
      await page.click('[data-testid="agent-template"]').first();
      
      // Navigate to reviews tab
      await page.click('button:has-text("Reviews")');
      
      // Check reviews section
      await expect(page.locator('[data-testid="template-reviews"]')).toBeVisible();
      
      // Should show rating breakdown
      await expect(page.locator('[data-testid="rating-breakdown"]')).toBeVisible();
      
      // Should show individual reviews or empty state
      const reviews = page.locator('[data-testid="review-item"]');
      const emptyState = page.locator('text=No reviews yet');
      
      await expect(reviews.first().or(emptyState)).toBeVisible();
    });
  });

  test.describe('Agent Installation', () => {
    test('should install agent with default configuration', async ({ page }) => {
      // Click install on first template
      await page.click('[data-testid="agent-template"]:first-child button:has-text("Install")');
      
      // Should show installation modal
      await expect(page.locator('[data-testid="install-agent-modal"]')).toBeVisible();
      
      // Check default configuration is loaded
      await expect(page.locator('input[name="agentName"]')).toHaveValue(/.+/);
      
      // Install with defaults
      await page.click('button:has-text("Install Agent")');
      
      // Should show installation progress
      await expect(page.locator('[data-testid="installation-progress"]')).toBeVisible();
      
      // Should show success message
      await expect(page.locator('text=Agent installed successfully')).toBeVisible({ timeout: 10000 });
      
      // Should navigate to agents page
      await expect(page).toHaveURL(/.*agents.*/);
      
      // Should show new agent in list
      await expect(page.locator('[data-testid="agent-item"]')).toBeVisible();
    });

    test('should install agent with custom configuration', async ({ page }) => {
      // Click install on first template
      await page.click('[data-testid="agent-template"]:first-child button:has-text("Install")');
      
      // Customize agent configuration
      await page.fill('input[name="agentName"]', 'My Custom Code Reviewer');
      await page.fill('textarea[name="description"]', 'Custom description for my agent');
      
      // Configure specific settings
      await page.check('input[name="enableSecurity"]');
      await page.check('input[name="enablePerformance"]');
      await page.selectOption('select[name="reviewDepth"]', 'thorough');
      await page.selectOption('select[name="language"]', 'typescript');
      
      // Set custom prompts
      await page.fill('textarea[name="systemPrompt"]', 'You are a senior TypeScript developer...');
      
      // Install agent
      await page.click('button:has-text("Install Agent")');
      
      // Should show success and navigate
      await expect(page.locator('text=Agent installed successfully')).toBeVisible({ timeout: 10000 });
      
      // Verify custom configuration was applied
      await expect(page.locator('text=My Custom Code Reviewer')).toBeVisible();
    });

    test('should handle installation errors', async ({ page }) => {
      // Mock installation failure
      await page.route('**/api/agents/install', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Installation failed' })
        });
      });
      
      // Try to install agent
      await page.click('[data-testid="agent-template"]:first-child button:has-text("Install")');
      await page.fill('input[name="agentName"]', 'Test Agent');
      await page.click('button:has-text("Install Agent")');
      
      // Should show error message
      await expect(page.locator('text=Installation failed')).toBeVisible();
      
      // Should allow retry
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should validate installation form', async ({ page }) => {
      // Click install on first template
      await page.click('[data-testid="agent-template"]:first-child button:has-text("Install")');
      
      // Clear required fields
      await page.fill('input[name="agentName"]', '');
      
      // Try to install
      await page.click('button:has-text("Install Agent")');
      
      // Should show validation errors
      await expect(page.locator('text=Agent name is required')).toBeVisible();
      
      // Fill invalid name
      await page.fill('input[name="agentName"]', 'a');
      await page.click('button:has-text("Install Agent")');
      
      // Should show length validation
      await expect(page.locator('text=Agent name must be at least 3 characters')).toBeVisible();
    });
  });

  test.describe('Template Management', () => {
    test('should add template to favorites', async ({ page }) => {
      // Click favorite button on first template
      await page.click('[data-testid="agent-template"]:first-child [data-testid="favorite-button"]');
      
      // Should show favorited state
      await expect(page.locator('[data-testid="agent-template"]:first-child [data-testid="favorite-button"][data-favorited="true"]')).toBeVisible();
      
      // Navigate to favorites
      await page.click('button:has-text("Favorites")');
      
      // Should show favorited template
      await expect(page.locator('[data-testid="agent-template"]')).toBeVisible();
    });

    test('should remove template from favorites', async ({ page }) => {
      // First add to favorites
      await page.click('[data-testid="agent-template"]:first-child [data-testid="favorite-button"]');
      
      // Then remove from favorites
      await page.click('[data-testid="agent-template"]:first-child [data-testid="favorite-button"]');
      
      // Should show unfavorited state
      await expect(page.locator('[data-testid="agent-template"]:first-child [data-testid="favorite-button"][data-favorited="false"]')).toBeVisible();
    });

    test('should share template', async ({ page }) => {
      // Click share button on first template
      await page.click('[data-testid="agent-template"]:first-child [data-testid="share-button"]');
      
      // Should show share modal
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
      
      // Should show share link
      await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
      
      // Should have copy button
      await expect(page.locator('button:has-text("Copy Link")')).toBeVisible();
      
      // Test copy functionality
      await page.click('button:has-text("Copy Link")');
      await expect(page.locator('text=Link copied to clipboard')).toBeVisible();
    });

    test('should report template', async ({ page }) => {
      // Click report button on first template
      await page.click('[data-testid="agent-template"]:first-child [data-testid="report-button"]');
      
      // Should show report modal
      await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
      
      // Fill report form
      await page.selectOption('select[name="reportReason"]', 'inappropriate');
      await page.fill('textarea[name="reportDetails"]', 'This template contains inappropriate content');
      
      // Submit report
      await page.click('button:has-text("Submit Report")');
      
      // Should show success message
      await expect(page.locator('text=Report submitted successfully')).toBeVisible();
    });
  });

  test.describe('Template Creation and Publishing', () => {
    test('should create and publish new template', async ({ page }) => {
      // Click create template button
      await page.click('button:has-text("Create Template")');
      
      // Should show template creation form
      await expect(page.locator('[data-testid="create-template-form"]')).toBeVisible();
      
      // Fill basic information
      await page.fill('input[name="templateName"]', 'My Custom Agent Template');
      await page.fill('textarea[name="templateDescription"]', 'A custom agent template for specific use cases');
      await page.selectOption('select[name="category"]', 'code-review');
      
      // Configure agent settings
      await page.fill('textarea[name="systemPrompt"]', 'You are a helpful coding assistant...');
      await page.fill('textarea[name="capabilities"]', 'Code review, bug detection, performance analysis');
      
      // Add configuration options
      await page.click('button:has-text("Add Configuration Option")');
      await page.fill('input[name="configOptions[0].name"]', 'reviewDepth');
      await page.selectOption('select[name="configOptions[0].type"]', 'select');
      await page.fill('input[name="configOptions[0].options"]', 'quick,thorough,comprehensive');
      
      // Set template metadata
      await page.fill('input[name="version"]', '1.0.0');
      await page.fill('input[name="author"]', 'Test Author');
      await page.fill('input[name="license"]', 'MIT');
      
      // Save as draft first
      await page.click('button:has-text("Save as Draft")');
      
      // Should show success message
      await expect(page.locator('text=Template saved as draft')).toBeVisible();
      
      // Publish template
      await page.click('button:has-text("Publish Template")');
      
      // Should show publish confirmation
      await expect(page.locator('text=Are you sure you want to publish this template?')).toBeVisible();
      await page.click('button:has-text("Confirm Publish")');
      
      // Should show success and navigate to template
      await expect(page.locator('text=Template published successfully')).toBeVisible();
    });

    test('should validate template creation form', async ({ page }) => {
      // Click create template button
      await page.click('button:has-text("Create Template")');
      
      // Try to save without required fields
      await page.click('button:has-text("Save as Draft")');
      
      // Should show validation errors
      await expect(page.locator('text=Template name is required')).toBeVisible();
      await expect(page.locator('text=Description is required')).toBeVisible();
      await expect(page.locator('text=Category is required')).toBeVisible();
    });
  });

  test.describe('Marketplace Analytics', () => {
    test('should view template usage statistics', async ({ page }) => {
      // Navigate to my templates (assuming user has published templates)
      await page.click('button:has-text("My Templates")');
      
      // Click on a template
      await page.click('[data-testid="my-template-item"]:first-child');
      
      // Click analytics tab
      await page.click('button:has-text("Analytics")');
      
      // Should show usage statistics
      await expect(page.locator('[data-testid="install-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="rating-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="geographic-distribution"]')).toBeVisible();
    });

    test('should view marketplace trends', async ({ page }) => {
      // Navigate to trends section
      await page.click('button:has-text("Trends")');
      
      // Should show trending templates
      await expect(page.locator('[data-testid="trending-templates"]')).toBeVisible();
      
      // Should show category trends
      await expect(page.locator('[data-testid="category-trends"]')).toBeVisible();
      
      // Should show usage statistics
      await expect(page.locator('[data-testid="marketplace-stats"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors in marketplace', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/marketplace/**', route => route.abort());
      
      await page.reload();
      await page.click('text=Marketplace');
      
      // Should show error state
      await expect(page.locator('text=Failed to load marketplace')).toBeVisible();
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should handle empty marketplace', async ({ page }) => {
      // Mock empty marketplace
      await page.route('**/api/marketplace/templates', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ templates: [] })
        });
      });
      
      await page.reload();
      await page.click('text=Marketplace');
      
      // Should show empty state
      await expect(page.locator('text=No templates available')).toBeVisible();
      await expect(page.locator('button:has-text("Create First Template")')).toBeVisible();
    });

    test('should handle search with no results', async ({ page }) => {
      // Search for non-existent template
      await page.fill('input[placeholder="Search agent templates..."]', 'nonexistenttemplate12345');
      await page.press('input[placeholder="Search agent templates..."]', 'Enter');
      
      // Should show no results state
      await expect(page.locator('text=No templates found')).toBeVisible();
      await expect(page.locator('text=Try adjusting your search terms')).toBeVisible();
      
      // Should show suggestion to create template
      await expect(page.locator('button:has-text("Create Template")')).toBeVisible();
    });
  });
});