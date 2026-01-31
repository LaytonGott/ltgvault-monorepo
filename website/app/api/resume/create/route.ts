import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return await validateApiKey(apiKey);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { title = 'Untitled Resume', template = 'clean' } = body;

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        title,
        template
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ resume: data });
  } catch (error: any) {
    console.error('Resume create error:', error);
    return NextResponse.json({ error: 'Failed to create resume' }, { status: 500 });
  }
}
