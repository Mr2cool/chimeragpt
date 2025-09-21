import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock data generators
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  created_at: new Date().toISOString(),
};

export const mockAgent = {
  id: 'test-agent-id',
  name: 'Test Agent',
  description: 'A test agent for testing purposes',
  type: 'code-review',
  status: 'active',
  created_at: new Date().toISOString(),
  user_id: 'test-user-id',
};

export const mockTask = {
  id: 'test-task-id',
  title: 'Test Task',
  description: 'A test task for testing purposes',
  status: 'pending',
  agent_id: 'test-agent-id',
  created_at: new Date().toISOString(),
};

export const mockWorkflow = {
  id: 'test-workflow-id',
  name: 'Test Workflow',
  description: 'A test workflow for testing purposes',
  status: 'active',
  steps: [],
  created_at: new Date().toISOString(),
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Common test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const mockSupabaseResponse = (data: any, error: any = null) => {
  return {
    data,
    error,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
};

// Mock fetch for API testing
export const mockFetch = (response: any, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

// Mock console methods for testing
export const mockConsole = () => {
  const originalConsole = { ...console };
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
  
  return {
    restore: () => {
      Object.assign(console, originalConsole);
    },
  };
};

// Test data factories
export const createMockAgent = (overrides: Partial<typeof mockAgent> = {}) => ({
  ...mockAgent,
  ...overrides,
});

export const createMockTask = (overrides: Partial<typeof mockTask> = {}) => ({
  ...mockTask,
  ...overrides,
});

export const createMockUser = (overrides: Partial<typeof mockUser> = {}) => ({
  ...mockUser,
  ...overrides,
});

export const createMockWorkflow = (overrides: Partial<typeof mockWorkflow> = {}) => ({
  ...mockWorkflow,
  ...overrides,
});