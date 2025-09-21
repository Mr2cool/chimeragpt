import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    
    // Clean up test user data
    await cleanupTestData(page);
    
    // Reset database state if needed
    await resetDatabaseState(page);
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
    console.log('⚠️ Continuing despite teardown errors...');
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page: any) {
  try {
    // Login as test user
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    if (!await page.url().includes('dashboard')) {
      console.log('ℹ️ Could not login for cleanup, skipping...');
      return;
    }
    
    // Clean up test agents
    await cleanupTestAgents(page);
    
    // Clean up test tasks
    await cleanupTestTasks(page);
    
    // Clean up test templates
    await cleanupTestTemplates(page);
    
    console.log('✅ Test data cleaned up successfully');
    
    // Logout after cleanup
    await page.goto('/logout');
  } catch (error) {
    console.log('ℹ️ Test data cleanup skipped:', error.message);
  }
}

async function cleanupTestAgents(page: any) {
  try {
    // Navigate to agents page
    await page.click('text=Agents');
    
    // Delete all test agents
    const testAgents = page.locator('[data-testid="agent-item"]:has-text("Test")');
    const agentCount = await testAgents.count();
    
    for (let i = 0; i < agentCount; i++) {
      // Always select the first test agent (as they get removed from DOM)
      const firstTestAgent = testAgents.first();
      
      if (await firstTestAgent.count() > 0) {
        await firstTestAgent.locator('button:has-text("Delete")').click();
        
        // Confirm deletion
        await page.click('button:has-text("Delete Agent")');
        
        // Wait for deletion to complete
        await page.waitForSelector('text=Agent deleted successfully', { timeout: 5000 });
      }
    }
    
    console.log(`✅ Cleaned up ${agentCount} test agents`);
  } catch (error) {
    console.log('ℹ️ Could not cleanup test agents:', error.message);
  }
}

async function cleanupTestTasks(page: any) {
  try {
    // Navigate to tasks page (if exists)
    const tasksLink = page.locator('text=Tasks');
    if (await tasksLink.count() === 0) {
      console.log('ℹ️ Tasks page not found, skipping task cleanup');
      return;
    }
    
    await tasksLink.click();
    
    // Delete all test tasks
    const testTasks = page.locator('[data-testid="task-item"]:has-text("Test")');
    const taskCount = await testTasks.count();
    
    for (let i = 0; i < taskCount; i++) {
      const firstTestTask = testTasks.first();
      
      if (await firstTestTask.count() > 0) {
        // Cancel or delete task
        const deleteButton = firstTestTask.locator('button:has-text("Delete")');
        const cancelButton = firstTestTask.locator('button:has-text("Cancel")');
        
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.click('button:has-text("Confirm Delete")');
        } else if (await cancelButton.count() > 0) {
          await cancelButton.click();
          await page.click('button:has-text("Confirm Cancel")');
        }
        
        // Wait for action to complete
        await page.waitForTimeout(1000);
      }
    }
    
    console.log(`✅ Cleaned up ${taskCount} test tasks`);
  } catch (error) {
    console.log('ℹ️ Could not cleanup test tasks:', error.message);
  }
}

async function cleanupTestTemplates(page: any) {
  try {
    // Navigate to marketplace
    await page.click('text=Marketplace');
    
    // Navigate to my templates
    const myTemplatesButton = page.locator('button:has-text("My Templates")');
    if (await myTemplatesButton.count() === 0) {
      console.log('ℹ️ My Templates section not found, skipping template cleanup');
      return;
    }
    
    await myTemplatesButton.click();
    
    // Delete all test templates
    const testTemplates = page.locator('[data-testid="my-template-item"]:has-text("Test")');
    const templateCount = await testTemplates.count();
    
    for (let i = 0; i < templateCount; i++) {
      const firstTestTemplate = testTemplates.first();
      
      if (await firstTestTemplate.count() > 0) {
        await firstTestTemplate.locator('button:has-text("Delete")').click();
        
        // Confirm deletion
        await page.click('button:has-text("Delete Template")');
        
        // Wait for deletion to complete
        await page.waitForSelector('text=Template deleted successfully', { timeout: 5000 });
      }
    }
    
    console.log(`✅ Cleaned up ${templateCount} test templates`);
  } catch (error) {
    console.log('ℹ️ Could not cleanup test templates:', error.message);
  }
}

async function resetDatabaseState(page: any) {
  try {
    // Reset any global application state if needed
    // This could include clearing caches, resetting counters, etc.
    
    // Example: Clear application cache
    await page.evaluate(() => {
      if (typeof window !== 'undefined') {
        // Clear localStorage
        window.localStorage.clear();
        
        // Clear sessionStorage
        window.sessionStorage.clear();
        
        // Clear any application-specific caches
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      }
    });
    
    console.log('✅ Database state reset completed');
  } catch (error) {
    console.log('ℹ️ Database state reset skipped:', error.message);
  }
}

export default globalTeardown;