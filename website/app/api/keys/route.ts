import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { authenticateRequest, createApiKeyForUser, validateApiKey } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Authenticate using the auth module
    const user = await validateApiKey(apiKey);

    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('key_prefix, last_four, created_at, last_used_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'No active API key found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      key: {
        prefix: keyData.key_prefix,
        lastFour: keyData.last_four,
        maskedKey: `${keyData.key_prefix}${'*'.repeat(44)}${keyData.last_four}`,
        createdAt: keyData.created_at,
        lastUsedAt: keyData.last_used_at
      },
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      }
    });

  } catch (error: any) {
    console.error('Error fetching API key info:', error);
    return NextResponse.json({ error: 'Failed to fetch API key info' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const newApiKey = await createApiKeyForUser(user.id);

    if (!newApiKey) {
      return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      apiKey: newApiKey,
      lastFour: newApiKey.slice(-4),
      message: 'New API key generated. Your old key has been revoked. Save this key - it will not be shown again.'
    });

  } catch (error: any) {
    console.error('Error generating API key:', error);
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}
