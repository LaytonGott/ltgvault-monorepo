const { supabase } = require('../lib/supabase');
const { authenticateRequest, createApiKeyForUser } = require('../lib/auth');
const { debugLog } = require('../lib/debug.cjs');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Authenticate request
  const { user, error } = await authenticateRequest(req);

  if (error) {
    return res.status(401).json({ error });
  }

  // GET - Get API key info
  if (req.method === 'GET') {
    try {
      debugLog('keys', 'GET request for user:', user.id);

      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('key_prefix, last_four, created_at, last_used_at')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .single();

      if (keyError || !keyData) {
        return res.status(404).json({ error: 'No active API key found' });
      }

      const response = {
        success: true,
        key: {
          prefix: keyData.key_prefix,
          lastFour: keyData.last_four,
          maskedKey: `${keyData.key_prefix}${'*'.repeat(44)}${keyData.last_four}`,
          createdAt: keyData.created_at,
          lastUsedAt: keyData.last_used_at
        },
        subscriptions: {
          postup: user.subscribed_postup || false,
          chaptergen: user.subscribed_chaptergen || false,
          threadgen: user.subscribed_threadgen || false
        }
      };

      debugLog('keys', 'Returning response for user:', user.id);

      return res.status(200).json(response);

    } catch (err) {
      console.error('Error fetching API key info:', err);
      return res.status(500).json({ error: 'Failed to fetch API key info' });
    }
  }

  // POST - Generate new API key
  if (req.method === 'POST') {
    try {
      const apiKey = await createApiKeyForUser(user.id);

      if (!apiKey) {
        return res.status(500).json({ error: 'Failed to generate API key' });
      }

      return res.status(200).json({
        success: true,
        apiKey: apiKey,
        lastFour: apiKey.slice(-4),
        message: 'New API key generated. Your old key has been revoked. Save this key - it will not be shown again.'
      });

    } catch (err) {
      console.error('Error generating API key:', err);
      return res.status(500).json({ error: 'Failed to generate API key' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
