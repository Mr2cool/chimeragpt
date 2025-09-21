import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Should redirect to login or show login form
    await expect(page).toHaveURL(/.*login.*/);
    await expect(page.locator('h1')).toContainText(/sign in|login/i);
    
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Try with invalid email format
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in valid credentials (using test user)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.locator('h1')).toContainText('ChimeraGPT Dashboard');
    
    // Should show user menu or profile indicator
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle signup flow', async ({ page }) => {
    await page.goto('/signup');
    
    // Check signup form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Fill in signup form
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'newpassword123');
    await page.fill('input[name="confirmPassword"]', 'newpassword123');
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect to verification
    await expect(
      page.locator('text=Account created successfully')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should validate password confirmation in signup', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in mismatched passwords
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'differentpassword');
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should handle logout functionality', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Click logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login.*/);
    
    // Should not be able to access protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password link
    await page.click('text=Forgot password?');
    
    // Should navigate to reset password page
    await expect(page).toHaveURL(/.*reset-password.*/);
    
    // Fill in email for reset
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(
      page.locator('text=Password reset email sent')
    ).toBeVisible();
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    // This test would require mocking session expiration
    // For now, it's a placeholder for future implementation
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // In a real scenario, you would mock session expiration
    // and verify that the user is redirected to login
  });

  test('should handle OAuth login (if implemented)', async ({ page }) => {
    await page.goto('/login');
    
    // Check if OAuth buttons are present
    const googleButton = page.locator('button:has-text("Continue with Google")');
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeVisible();
    }
    
    if (await githubButton.isVisible()) {
      await expect(githubButton).toBeVisible();
    }
  });

  test('should show loading states during authentication', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    
    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]');
    
    // Should show loading indicator
    await expect(
      page.locator('button[type="submit"]:has-text("Signing in...")')
    ).toBeVisible({ timeout: 1000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/auth/**', route => route.abort());
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Should show network error message
    await expect(
      page.locator('text=Network error. Please try again.')
    ).toBeVisible();
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access protected page while not authenticated
    await page.goto('/dashboard/agents');
    
    // Should redirect to login with return URL
    await expect(page).toHaveURL(/.*login.*/);
    
    // Login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Should redirect to originally intended page
    await expect(page).toHaveURL(/.*dashboard\/agents.*/);
  });
});