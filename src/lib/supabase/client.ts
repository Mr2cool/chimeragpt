import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwawmkutfbnpmesafkaq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YXdta3V0ZmJucG1lc2Fma2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDY2MzgsImV4cCI6MjA3MzMyMjYzOH0.lY1TgOz26N_5T8JC-tZd3horE7QHJL3R6P8cHJuJeDg';

export const createClientComponentClient = () => {
  try {
    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    // Return a mock client for development
    return {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signIn: () => Promise.resolve({ data: null, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any;
  }
};

// Named exports for convenience
export const createClient = createClientComponentClient;

// Create a singleton instance for use in components
export const supabase = createClientComponentClient();