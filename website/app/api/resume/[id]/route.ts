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

async function authenticateAndGetResume(request: NextRequest, resumeId: string) {
  const user = await getUser(request);

  if (!user) {
    return { error: NextResponse.json({ error: 'API key required' }, { status: 401 }) };
  }

  // Verify user owns this resume
  const { data: resume, error: resumeError } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .eq('user_id', user.id)
    .single();

  if (resumeError || !resume) {
    return { error: NextResponse.json({ error: 'Resume not found' }, { status: 404 }) };
  }

  return { user, resume };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: resumeId } = await context.params;
    const auth = await authenticateAndGetResume(request, resumeId);

    if ('error' in auth) {
      return auth.error;
    }

    const { resume } = auth;

    // Load all sections in parallel
    const [personalInfo, education, experience, skills, projects] = await Promise.all([
      supabase.from('resume_personal_info').select('*').eq('resume_id', resumeId).single(),
      supabase.from('resume_education').select('*').eq('resume_id', resumeId).order('sort_order'),
      supabase.from('resume_experience').select('*').eq('resume_id', resumeId).order('sort_order'),
      supabase.from('resume_skills').select('*').eq('resume_id', resumeId).order('sort_order'),
      supabase.from('resume_projects').select('*').eq('resume_id', resumeId).order('sort_order')
    ]);

    return NextResponse.json({
      resume,
      personalInfo: personalInfo.data,
      education: education.data || [],
      experience: experience.data || [],
      skills: skills.data || [],
      projects: projects.data || []
    });
  } catch (error: any) {
    console.error('Resume GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: resumeId } = await context.params;
    const auth = await authenticateAndGetResume(request, resumeId);

    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json();
    const { section, data } = body;

    if (!section) {
      // Update resume itself
      const { error } = await supabase
        .from('resumes')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', resumeId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Update specific section
    const tableMap: Record<string, string> = {
      personalInfo: 'resume_personal_info',
      education: 'resume_education',
      experience: 'resume_experience',
      skills: 'resume_skills',
      projects: 'resume_projects'
    };

    const table = tableMap[section];
    if (!table) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    // Handle personal info (single record)
    if (section === 'personalInfo') {
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('resume_id', resumeId)
        .single();

      if (existing) {
        await supabase
          .from(table)
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('resume_id', resumeId);
      } else {
        await supabase
          .from(table)
          .insert({ resume_id: resumeId, ...data });
      }
    } else {
      // Handle array sections (education, experience, etc.)
      if (data.id) {
        // Update existing
        const { id, ...updateData } = data;
        await supabase
          .from(table)
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id);
      } else {
        // Insert new
        const result = await supabase
          .from(table)
          .insert({ resume_id: resumeId, ...data })
          .select()
          .single();

        // Return the new item with its ID
        return NextResponse.json({ success: true, item: result.data });
      }
    }

    // Update resume timestamp
    await supabase
      .from('resumes')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', resumeId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resume PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: resumeId } = await context.params;
    const auth = await authenticateAndGetResume(request, resumeId);

    if ('error' in auth) {
      return auth.error;
    }

    const body = await request.json().catch(() => ({}));
    const { section, itemId } = body;

    if (section && itemId) {
      // Delete specific item from section
      const tableMap: Record<string, string> = {
        education: 'resume_education',
        experience: 'resume_experience',
        skills: 'resume_skills',
        projects: 'resume_projects'
      };

      const table = tableMap[section];
      if (!table) {
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
      }

      await supabase.from(table).delete().eq('id', itemId);
      return NextResponse.json({ success: true });
    }

    // Delete entire resume (cascades to all sections)
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resume DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
