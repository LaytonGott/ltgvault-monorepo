const { createClient } = require('@supabase/supabase-js');

// IMPORTANT: Use SERVICE ROLE key (not anon key) to bypass RLS
// This allows server-side access while RLS blocks direct client access
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)?.trim();

// DEBUG LOGGING - shows what credentials are being used
console.log('=== SUPABASE CLIENT INIT ===');
console.log('SUPABASE_URL:', supabaseUrl || 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('Key length:', supabaseKey?.length || 0);
console.log('Key prefix (first 20 chars):', supabaseKey?.substring(0, 20) || 'MISSING');
console.log('Key suffix (last 10 chars):', supabaseKey?.substring(supabaseKey.length - 10) || 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Supabase credentials not configured!');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

console.log('Supabase client created:', !!supabase);
console.log('=== END SUPABASE INIT ===');

module.exports = { supabase };
