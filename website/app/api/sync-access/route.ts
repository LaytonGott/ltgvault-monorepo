import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { createApiKeyForUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, subscribed_postup, subscribed_chaptergen, subscribed_threadgen')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate new API key (revokes any existing one)
    const apiKey = await createApiKeyForUser(user.id);

    if (!apiKey) {
      return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
    }

    console.log(`Access synced for ${user.email}`);

    return NextResponse.json({
      success: true,
      apiKey: apiKey,
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      }
    });

  } catch (error: any) {
    console.error('Sync access error:', error);
    return NextResponse.json({ error: 'Failed to sync access' }, { status: 500 });
  }
}
