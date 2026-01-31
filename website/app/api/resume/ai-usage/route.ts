import { NextRequest, NextResponse } from 'next/server';

import { validateApiKey } from '@/lib/auth';
import { getResumeAIUsageStats } from '@/lib/resume-ai-usage';

async function getUser(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');

  if (apiKey) {
    return await validateApiKey(apiKey);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const stats = await getResumeAIUsageStats(user.id);

    return NextResponse.json({
      used: stats.used,
      limit: stats.limit,
      isPro: stats.isPro,
      remaining: stats.limit - stats.used
    });
  } catch (error: any) {
    console.error('AI usage stats error:', error);
    return NextResponse.json({ error: 'Failed to get usage stats' }, { status: 500 });
  }
}
