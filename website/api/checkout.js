const { stripe, PRICE_IDS, getPriceIdFromTool } = require('../lib/stripe');
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
    // Check if Supabase is configured
    if (!supabase) {
      const hasUrl = !!process.env.SUPABASE_URL;
      const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
      console.error('Supabase not configured:', { hasUrl, hasKey });
      return res.status(500).json({
        error: 'Database not configured',
        debug: { hasUrl, hasKey }
      });
    }

    const { email, tool } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Handle free tier signup (no tool specified)
    if (!tool || tool === 'free') {
      // Check if user already exists
      let { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        // User exists - check if they have an API key
        const { data: existingKey } = await supabase
          .from('api_keys')
          .select('last_four')
          .eq('user_id', existingUser.id)
          .is('revoked_at', null)
          .single();

        if (existingKey) {
          return res.status(400).json({
            error: 'An account with this email already exists. Check your email for your API key or go to the dashboard.'
          });
        }

        // Generate new API key for existing user
        const apiKey = await createApiKeyForUser(existingUser.id);
        return res.status(200).json({
          success: true,
          apiKey: apiKey
        });
      }

      // Create new free user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          subscription_status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create account' });
      }

      // Generate API key
      const apiKey = await createApiKeyForUser(newUser.id);

      return res.status(200).json({
        success: true,
        apiKey: apiKey
      });
    }

    // Handle paid tool subscription
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Validate tool name
    const validTools = ['postup', 'chaptergen', 'threadgen'];
    if (!validTools.includes(tool)) {
      return res.status(400).json({ error: 'Invalid tool name' });
    }

    const priceId = getPriceIdFromTool(tool);
    if (!priceId) {
      return res.status(500).json({ error: 'Price not configured for this tool' });
    }

    // Check if user exists, create/get Stripe customer
    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    let stripeCustomerId;

    if (existingUser?.stripe_customer_id) {
      stripeCustomerId = existingUser.stripe_customer_id;
    } else {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: email.toLowerCase(),
        metadata: {
          source: 'ltgvault'
        }
      });
      stripeCustomerId = customer.id;

      // Create or update user with Stripe customer ID
      if (existingUser) {
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', existingUser.id);
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            email: email.toLowerCase(),
            stripe_customer_id: stripeCustomerId,
            subscription_status: 'active'
          })
          .select()
          .single();
        existingUser = newUser;
      }
    }

    // Create Stripe checkout session for tool subscription
    const siteUrl = (process.env.SITE_URL || 'https://ltgvault.vercel.app').trim().replace(/\/$/, '');

    const successUrl = `${siteUrl}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/pricing.html?canceled=true`;

    // Debug logging - remove after fixing
    console.log('SITE_URL:', siteUrl);
    console.log('success_url:', successUrl);
    console.log('cancel_url:', cancelUrl);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_email: email.toLowerCase(),
        tool: tool
      }
    });

    return res.status(200).json({
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session'
    });
  }
};
