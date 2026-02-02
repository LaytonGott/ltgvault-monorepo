// Resume Status API - Combined pro-status + list + ai-usage
const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');
const { getResumeProStatus } = require('../../lib/resume-pro');

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
    // Get pro status and usage
    const status = await getResumeProStatus(user.id);
    const directIsPro = user.subscribed_resumebuilder === true;

    // Get resume list
    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Resume list error:', error);
    }

    return res.status(200).json({
      // Pro status
      ...status,
      isPro: directIsPro,
      // Resume list
      resumes: resumes || [],
      // AI usage in expected format
      aiUsage: {
        used: status.usage?.aiGenerations || 0,
        limit: status.aiLimit || 5,
        remaining: status.aiRemaining || 0,
        isPro: directIsPro
      }
    });
  } catch (error) {
    console.error('Resume status error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
