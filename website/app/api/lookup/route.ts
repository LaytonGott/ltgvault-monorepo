import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const searchEmail = email.toLowerCase().trim();

    // Look up user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', searchEmail)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        error: 'NOT_FOUND',
        message: 'No account found with this email address.'
      }, { status: 404 });
    }

    // Get user's API key
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

    // Build usage object
    const usage: Record<string, any> = {};
    const tools = ['postup', 'chaptergen', 'threadgen'];
    const freeLimits: Record<string, number> = { postup: 3, chaptergen: 1, threadgen: 3 };

    tools.forEach(tool => {
      const toolUsage = usageData?.find((u: any) => u.tool === tool);
      const used = toolUsage?.count || 0;
      const subscriptionField = `subscribed_${tool}`;
      const isSubscribed = user[subscriptionField] || false;

      usage[tool] = {
        used: used,
        limit: isSubscribed ? 'unlimited' : freeLimits[tool],
        subscribed: isSubscribed
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        createdAt: user.created_at
      },
      apiKey: keyData ? {
        prefix: keyData.key_prefix,
        lastFour: keyData.last_four,
        maskedKey: `${keyData.key_prefix}${'*'.repeat(44)}${keyData.last_four}`,
        createdAt: keyData.created_at,
        lastUsedAt: keyData.last_used_at
      } : null,
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false
      },
      usage: usage
    });

  } catch (error: any) {
    console.error('Lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up account' }, { status: 500 });
  }
}
