const { stripe } = require('../lib/stripe');
const { supabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    let user;

    // Support email-based lookup (POST) or check query param (GET)
    const email = req.body?.email || req.query?.email;

    if (email) {
      // Look up user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      user = userData;
    } else {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user has a Stripe customer ID
    if (!user.stripe_customer_id) {
      return res.status(400).json({
        error: 'No billing account found. Please subscribe to a paid plan first.'
      });
    }

    // Create billing portal session
    const siteUrl = (process.env.SITE_URL || 'https://ltgvault.vercel.app').trim().replace(/\/$/, '');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${siteUrl}/dashboard.html`
    });

    return res.status(200).json({
      success: true,
      url: portalSession.url
    });

  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return res.status(500).json({ error: 'Failed to create billing portal session' });
  }
};
