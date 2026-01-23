const crypto = require('crypto');
const { supabase } = require('../lib/supabase');

// Secret for signing tokens - should be in env var in production
const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'ltgv-access-token-secret';

// Generate a signed access token
function generateAccessToken(userId, email) {
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  const payload = `${userId}:${email}:${expires}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    // Generate access token
    const token = generateAccessToken(user.id, user.email);
    const siteUrl = (process.env.SITE_URL || 'https://ltgvault.vercel.app').trim().replace(/\/$/, '');
    const accessLink = `${siteUrl}/activate.html?token=${token}`;

    // For now, just log the link (in production, send via email service like Resend, SendGrid, etc.)
    console.log('=== ACCESS LINK GENERATED ===');
    console.log('Email:', user.email);
    console.log('Link:', accessLink);
    console.log('=============================');

    // TODO: Send email with accessLink
    // For now, we'll return success and the user checks Vercel logs or we implement email later

    // If you have an email service configured, uncomment and implement:
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Your LTG Vault Access Link',
    //   html: `<p>Click here to access LTG Vault on this device:</p><p><a href="${accessLink}">${accessLink}</a></p><p>This link expires in 24 hours.</p>`
    // });

    return res.status(200).json({
      success: true,
      message: 'Access link generated. Check Vercel logs for now (email integration pending).',
      // In dev/testing, include the link. Remove in production!
      _devLink: process.env.NODE_ENV !== 'production' ? accessLink : undefined
    });

  } catch (error) {
    console.error('Send access link error:', error);
    return res.status(500).json({ error: 'Failed to send access link' });
  }
};
