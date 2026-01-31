import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';

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

// GET - Get single job
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job: data });
  } catch (error: any) {
    console.error('Job get error:', error);
    return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
  }
}

// PUT - Update job
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json();
    const { company, title, url, status, notes, appliedDate, deadline } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (company !== undefined) updateData.company = company;
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (appliedDate !== undefined) updateData.applied_date = appliedDate;
    if (deadline !== undefined) updateData.deadline = deadline;

    const { error } = await supabase
      .from('job_applications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Job update error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

// DELETE - Delete job
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Job delete error:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
