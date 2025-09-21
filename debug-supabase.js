// Debug script to test Supabase imports
console.log('Testing Supabase imports...');

try {
  // Test environment variables
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
  
  // Test import
  const { createClient } = require('./src/lib/supabase/index.ts');
  console.log('createClient imported successfully:', typeof createClient);
  
} catch (error) {
  console.error('Error testing Supabase imports:', error.message);
}