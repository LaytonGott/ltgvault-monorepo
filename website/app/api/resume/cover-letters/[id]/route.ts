import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getUser(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');

  if (apiKey) {
    return await validateApiKey(apiKey);
  }

  return null;
}

// GET - Get single cover letter
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

    return NextResponse.json({ coverLetter: data });
  } catch (error: any) {
    console.error('Cover letter get error:', error);
    return NextResponse.json({ error: 'Failed to load cover letter' }, { status: 500 });
  }
}

// PUT - Update cover letter
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json();
    const { jobTitle, company, jobDescription, content } = body;

    const { error } = await supabase
      .from('cover_letters')
      .update({
        job_title: jobTitle,
        company: company,
        job_description: jobDescription,
        content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cover letter update error:', error);
    return NextResponse.json({ error: 'Failed to update cover letter' }, { status: 500 });
  }
}

// DELETE - Delete cover letter
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cover letter delete error:', error);
    return NextResponse.json({ error: 'Failed to delete cover letter' }, { status: 500 });
  }
}
