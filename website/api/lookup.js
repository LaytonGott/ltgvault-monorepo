const { supabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  // Set CORS headers
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
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Look up user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'No account found with this email address.'
      });
    }

    // Get user's API key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('key_prefix, last_four, created_at, last_used_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single();

    // Get usage stats
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usageData } = await supabase
      .from('usage')
      .select('tool, count')
      .eq('user_id', user.id)
      .eq('month', currentMonth);

    // Build usage object
    const usage = {};
    const tools = ['postup', 'chaptergen', 'threadgen'];
    const freeLimits = { postup: 3, chaptergen: 1, threadgen: 3 };

    tools.forEach(tool => {
      const toolUsage = usageData?.find(u => u.tool === tool);
      const used = toolUsage?.count || 0;
      const subscriptionField = `subscribed_${tool}`;
      const isSubscribed = user[subscriptionField] || false;

      usage[tool] = {
        used: used,
        limit: isSubscribed ? 'unlimited' : freeLimits[tool],
        subscribed: isSubscribed
      };
    });

    return res.status(200).json({
      success: true,
      user: {
        email: user.email,
        createdAt: user.created_at
      },
      apiKey: keyData ? {
        prefix: keyData.key_prefix,
        lastFour: keyData.last_four,
        maskedKey: `${keyData.key_prefix}${'*'.repeat(44)}${keyData.last_four}`,
        createdAt: keyData.created_at,
        lastUsedAt: keyData.last_used_at
      } : null,
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      },
      usage: usage
    });

  } catch (error) {
    console.error('Lookup error:', error);
    return res.status(500).json({ error: 'Failed to look up account' });
  }
};
