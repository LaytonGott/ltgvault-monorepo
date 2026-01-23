const { supabase } = require('../lib/supabase');
const { createApiKeyForUser } = require('../lib/auth');

// This endpoint syncs API access to the current browser
// Called from dashboard after successful email lookup
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, subscribed_postup, subscribed_chaptergen, subscribed_threadgen')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new API key (revokes any existing one)
    const apiKey = await createApiKeyForUser(user.id);

    if (!apiKey) {
      return res.status(500).json({ error: 'Failed to generate API key' });
    }

    console.log(`Access synced for ${user.email}`);

    return res.status(200).json({
      success: true,
      apiKey: apiKey,
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      }
    });

  } catch (error) {
    console.error('Sync access error:', error);
    return res.status(500).json({ error: 'Failed to sync access' });
  }
};
