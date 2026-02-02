// Account API - lookup and send-access-link consolidated
const crypto = require('crypto');
const { supabase } = require('../lib/supabase');

const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'ltgv-access-token-secret';

function generateAccessToken(userId, email) {
  const expires = Date.now() + (24 * 60 * 60 * 1000);
  const payload = `${userId}:${email}:${expires}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, action } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const searchEmail = email.toLowerCase().trim();

    // SEND ACCESS LINK
    if (action === 'send-link') {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', searchEmail)
        .single();

      if (userError || !user) return res.status(404).json({ error: 'No account found with this email' });

      const token = generateAccessToken(user.id, user.email);
      const siteUrl = (process.env.SITE_URL || 'https://ltgvault.com').trim().replace(/\/$/, '');
      const accessLink = `${siteUrl}/activate.html?token=${token}`;

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) return res.status(500).json({ error: 'Email service not configured' });

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'LTG Vault <noreply@ltgvault.com>',
          to: user.email,
          subject: 'Your LTG Vault Access Link',
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c9a227;">LTG Vault Access Link</h2>
            <p>Click the button below to access your LTG Vault tools on this device:</p>
            <p style="margin: 24px 0;"><a href="${accessLink}" style="background: #c9a227; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Activate Access</a></p>
            <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${accessLink}">${accessLink}</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
          </div>`
        })
      });

      if (!emailResponse.ok) return res.status(500).json({ error: 'Failed to send email' });
      return res.status(200).json({ success: true, message: 'Access link sent to your email.' });
    }

    // LOOKUP (default action)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', searchEmail)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'No account found with this email address.' });
    }

    // Get API key info
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

    const usage = {};
    const tools = ['postup', 'chaptergen', 'threadgen'];
    const freeLimits = { postup: 3, chaptergen: 1, threadgen: 3 };

    tools.forEach(tool => {
      const toolUsage = usageData?.find(u => u.tool === tool);
      const used = toolUsage?.count || 0;
      const isSubscribed = user[`subscribed_${tool}`] || false;
      usage[tool] = { used, limit: isSubscribed ? 'unlimited' : freeLimits[tool], subscribed: isSubscribed };
    });

    // Resume Builder stats
    const isResumePro = user.subscribed_resumebuilder || false;
    const { count: resumeCount } = await supabase.from('resumes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

    let resumeAiUsed = 0;
    if (isResumePro) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthlyUsage } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter'])
        .gte('usage_date', startOfMonth.toISOString().split('T')[0]);
      resumeAiUsed = (monthlyUsage || []).reduce((sum, row) => sum + (row.usage_count || 0), 0);
    } else {
      const { data: totalUsage } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter']);
      resumeAiUsed = (totalUsage || []).reduce((sum, row) => sum + (row.usage_count || 0), 0);
    }

    usage.resumebuilder = { resumes: resumeCount || 0, aiUsed: resumeAiUsed, aiLimit: isResumePro ? 100 : 5, subscribed: isResumePro };

    return res.status(200).json({
      success: true,
      user: { email: user.email, createdAt: user.created_at, subscribed_resumebuilder: isResumePro },
      apiKey: keyData ? { prefix: keyData.key_prefix, lastFour: keyData.last_four, maskedKey: `${keyData.key_prefix}${'*'.repeat(44)}${keyData.last_four}`, createdAt: keyData.created_at, lastUsedAt: keyData.last_used_at } : null,
      subscriptions: { postup: user.subscribed_postup || false, chaptergen: user.subscribed_chaptergen || false, threadgen: user.subscribed_threadgen || false, resumebuilder: isResumePro },
      usage
    });
  } catch (error) {
    console.error('Account API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
