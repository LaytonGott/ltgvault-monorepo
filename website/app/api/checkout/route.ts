import { NextRequest, NextResponse } from 'next/server';

import { stripe, getPriceIdFromTool } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { createApiKeyForUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { email, tool } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
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
          return NextResponse.json({
            error: 'An account with this email already exists. Check your email for your API key or go to the dashboard.'
          }, { status: 400 });
        }

        // Generate new API key for existing user
        const apiKey = await createApiKeyForUser(existingUser.id);
        return NextResponse.json({
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
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }

      // Generate API key
      const apiKey = await createApiKeyForUser(newUser.id);

      return NextResponse.json({
        success: true,
        apiKey: apiKey
      });
    }

    // Handle paid tool subscription
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Validate tool name
    const validTools = ['postup', 'chaptergen', 'threadgen'];
    if (!validTools.includes(tool)) {
      return NextResponse.json({ error: 'Invalid tool name' }, { status: 400 });
    }

    const priceId = getPriceIdFromTool(tool);
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this tool' }, { status: 500 });
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

    // Redirect to the specific tool after successful payment
    const toolPages: Record<string, string> = {
      postup: '/postup.html',
      chaptergen: '/chaptergen.html',
      threadgen: '/threadgen.html'
    };
    const toolPage = toolPages[tool] || '/dashboard.html';
    const successUrl = `${siteUrl}${toolPage}?subscribed=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/pricing.html?canceled=true`;

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

    return NextResponse.json({
      success: true,
      url: session.url
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
}
