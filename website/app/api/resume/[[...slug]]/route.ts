import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';
import { checkResumeAIUsage, getResumeAIUsageStats } from '@/lib/resume-ai-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

interface RouteContext {
  params: Promise<{ slug?: string[] }>;
}

async function getUser(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return await validateApiKey(apiKey);
  }
  return null;
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return jsonResponse({});
}

// Main handler
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug = [] } = await context.params;
  const path = slug.join('/');

  const user = await getUser(request);
  if (!user) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  try {
    // GET /api/resume - List resumes
    if (path === '') {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return jsonResponse({ resumes: data || [] });
    }

    // GET /api/resume/ai-usage
    if (path === 'ai-usage') {
      const stats = await getResumeAIUsageStats(user.id);
      return jsonResponse({
        used: stats.used,
        limit: stats.limit,
        isPro: stats.isPro,
        remaining: stats.limit - stats.used
      });
    }

    // GET /api/resume/cover-letters
    if (path === 'cover-letters') {
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return jsonResponse({ coverLetters: data || [] });
    }

    // GET /api/resume/cover-letters/[id]
    if (slug[0] === 'cover-letters' && slug[1]) {
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', slug[1])
        .eq('user_id', user.id)
        .single();
      if (error || !data) return jsonResponse({ error: 'Cover letter not found' }, 404);
      return jsonResponse({ coverLetter: data });
    }

    // GET /api/resume/jobs
    if (path === 'jobs') {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return jsonResponse({ jobs: data || [] });
    }

    // GET /api/resume/jobs/[id]
    if (slug[0] === 'jobs' && slug[1]) {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', slug[1])
        .eq('user_id', user.id)
        .single();
      if (error || !data) return jsonResponse({ error: 'Job not found' }, 404);
      return jsonResponse({ job: data });
    }

    // GET /api/resume/[id] - Get full resume
    if (slug.length === 1) {
      const resumeId = slug[0];
      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .single();
      if (resumeError || !resume) return jsonResponse({ error: 'Resume not found' }, 404);

      const [personalInfo, education, experience, skills, projects] = await Promise.all([
        supabase.from('resume_personal_info').select('*').eq('resume_id', resumeId).single(),
        supabase.from('resume_education').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_experience').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_skills').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_projects').select('*').eq('resume_id', resumeId).order('sort_order')
      ]);

      return jsonResponse({
        resume,
        personalInfo: personalInfo.data,
        education: education.data || [],
        experience: experience.data || [],
        skills: skills.data || [],
        projects: projects.data || []
      });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error: any) {
    console.error('Resume GET error:', error);
    return jsonResponse({ error: 'Server error' }, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug = [] } = await context.params;
  const path = slug.join('/');

  const user = await getUser(request);
  if (!user) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  try {
    const body = await request.json().catch(() => ({}));

    // POST /api/resume - Create resume
    if (path === '') {
      const { title = 'Untitled Resume', template = 'clean' } = body;
      const { data, error } = await supabase
        .from('resumes')
        .insert({ user_id: user.id, title, template })
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ resume: data });
    }

    // POST /api/resume/cover-letters
    if (path === 'cover-letters') {
      const { job_title, company, content } = body;
      const { data, error } = await supabase
        .from('cover_letters')
        .insert({ user_id: user.id, job_title, company, content })
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ coverLetter: data });
    }

    // POST /api/resume/jobs
    if (path === 'jobs') {
      const { company, position, status = 'saved', notes, job_url } = body;
      const { data, error } = await supabase
        .from('job_applications')
        .insert({ user_id: user.id, company, position, status, notes, job_url })
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ job: data });
    }

    // POST /api/resume/generate-bullets
    if (path === 'generate-bullets') {
      return handleGenerateBullets(user, body);
    }

    // POST /api/resume/generate-summary
    if (path === 'generate-summary') {
      return handleGenerateSummary(user, body);
    }

    // POST /api/resume/generate-cover-letter
    if (path === 'generate-cover-letter') {
      return handleGenerateCoverLetter(user, body);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error: any) {
    console.error('Resume POST error:', error);
    return jsonResponse({ error: 'Server error' }, 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug = [] } = await context.params;

  const user = await getUser(request);
  if (!user) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  try {
    const body = await request.json();

    // PUT /api/resume/cover-letters/[id]
    if (slug[0] === 'cover-letters' && slug[1]) {
      const { data: existing } = await supabase
        .from('cover_letters')
        .select('id')
        .eq('id', slug[1])
        .eq('user_id', user.id)
        .single();
      if (!existing) return jsonResponse({ error: 'Cover letter not found' }, 404);

      const { error } = await supabase
        .from('cover_letters')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', slug[1]);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // PUT /api/resume/jobs/[id]
    if (slug[0] === 'jobs' && slug[1]) {
      const { data: existing } = await supabase
        .from('job_applications')
        .select('id')
        .eq('id', slug[1])
        .eq('user_id', user.id)
        .single();
      if (!existing) return jsonResponse({ error: 'Job not found' }, 404);

      const { error } = await supabase
        .from('job_applications')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', slug[1]);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // PUT /api/resume/[id]
    if (slug.length === 1) {
      const resumeId = slug[0];
      const { data: resume } = await supabase
        .from('resumes')
        .select('id')
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .single();
      if (!resume) return jsonResponse({ error: 'Resume not found' }, 404);

      const { section, data } = body;

      if (!section) {
        const { error } = await supabase
          .from('resumes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', resumeId);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      const tableMap: Record<string, string> = {
        personalInfo: 'resume_personal_info',
        education: 'resume_education',
        experience: 'resume_experience',
        skills: 'resume_skills',
        projects: 'resume_projects'
      };

      const table = tableMap[section];
      if (!table) return jsonResponse({ error: 'Invalid section' }, 400);

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
        if (data.id) {
          const { id, ...updateData } = data;
          await supabase
            .from(table)
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id);
        } else {
          const result = await supabase
            .from(table)
            .insert({ resume_id: resumeId, ...data })
            .select()
            .single();
          return jsonResponse({ success: true, item: result.data });
        }
      }

      await supabase
        .from('resumes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', resumeId);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error: any) {
    console.error('Resume PUT error:', error);
    return jsonResponse({ error: 'Server error' }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug = [] } = await context.params;

  const user = await getUser(request);
  if (!user) {
    return jsonResponse({ error: 'API key required' }, 401);
  }

  try {
    // DELETE /api/resume/cover-letters/[id]
    if (slug[0] === 'cover-letters' && slug[1]) {
      const { error } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', slug[1])
        .eq('user_id', user.id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // DELETE /api/resume/jobs/[id]
    if (slug[0] === 'jobs' && slug[1]) {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', slug[1])
        .eq('user_id', user.id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    // DELETE /api/resume/[id]
    if (slug.length === 1) {
      const resumeId = slug[0];
      const body = await request.json().catch(() => ({}));
      const { section, itemId } = body;

      if (section && itemId) {
        const tableMap: Record<string, string> = {
          education: 'resume_education',
          experience: 'resume_experience',
          skills: 'resume_skills',
          projects: 'resume_projects'
        };
        const table = tableMap[section];
        if (!table) return jsonResponse({ error: 'Invalid section' }, 400);
        await supabase.from(table).delete().eq('id', itemId);
        return jsonResponse({ success: true });
      }

      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId)
        .eq('user_id', user.id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error: any) {
    console.error('Resume DELETE error:', error);
    return jsonResponse({ error: 'Server error' }, 500);
  }
}

// AI Generation helpers
async function trackAIUsage(userId: string, feature: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('usage_date', today)
    .single();

  if (existing) {
    await supabase
      .from('ai_usage')
      .update({ usage_count: existing.usage_count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_usage').insert({
      user_id: userId,
      feature,
      usage_date: today,
      usage_count: 1
    });
  }
}

async function handleGenerateBullets(user: any, body: any) {
  const { description, context } = body;

  if (!description || description.trim().length === 0) {
    return jsonResponse({ error: 'Description is required' }, 400);
  }

  const usageCheck = await checkResumeAIUsage(user.id);
  if (!usageCheck.allowed) {
    return jsonResponse({
      error: 'LIMIT_EXCEEDED',
      message: usageCheck.message,
      usage: { used: usageCheck.used, limit: usageCheck.limit, isPro: usageCheck.isPro }
    }, 429);
  }

  await trackAIUsage(user.id, 'resume_bullets');

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return jsonResponse({ error: 'AI service not configured' }, 500);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.3,
      system: `You are a professional resume writer helping a young person with little to no work experience create their first resume. Use strong action verbs, quantify when possible, keep bullets concise.`,
      messages: [{ role: 'user', content: `Take this description and rewrite it as 2-3 professional resume bullet points.${context ? `\n\nContext: ${context}` : ''}\n\nDescription: ${description}\n\nReturn only the bullet points, one per line, starting with a dash (-).` }]
    })
  });

  if (!response.ok) return jsonResponse({ error: 'Failed to generate bullets' }, 500);
  const data = await response.json();
  return jsonResponse({ success: true, bullets: data.content?.[0]?.text?.trim() });
}

async function handleGenerateSummary(user: any, body: any) {
  const { education, experience, skills, projects } = body;

  const usageCheck = await checkResumeAIUsage(user.id);
  if (!usageCheck.allowed) {
    return jsonResponse({
      error: 'LIMIT_EXCEEDED',
      message: usageCheck.message,
      usage: { used: usageCheck.used, limit: usageCheck.limit, isPro: usageCheck.isPro }
    }, 429);
  }

  await trackAIUsage(user.id, 'resume_summary');

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return jsonResponse({ error: 'AI service not configured' }, 500);

  const eduText = education?.map((e: any) => `${e.degree || 'Degree'} at ${e.school_name || 'School'}`).join('; ') || 'None';
  const expText = experience?.map((e: any) => `${e.job_title || 'Role'} at ${e.company_name || 'Company'}`).join('; ') || 'None';
  const skillsText = skills?.filter((s: any) => s.skill_name).map((s: any) => s.skill_name).join(', ') || 'None';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.4,
      system: `You are helping a young person write their first resume. Write a professional summary that highlights their strengths without overselling.`,
      messages: [{ role: 'user', content: `Write a 2-3 sentence professional summary based on:\nEducation: ${eduText}\nExperience: ${expText}\nSkills: ${skillsText}\n\nWrite only the summary paragraph.` }]
    })
  });

  if (!response.ok) return jsonResponse({ error: 'Failed to generate summary' }, 500);
  const data = await response.json();
  return jsonResponse({ success: true, summary: data.content?.[0]?.text?.trim() });
}

async function handleGenerateCoverLetter(user: any, body: any) {
  const { jobTitle, company, jobDescription, resumeId } = body;

  if (!jobTitle || !company) {
    return jsonResponse({ error: 'Job title and company are required' }, 400);
  }

  const usageCheck = await checkResumeAIUsage(user.id);
  if (!usageCheck.allowed) {
    return jsonResponse({
      error: 'LIMIT_EXCEEDED',
      message: usageCheck.message,
      usage: { used: usageCheck.used, limit: usageCheck.limit, isPro: usageCheck.isPro }
    }, 429);
  }

  await trackAIUsage(user.id, 'cover_letter');

  let resumeData = '';
  let candidateName = '[Your Name]';
  if (resumeId) {
    const [pi, edu, exp, skills] = await Promise.all([
      supabase.from('resume_personal_info').select('*').eq('resume_id', resumeId).single(),
      supabase.from('resume_education').select('*').eq('resume_id', resumeId),
      supabase.from('resume_experience').select('*').eq('resume_id', resumeId),
      supabase.from('resume_skills').select('*').eq('resume_id', resumeId)
    ]);
    if (pi.data) candidateName = [pi.data.first_name, pi.data.last_name].filter(Boolean).join(' ') || candidateName;
    resumeData = `Name: ${candidateName}\nEducation: ${edu.data?.map((e: any) => e.school_name).join(', ') || 'None'}\nExperience: ${exp.data?.map((e: any) => `${e.job_title} at ${e.company_name}`).join('; ') || 'None'}`;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return jsonResponse({ error: 'AI service not configured' }, 500);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.5,
      system: `You are helping a young person write a cover letter for one of their first jobs. Write naturally, not corporate. Avoid clichés.`,
      messages: [{ role: 'user', content: `Write a cover letter for:\nJob: ${jobTitle} at ${company}\n${jobDescription ? `Description: ${jobDescription}` : ''}\n${resumeData}\n\nKeep under 250 words. End with "Sincerely," and "${candidateName}". Start with "Dear Hiring Manager,"` }]
    })
  });

  if (!response.ok) return jsonResponse({ error: 'Failed to generate cover letter' }, 500);
  const data = await response.json();
  return jsonResponse({ success: true, coverLetter: data.content?.[0]?.text?.trim() });
}
