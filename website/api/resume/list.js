// Resume List API
const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');

async function getUser(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return null;

  const user = await validateApiKey(apiKey);
  if (!user) return null;

  return user;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Resume list error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ resumes: data || [] });
  } catch (error) {
    console.error('Resume list error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
