const { createClient } = require('@supabase/supabase-js');

// IMPORTANT: Use SERVICE ROLE key (not anon key) to bypass RLS
// This allows server-side access while RLS blocks direct client access
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

const supabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!supabaseConfigured) {
  console.error('ERROR: Supabase credentials not configured! SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING', 'SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'MISSING');
}

// Create client (may be non-functional if credentials missing, but won't be null)
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');

module.exports = { supabase, supabaseConfigured };
