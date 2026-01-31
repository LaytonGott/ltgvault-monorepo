import { NextRequest, NextResponse } from 'next/server';

import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { createApiKeyForUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const userEmail = session.metadata?.user_email || session.customer_email;

    if (!userEmail) {
      return NextResponse.json({ error: 'No email associated with session' }, { status: 400 });
    }

    // Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at, subscribed_postup, subscribed_chaptergen, subscribed_threadgen')
      .eq('email', userEmail.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate API key (revokes old one if exists)
    const apiKey = await createApiKeyForUser(user.id);

    if (!apiKey) {
      return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
    }

    console.log(`API key claimed for ${user.email} via session ${sessionId}`);

    return NextResponse.json({
      success: true,
      apiKey: apiKey,
      user: {
        email: user.email,
        createdAt: user.created_at
      },
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      }
    });

  } catch (error: any) {
    console.error('Claim key error:', error);
    return NextResponse.json({ error: 'Failed to claim API key' }, { status: 500 });
  }
}
