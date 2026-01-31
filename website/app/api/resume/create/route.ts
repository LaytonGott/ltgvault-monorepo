import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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
