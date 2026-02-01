const { stripe, PRICE_IDS, getPriceIdFromTool, isOneTimePayment } = require('../lib/stripe');
const { supabase } = require('../lib/supabase');
const { createApiKeyForUser, validateApiKey } = require('../lib/auth');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
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

    let { email, tool } = req.body;

    // If API key is provided, get user email from it (for logged-in users upgrading)
    const apiKey = req.headers['x-api-key'];
    let existingUser = null;
    if (apiKey) {
      const user = await validateApiKey(apiKey);
      if (user) {
        email = user.email;
        existingUser = user;
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Handle free tier signup (no tool specified) - requires email
    if (!tool || tool === 'free') {
      if (!email) {
        return res.status(400).json({ error: 'Email is required for free signup' });
      }
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
    const validTools = ['postup', 'chaptergen', 'threadgen', 'resumebuilder'];
    if (!validTools.includes(tool)) {
      return res.status(400).json({ error: 'Invalid tool name' });
    }

    const priceId = getPriceIdFromTool(tool);
    if (!priceId) {
      return res.status(500).json({ error: 'Price not configured for this tool' });
    }

    // Create Stripe checkout session for tool subscription
    const siteUrl = (process.env.SITE_URL || 'https://ltgvault.vercel.app').trim().replace(/\/$/, '');

    // Redirect to the specific tool after successful payment
    const toolPages = {
      postup: '/postup.html',
      chaptergen: '/chaptergen.html',
      threadgen: '/threadgen.html',
      resumebuilder: '/resume'
    };
    const toolPage = toolPages[tool] || '/dashboard.html';
    const isOneTime = isOneTimePayment(tool);
    const successParam = isOneTime ? 'purchased' : 'subscribed';
    const successUrl = `${siteUrl}${toolPage}?${successParam}=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/pricing.html?canceled=true`;

    // Build checkout session config
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: isOneTime ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tool: tool
      }
    };

    // If user is logged in with email, attach/create Stripe customer
    if (email) {
      // Check if user exists in database
      if (!existingUser) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();
        existingUser = dbUser;
      }

      let stripeCustomerId;
      if (existingUser?.stripe_customer_id) {
        stripeCustomerId = existingUser.stripe_customer_id;
      } else {
        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: email.toLowerCase(),
          metadata: { source: 'ltgvault' }
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

      sessionConfig.customer = stripeCustomerId;
      sessionConfig.metadata.user_email = email.toLowerCase();
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

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
