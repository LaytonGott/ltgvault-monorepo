const crypto = require('crypto');
const { supabase } = require('../lib/supabase');
const { createApiKeyForUser } = require('../lib/auth');

// Same secret used for signing
const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'ltgv-access-token-secret';

// Validate and parse access token
function validateAccessToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');

    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [userId, email, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);

    // Check expiration
    if (Date.now() > expires) {
      return { valid: false, error: 'Token has expired' };
    }

    // Verify signature
    const payload = `${userId}:${email}:${expiresStr}`;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    return { valid: true, userId, email };
  } catch (err) {
    return { valid: false, error: 'Failed to parse token' };
  }
}

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
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Validate token
    const tokenResult = validateAccessToken(token);

    if (!tokenResult.valid) {
      return res.status(400).json({ error: tokenResult.error });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', tokenResult.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify email matches
    if (user.email !== tokenResult.email) {
      return res.status(400).json({ error: 'Token email mismatch' });
    }

    // Generate new API key (revokes any existing one)
    const apiKey = await createApiKeyForUser(user.id);

    if (!apiKey) {
      return res.status(500).json({ error: 'Failed to generate access key' });
    }

    console.log(`Access activated for ${user.email} via magic link`);

    return res.status(200).json({
      success: true,
      apiKey: apiKey,
      email: user.email
    });

  } catch (error) {
    console.error('Activate access error:', error);
    return res.status(500).json({ error: 'Failed to activate access' });
  }
};
