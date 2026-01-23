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

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LTG Vault <noreply@ltgvault.com>',
        to: user.email,
        subject: 'Your LTG Vault Access Link',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c9a227;">LTG Vault Access Link</h2>
            <p>Click the button below to access your LTG Vault tools on this device:</p>
            <p style="margin: 24px 0;">
              <a href="${accessLink}" style="background: #c9a227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Activate Access</a>
            </p>
            <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${accessLink}">${accessLink}</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #999; font-size: 12px;">If you didn't request this link, you can safely ignore this email.</p>
          </div>
        `
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailResult);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    console.log('Access link email sent to:', user.email);

    return res.status(200).json({
      success: true,
      message: 'Access link sent to your email.'
    });

  } catch (error) {
    console.error('Send access link error:', error);
    return res.status(500).json({ error: 'Failed to send access link' });
  }
};
