const crypto = require('crypto');
const { stripe } = require('../lib/stripe');
const { supabase } = require('../lib/supabase');
const { createApiKeyForUser } = require('../lib/auth');

const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'ltgv-access-token-secret';

function validateAccessToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false, error: 'Invalid token format' };

    const [userId, email, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return { valid: false, error: 'Token has expired' };

    const payload = `${userId}:${email}:${expiresStr}`;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return { valid: false, error: 'Invalid token signature' };

    return { valid: true, userId, email };
  } catch (err) {
    return { valid: false, error: 'Failed to parse token' };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { sessionId, token, email, action } = req.body;

    // Handle sync-access flow (email-based)
    if ((email && !sessionId && !token) || action === 'sync-access') {
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, subscribed_postup, subscribed_chaptergen, subscribed_threadgen, subscribed_resumebuilder')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !user) return res.status(404).json({ error: 'User not found' });

      const apiKey = await createApiKeyForUser(user.id);
      if (!apiKey) return res.status(500).json({ error: 'Failed to generate API key' });

      console.log(`Access synced for ${user.email}`);

      return res.status(200).json({
        success: true,
        apiKey: apiKey,
        subscriptions: {
          postup: user.subscribed_postup || false,
          chaptergen: user.subscribed_chaptergen || false,
          threadgen: user.subscribed_threadgen || false,
          resumebuilder: user.subscribed_resumebuilder || false
        }
      });
    }

    // Determine action based on parameters
    if (sessionId || action === 'claim-key') {
      // Handle claim-key flow
      if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });
      if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      if (session.payment_status !== 'paid') return res.status(400).json({ error: 'Payment not completed' });

      const userEmail = session.metadata?.user_email || session.customer_email;
      if (!userEmail) return res.status(400).json({ error: 'No email associated with session' });

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, created_at, subscribed_postup, subscribed_chaptergen, subscribed_threadgen, subscribed_resumebuilder')
        .eq('email', userEmail.toLowerCase())
        .single();

      if (userError || !user) return res.status(404).json({ error: 'User not found' });

      const apiKey = await createApiKeyForUser(user.id);
      if (!apiKey) return res.status(500).json({ error: 'Failed to generate API key' });

      console.log(`API key claimed for ${user.email} via session ${sessionId}`);

      return res.status(200).json({
        success: true,
        apiKey: apiKey,
        user: { email: user.email, createdAt: user.created_at },
        subscriptions: {
          postup: user.subscribed_postup || false,
          chaptergen: user.subscribed_chaptergen || false,
          threadgen: user.subscribed_threadgen || false,
          resumebuilder: user.subscribed_resumebuilder || false
        }
      });
    }

    if (token || action === 'activate-access') {
      // Handle activate-access flow
      if (!token) return res.status(400).json({ error: 'Token is required' });

      const tokenResult = validateAccessToken(token);
      if (!tokenResult.valid) return res.status(400).json({ error: tokenResult.error });

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', tokenResult.userId)
        .single();

      if (userError || !user) return res.status(404).json({ error: 'User not found' });
      if (user.email !== tokenResult.email) return res.status(400).json({ error: 'Token email mismatch' });

      const apiKey = await createApiKeyForUser(user.id);
      if (!apiKey) return res.status(500).json({ error: 'Failed to generate access key' });

      console.log(`Access activated for ${user.email} via magic link`);

      return res.status(200).json({
        success: true,
        apiKey: apiKey,
        email: user.email
      });
    }

    return res.status(400).json({ error: 'Either sessionId or token is required' });

  } catch (error) {
    console.error('Activate error:', error);
    return res.status(500).json({ error: 'Failed to activate' });
  }
};
