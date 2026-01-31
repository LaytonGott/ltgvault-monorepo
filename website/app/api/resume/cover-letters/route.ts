import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// GET - List all cover letters
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ coverLetters: data || [] });
  } catch (error: any) {
    console.error('Cover letters list error:', error);
    return NextResponse.json({ error: 'Failed to load cover letters' }, { status: 500 });
  }
}

// POST - Create new cover letter
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json();
    const { resumeId, jobTitle, company, jobDescription, content } = body;

    const { data, error } = await supabase
      .from('cover_letters')
      .insert({
        user_id: user.id,
        resume_id: resumeId || null,
        job_title: jobTitle || '',
        company: company || '',
        job_description: jobDescription || '',
        content: content || ''
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ coverLetter: data });
  } catch (error: any) {
    console.error('Cover letter create error:', error);
    return NextResponse.json({ error: 'Failed to create cover letter' }, { status: 500 });
  }
}
