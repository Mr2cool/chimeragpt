import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Development server is ready');

    // Set up test database state
    console.log('🗄️ Setting up test database...');
    
    // Create test user account for authentication tests
    await setupTestUser(page);
    
    // Seed test data
    await seedTestData(page);
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestUser(page: any) {
  try {
    // Navigate to signup page
    await page.goto('/signup');
    
    // Check if test user already exists by trying to login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // If login successful, user already exists
    if (await page.url().includes('dashboard')) {
      console.log('✅ Test user already exists');
      await page.goto('/logout');
      return;
    }
    
    // Create new test user
    await page.goto('/signup');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="confirmPassword"]', 'testpassword123');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.click('button[type="submit"]');
    
    // Wait for signup to complete
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('✅ Test user created successfully');
    
    // Logout after creation
    await page.goto('/logout');
  } catch (error) {
    console.log('ℹ️ Test user setup skipped (may already exist or signup not available)');
  }
}

async function seedTestData(page: any) {
  try {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    if (!await page.url().includes('dashboard')) {
      console.log('ℹ️ Could not login to seed data, skipping...');
      return;
    }
    
    // Create sample agents for testing
    await createSampleAgents(page);
    
    // Create sample tasks for testing
    await createSampleTasks(page);
    
    console.log('✅ Test data seeded successfully');
    
    // Logout after seeding
    await page.goto('/logout');
  } catch (error) {
    console.log('ℹ️ Test data seeding skipped:', error.message);
  }
}

async function createSampleAgents(page: any) {
  try {
    // Navigate to agents page
    await page.click('text=Agents');
    
    // Check if agents already exist
    const existingAgents = await page.locator('[data-testid="agent-item"]').count();
    if (existingAgents > 0) {
      console.log('ℹ️ Sample agents already exist');
      return;
    }
    
    // Create Code Review Agent
    await page.click('button:has-text("Create Agent")');
    await page.fill('input[name="name"]', 'Test Code Review Agent');
    await page.selectOption('select[name="type"]', 'code-review');
    await page.fill('textarea[name="description"]', 'A test agent for code review');
    await page.click('button[type="submit"]:has-text("Create Agent")');
    await page.waitForSelector('text=Agent created successfully', { timeout: 5000 });
    
    // Create Documentation Agent
    await page.click('button:has-text("Create Agent")');
    await page.fill('input[name="name"]', 'Test Documentation Agent');
    await page.selectOption('select[name="type"]', 'documentation');
    await page.fill('textarea[name="description"]', 'A test agent for documentation');
    await page.click('button[type="submit"]:has-text("Create Agent")');
    await page.waitForSelector('text=Agent created successfully', { timeout: 5000 });
    
    console.log('✅ Sample agents created');
  } catch (error) {
    console.log('ℹ️ Could not create sample agents:', error.message);
  }
}

async function createSampleTasks(page: any) {
  try {
    // Navigate to tasks page (if exists)
    const tasksLink = page.locator('text=Tasks');
    if (await tasksLink.count() === 0) {
      console.log('ℹ️ Tasks page not found, skipping task creation');
      return;
    }
    
    await tasksLink.click();
    
    // Check if tasks already exist
    const existingTasks = await page.locator('[data-testid="task-item"]').count();
    if (existingTasks > 0) {
      console.log('ℹ️ Sample tasks already exist');
      return;
    }
    
    // Create sample task
    await page.click('button:has-text("Create Task")');
    await page.fill('input[name="title"]', 'Test Code Review Task');
    await page.fill('textarea[name="description"]', 'Review the latest pull request');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.selectOption('select[name="agentId"]', { index: 0 });
    await page.click('button[type="submit"]:has-text("Create Task")');
    await page.waitForSelector('text=Task created successfully', { timeout: 5000 });
    
    console.log('✅ Sample tasks created');
  } catch (error) {
    console.log('ℹ️ Could not create sample tasks:', error.message);
  }
}

export default globalSetup;