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

// GET - List all job applications
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ jobs: data || [] });
  } catch (error: any) {
    console.error('Jobs list error:', error);
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}

// POST - Create new job application
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json();
    const { company, title, url, status, notes, appliedDate, deadline, resumeId } = body;

    if (!company || !title) {
      return NextResponse.json({ error: 'Company and title are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        user_id: user.id,
        resume_id: resumeId || null,
        company,
        title,
        url: url || null,
        status: status || 'saved',
        notes: notes || null,
        applied_date: appliedDate || null,
        deadline: deadline || null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ job: data });
  } catch (error: any) {
    console.error('Job create error:', error);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
