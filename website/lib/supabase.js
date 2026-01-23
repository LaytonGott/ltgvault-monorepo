const { createClient } = require('@supabase/supabase-js');

// IMPORTANT: Use SERVICE ROLE key (not anon key) to bypass RLS
// This allows server-side access while RLS blocks direct client access
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured');
  console.warn('  SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.warn('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'MISSING');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

module.exports = { supabase };
