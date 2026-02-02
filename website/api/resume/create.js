// Resume Create API
const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');

async function getUser(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return null;

  const user = await validateApiKey(apiKey);
  if (!user) return null;

  // Fresh DB lookup for Pro status
  if (user.email) {
    const { data: freshUser } = await supabase
      .from('users')
      .select('id, subscribed_resumebuilder')
      .eq('email', user.email.toLowerCase())
      .single();

    if (freshUser?.subscribed_resumebuilder === true) {
      user.subscribed_resumebuilder = true;
    }
  }

  return user;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const body = req.body || {};
    const { title = 'Untitled Resume', template = 'clean' } = body;

    const isPro = user.subscribed_resumebuilder === true;
    console.log('[Resume Create] User:', user.id, 'isPro:', isPro);

    if (isPro) {
      // Pro users: unlimited resumes, create immediately
      const { data, error } = await supabase
        .from('resumes')
        .insert({ user_id: user.id, title, template })
        .select()
        .single();

      if (error) {
        console.error('[Resume Create] Error:', error);
        return res.status(500).json({ error: 'Failed to create resume' });
      }

      console.log('[Resume Create] Pro user - created resume:', data.id);
      return res.status(200).json({ resume: data, isPro: true });
    }

    // Free users: check resume limit
    const { count: resumeCount } = await supabase
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log('[Resume Create] Free user - resume count:', resumeCount);

    if ((resumeCount || 0) >= 1) {
      return res.status(403).json({
        error: 'RESUME_LIMIT',
        message: 'Upgrade to Pro to create unlimited resumes',
        current: resumeCount || 0,
        limit: 1,
        isPro: false
      });
    }

    const { data, error } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, title, template })
      .select()
      .single();

    if (error) {
      console.error('[Resume Create] Error:', error);
      return res.status(500).json({ error: 'Failed to create resume' });
    }

    return res.status(200).json({ resume: data, isPro: false });
  } catch (error) {
    console.error('Resume create error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
// Trigger deploy Mon, Feb  2, 2026 12:04:44 PM
