import { NextRequest, NextResponse } from 'next/server';

import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    let email: string | null = null;

    // Support email from query param (GET) or body (POST)
    if (request.method === 'GET') {
      email = request.nextUrl.searchParams.get('email');
    } else {
      const body = await request.json().catch(() => ({}));
      email = body.email;
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Look up user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a Stripe customer ID
    if (!user.stripe_customer_id) {
      return NextResponse.json({
        error: 'No billing account found. Please subscribe to a paid plan first.'
      }, { status: 400 });
    }

    // Create billing portal session
    const siteUrl = (process.env.SITE_URL || 'https://ltgvault.vercel.app').trim().replace(/\/$/, '');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${siteUrl}/dashboard.html`
    });

    return NextResponse.json({
      success: true,
      url: portalSession.url
    });

  } catch (error: any) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
