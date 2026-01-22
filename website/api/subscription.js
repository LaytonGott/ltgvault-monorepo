const { authenticateRequest } = require('../lib/auth');
const { getUsageWithLimits } = require('../lib/usage');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate request
    const { user, error } = await authenticateRequest(req);

    if (error) {
      return res.status(401).json({ error });
    }

    // Get per-tool subscription status
    const subscriptions = {
      postup: user.subscribed_postup || false,
      chaptergen: user.subscribed_chaptergen || false,
      threadgen: user.subscribed_threadgen || false
    };

    // Get usage with limits for all tools
    const usage = await getUsageWithLimits(user.id, subscriptions);

    return res.status(200).json({
      success: true,
      subscription: {
        email: user.email,
        status: user.subscription_status,
        subscriptions: subscriptions
      },
      usage: usage
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription info' });
  }
};
