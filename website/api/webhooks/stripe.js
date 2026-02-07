const { stripe, getToolFromPriceId, isOneTimePayment } = require('../../lib/stripe');
const { supabase } = require('../../lib/supabase');
const { createApiKeyForUser } = require('../../lib/auth');
const { debugLog } = require('../../lib/debug');

// Disable body parsing - we need raw body for webhook verification
module.exports.config = {
  api: {
    bodyParser: false
  }
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !stripe) {
    console.error('Stripe webhook not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  debugLog('stripe', 'Received webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        debugLog('stripe', 'Unhandled event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

async function handleCheckoutCompleted(session) {
  debugLog('stripe', 'Checkout completed, session:', session.id, 'mode:', session.mode);

  const customerId = session.customer;
  const subscriptionId = session.subscription;
  let userEmail = session.metadata?.user_email || session.customer_email;
  let tool = session.metadata?.tool;

  // For anonymous checkouts, we need to fetch the full session with expanded fields
  // because customer_details.email is not included in the webhook payload by default
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['customer_details', 'line_items']
    });

    // Get email from customer_details if not already set
    if (!userEmail) {
      userEmail = fullSession.customer_details?.email;
      debugLog('stripe', 'Got email from customer_details');
    }

    // Get tool from line items if not in metadata (fallback)
    if (!tool && fullSession.line_items?.data?.length > 0) {
      const priceId = fullSession.line_items.data[0].price?.id;
      tool = getToolFromPriceId(priceId);
      debugLog('stripe', 'Got tool from line_items:', tool);
    }
  } catch (e) {
    console.error('Could not fetch full session:', e.message);
  }

  // Also try customer email as fallback
  if (!userEmail && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      userEmail = customer.email;
      debugLog('stripe', 'Got email from customer object');
    } catch (e) {
      debugLog('stripe', 'Could not fetch customer email:', e.message);
    }
  }

  debugLog('stripe', 'Final values - tool:', tool, 'mode:', session.mode);

  if (!userEmail) {
    console.error('FAILED: No email found in checkout session after all attempts');
    return;
  }

  // Handle one-time payment (e.g., resumebuilder)
  // Check: mode is 'payment' AND we have a tool AND it's a one-time tool
  if (session.mode === 'payment') {
    if (tool && isOneTimePayment(tool)) {
      debugLog('stripe', 'Processing one-time purchase, tool:', tool);
      await handleOneTimePayment(session, userEmail, tool, customerId);
      return;
    } else if (!subscriptionId) {
      // It's a one-time payment but we couldn't determine the tool
      console.error('FAILED: One-time payment but could not determine tool. Tool:', tool);
      return;
    }
  }

  // Handle subscription payment
  if (!subscriptionId) {
    console.error('FAILED: No subscription ID found for subscription checkout');
    return;
  }

  // Get subscription details to determine tool if not in metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const subscribedTool = tool || getToolFromPriceId(priceId);

  if (!subscribedTool) {
    console.error('Could not determine tool from subscription');
    return;
  }

  debugLog('stripe', 'Subscription checkout completed, tool:', subscribedTool);

  // Update or create user
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail.toLowerCase())
    .single();

  // Prepare subscription update - set the specific tool as subscribed
  const subscriptionUpdate = {
    stripe_customer_id: customerId,
    subscription_status: 'active',
    updated_at: new Date().toISOString()
  };
  subscriptionUpdate[`subscribed_${subscribedTool}`] = true;
  subscriptionUpdate[`${subscribedTool}_subscription_id`] = subscriptionId;

  if (user) {
    // Update existing user
    await supabase
      .from('users')
      .update(subscriptionUpdate)
      .eq('id', user.id);
  } else {
    // Create new user
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        email: userEmail.toLowerCase(),
        ...subscriptionUpdate
      })
      .select()
      .single();
    user = newUser;
  }

  // Generate API key if user doesn't have one
  const { data: existingKey } = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .single();

  if (!existingKey) {
    await createApiKeyForUser(user.id);
    debugLog('stripe', 'Created API key for user');
  }
}

async function handleOneTimePayment(session, userEmail, tool, customerId) {
  debugLog('stripe', 'handleOneTimePayment, tool:', tool);

  // Update or create user
  let { data: user, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail.toLowerCase())
    .single();

  debugLog('stripe', 'Find user result:', user ? 'found' : 'not found');

  // Prepare update - set the specific tool as purchased (lifetime access)
  const updateData = {
    subscription_status: 'active',
    updated_at: new Date().toISOString()
  };

  // Only set stripe_customer_id if we have one
  if (customerId) {
    updateData.stripe_customer_id = customerId;
  }

  // Set the tool as subscribed (e.g., subscribed_resumebuilder = true)
  updateData[`subscribed_${tool}`] = true;

  debugLog('stripe', 'Updating user with Pro status');

  if (user) {
    // Update existing user
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
    } else {
      debugLog('stripe', 'Updated user with Pro status');
    }
  } else {
    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: userEmail.toLowerCase(),
        ...updateData
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
    } else {
      user = newUser;
      debugLog('stripe', 'Created new user with Pro status');
    }
  }

  if (!user) {
    console.error('Failed to get/create user');
    return;
  }

  // Generate API key if user doesn't have one
  const { data: existingKey } = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .single();

  if (!existingKey) {
    await createApiKeyForUser(user.id);
    debugLog('stripe', 'Created API key for new user');
  }

  debugLog('stripe', 'SUCCESS: Activated tool:', tool);
}

async function handleSubscriptionUpdated(subscription) {
  debugLog('stripe', 'Processing subscription.updated');

  const customerId = subscription.customer;
  const priceId = subscription.items.data[0]?.price?.id;
  const tool = getToolFromPriceId(priceId);
  const status = mapSubscriptionStatus(subscription.status);

  if (!tool) {
    console.error('Could not determine tool from price ID:', priceId);
    return;
  }

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  debugLog('stripe', 'Subscription updated, tool:', tool, 'status:', status);

  const updateData = {
    updated_at: new Date().toISOString()
  };
  updateData[`subscribed_${tool}`] = status === 'active';
  updateData[`${tool}_subscription_id`] = subscription.id;

  await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id);
}

async function handleSubscriptionDeleted(subscription) {
  debugLog('stripe', 'Processing subscription.deleted');

  const customerId = subscription.customer;
  const priceId = subscription.items.data[0]?.price?.id;
  const tool = getToolFromPriceId(priceId);

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  debugLog('stripe', 'Subscription canceled, tool:', tool || 'unknown');

  // If we can determine the tool, unsubscribe from it
  if (tool) {
    const updateData = {
      updated_at: new Date().toISOString()
    };
    updateData[`subscribed_${tool}`] = false;
    updateData[`${tool}_subscription_id`] = null;

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);
  }
}

async function handlePaymentFailed(invoice) {
  debugLog('stripe', 'Processing payment_failed');

  const customerId = invoice.customer;

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  debugLog('stripe', 'Payment failed for user');

  await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);
}

function mapSubscriptionStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    default:
      return 'pending';
  }
}
