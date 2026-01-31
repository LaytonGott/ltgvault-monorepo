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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ resumes: data || [] });
  } catch (error: any) {
    console.error('Resume list error:', error);
    return NextResponse.json({ error: 'Failed to load resumes' }, { status: 500 });
  }
}
