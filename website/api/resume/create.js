const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const user = await validateApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { title = 'Untitled Resume', template = 'clean' } = req.body || {};

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title,
        template
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ resume: data });
  } catch (error) {
    console.error('Resume create error:', error);
    return res.status(500).json({ error: 'Failed to create resume' });
  }
};
