const { stripe } = require('../lib/stripe');
const { supabase } = require('../lib/supabase');
const { createApiKeyForUser } = require('../lib/auth');

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
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const userEmail = session.metadata?.user_email || session.customer_email;

    if (!userEmail) {
      return res.status(400).json({ error: 'No email associated with session' });
    }

    // Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at, subscribed_postup, subscribed_chaptergen, subscribed_threadgen')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has an active API key
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single();

    let apiKey;

    if (existingKey) {
      // Generate a new key (revokes the old one)
      apiKey = await createApiKeyForUser(user.id);
    } else {
      // Create first key
      apiKey = await createApiKeyForUser(user.id);
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Failed to generate API key' });
    }

    console.log(`API key claimed for ${user.email} via session ${sessionId}`);

    return res.status(200).json({
      success: true,
      apiKey: apiKey,
      user: {
        email: user.email,
        createdAt: user.created_at
      },
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      }
    });

  } catch (error) {
    console.error('Claim key error:', error);
    return res.status(500).json({ error: 'Failed to claim API key' });
  }
};
