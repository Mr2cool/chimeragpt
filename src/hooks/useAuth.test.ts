import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { createClient } from '@/lib/supabase';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    })),
  })),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

const mockSupabase = createClient() as any;

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });

    it('should set up auth state change listener', () => {
      renderHook(() => useAuth());
      
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('Authentication Methods', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { firstName: 'Test', lastName: 'User' },
      };
      
      const mockSession = {
        user: mockUser,
        access_token: 'token123',
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'password123');
        expect(response.success).toBe(true);
      });
      
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login error', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'wrongpassword');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid credentials');
      });
    });

    it('should handle successful signup', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { firstName: 'Test', lastName: 'User' },
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.signUp(
          'test@example.com',
          'password123',
          { firstName: 'Test', lastName: 'User' }
        );
        expect(response.success).toBe(true);
      });
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { firstName: 'Test', lastName: 'User' },
        },
      });
    });

    it('should handle signup error', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.signUp(
          'test@example.com',
          'password123',
          { firstName: 'Test', lastName: 'User' }
        );
        expect(response.success).toBe(false);
        expect(response.error).toBe('Email already registered');
      });
    });

    it('should handle successful logout', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.signOut();
      });
      
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout error', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.signOut();
      });
      
      // Should still attempt logout even if error occurs
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Password Reset', () => {
    it('should handle successful password reset request', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.resetPassword('test@example.com');
        expect(response.success).toBe(true);
      });
      
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
    });

    it('should handle password reset error', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'Email not found' },
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.resetPassword('test@example.com');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Email not found');
      });
    });
  });

  describe('Profile Update', () => {
    it('should handle successful profile update', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { firstName: 'Updated', lastName: 'User' },
      };
      
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.updateProfile({
          firstName: 'Updated',
          lastName: 'User',
        });
        expect(response.success).toBe(true);
      });
      
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: { firstName: 'Updated', lastName: 'User' },
      });
    });

    it('should handle profile update error', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Update failed' },
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.updateProfile({
          firstName: 'Updated',
          lastName: 'User',
        });
        expect(response.success).toBe(false);
        expect(response.error).toBe('Update failed');
      });
    });
  });

  describe('Auth State Changes', () => {
    it('should update state when user signs in', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { firstName: 'Test', lastName: 'User' },
      };
      
      const mockSession = {
        user: mockUser,
        access_token: 'token123',
      };
      
      let authStateCallback: Function;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      const { result } = renderHook(() => useAuth());
      
      // Simulate auth state change
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.loading).toBe(false);
    });

    it('should update state when user signs out', async () => {
      let authStateCallback: Function;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      const { result } = renderHook(() => useAuth());
      
      // Simulate auth state change to signed out
      act(() => {
        authStateCallback('SIGNED_OUT', null);
      });
      
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should check if user is authenticated', () => {
      const { result } = renderHook(() => useAuth());
      
      // Initially not authenticated
      expect(result.current.isAuthenticated).toBe(false);
      
      // Mock authenticated state
      let authStateCallback: Function;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123',
      };
      
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should get user role', () => {
      const { result } = renderHook(() => useAuth());
      
      let authStateCallback: Function;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      const mockSession = {
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: { role: 'admin' },
        },
        access_token: 'token123',
      };
      
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });
      
      expect(result.current.userRole).toBe('admin');
    });

    it('should check if user has specific role', () => {
      const { result } = renderHook(() => useAuth());
      
      let authStateCallback: Function;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      
      const mockSession = {
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: { role: 'admin' },
        },
        access_token: 'token123',
      };
      
      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });
      
      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('user')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });
      
      const { unmount } = renderHook(() => useAuth());
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'password123');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Network error');
      });
    });

    it('should handle session retrieval errors', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(
        new Error('Session retrieval failed')
      );
      
      const { result } = renderHook(() => useAuth());
      
      // Should still set loading to false even if session retrieval fails
      expect(result.current.loading).toBe(false);
    });
  });
});