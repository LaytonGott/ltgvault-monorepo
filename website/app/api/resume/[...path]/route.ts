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
  params: Promise<{ path: string[] }>;
}

async function getUser(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return await validateApiKey(apiKey);
  return null;
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return json({});
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const user = await getUser(request);
  if (!user) return json({ error: 'API key required' }, 401);

  try {
    // GET /api/resume/list - List all resumes
    if (path[0] === 'list') {
      const { data, error } = await supabase.from('resumes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      if (error) throw error;
      return json({ resumes: data || [] });
    }

    // GET /api/resume/ai-usage
    if (path[0] === 'ai-usage') {
      const stats = await getResumeAIUsageStats(user.id);
      return json({ used: stats.used, limit: stats.limit, isPro: stats.isPro, remaining: stats.limit - stats.used });
    }

    // GET /api/resume/cover-letters
    if (path[0] === 'cover-letters' && !path[1]) {
      const { data } = await supabase.from('cover_letters').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      return json({ coverLetters: data || [] });
    }

    // GET /api/resume/cover-letters/[id]
    if (path[0] === 'cover-letters' && path[1]) {
      const { data } = await supabase.from('cover_letters').select('*').eq('id', path[1]).eq('user_id', user.id).single();
      if (!data) return json({ error: 'Not found' }, 404);
      return json({ coverLetter: data });
    }

    // GET /api/resume/jobs
    if (path[0] === 'jobs' && !path[1]) {
      const { data } = await supabase.from('job_applications').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      return json({ jobs: data || [] });
    }

    // GET /api/resume/jobs/[id]
    if (path[0] === 'jobs' && path[1]) {
      const { data } = await supabase.from('job_applications').select('*').eq('id', path[1]).eq('user_id', user.id).single();
      if (!data) return json({ error: 'Not found' }, 404);
      return json({ job: data });
    }

    // GET /api/resume/[id] - Get full resume
    if (path.length === 1 && path[0] !== 'ai-usage' && path[0] !== 'cover-letters' && path[0] !== 'jobs') {
      const resumeId = path[0];
      const { data: resume } = await supabase.from('resumes').select('*').eq('id', resumeId).eq('user_id', user.id).single();
      if (!resume) return json({ error: 'Resume not found' }, 404);

      const [pi, edu, exp, skills, proj] = await Promise.all([
        supabase.from('resume_personal_info').select('*').eq('resume_id', resumeId).single(),
        supabase.from('resume_education').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_experience').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_skills').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_projects').select('*').eq('resume_id', resumeId).order('sort_order')
      ]);

      return json({ resume, personalInfo: pi.data, education: edu.data || [], experience: exp.data || [], skills: skills.data || [], projects: proj.data || [] });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e: any) {
    console.error('GET error:', e);
    return json({ error: 'Server error' }, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const user = await getUser(request);
  if (!user) return json({ error: 'API key required' }, 401);

  try {
    const body = await request.json().catch(() => ({}));

    // POST /api/resume/create - Create new resume
    if (path[0] === 'create') {
      const { title = 'Untitled Resume', template = 'clean' } = body;
      const { data, error } = await supabase.from('resumes').insert({ user_id: user.id, title, template }).select().single();
      if (error) throw error;
      return json({ resume: data });
    }

    // POST /api/resume/cover-letters
    if (path[0] === 'cover-letters' && !path[1]) {
      const { data } = await supabase.from('cover_letters').insert({ user_id: user.id, ...body }).select().single();
      return json({ coverLetter: data });
    }

    // POST /api/resume/jobs
    if (path[0] === 'jobs' && !path[1]) {
      const { data } = await supabase.from('job_applications').insert({ user_id: user.id, status: 'saved', ...body }).select().single();
      return json({ job: data });
    }

    // POST /api/resume/generate-bullets
    if (path[0] === 'generate-bullets') {
      const { description, context: ctx } = body;
      if (!description) return json({ error: 'Description required' }, 400);

      const usage = await checkResumeAIUsage(user.id);
      if (!usage.allowed) return json({ error: 'LIMIT_EXCEEDED', message: usage.message }, 429);

      await trackUsage(user.id, 'resume_bullets');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return json({ error: 'AI not configured' }, 500);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', max_tokens: 500, temperature: 0.3,
          system: 'You are a resume writer. Create professional bullet points.',
          messages: [{ role: 'user', content: `Rewrite as 2-3 resume bullets:\n${description}${ctx ? `\nContext: ${ctx}` : ''}\n\nReturn only bullets starting with -.` }]
        })
      });

      if (!res.ok) return json({ error: 'AI error' }, 500);
      const data = await res.json();
      return json({ success: true, bullets: data.content?.[0]?.text?.trim() });
    }

    // POST /api/resume/generate-summary
    if (path[0] === 'generate-summary') {
      const usage = await checkResumeAIUsage(user.id);
      if (!usage.allowed) return json({ error: 'LIMIT_EXCEEDED', message: usage.message }, 429);

      await trackUsage(user.id, 'resume_summary');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return json({ error: 'AI not configured' }, 500);

      const { education = [], experience = [], skills = [] } = body;
      const edu = education.map((e: any) => e.school_name).join(', ') || 'None';
      const exp = experience.map((e: any) => `${e.job_title} at ${e.company_name}`).join('; ') || 'None';
      const sk = skills.map((s: any) => s.skill_name).filter(Boolean).join(', ') || 'None';

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', max_tokens: 300, temperature: 0.4,
          system: 'Write a 2-3 sentence professional summary for a young person.',
          messages: [{ role: 'user', content: `Education: ${edu}\nExperience: ${exp}\nSkills: ${sk}\n\nWrite only the summary.` }]
        })
      });

      if (!res.ok) return json({ error: 'AI error' }, 500);
      const data = await res.json();
      return json({ success: true, summary: data.content?.[0]?.text?.trim() });
    }

    // POST /api/resume/generate-cover-letter
    if (path[0] === 'generate-cover-letter') {
      const { jobTitle, company, resumeId } = body;
      if (!jobTitle || !company) return json({ error: 'Job title and company required' }, 400);

      const usage = await checkResumeAIUsage(user.id);
      if (!usage.allowed) return json({ error: 'LIMIT_EXCEEDED', message: usage.message }, 429);

      await trackUsage(user.id, 'cover_letter');

      let name = '[Your Name]';
      if (resumeId) {
        const { data: pi } = await supabase.from('resume_personal_info').select('first_name, last_name').eq('resume_id', resumeId).single();
        if (pi) name = [pi.first_name, pi.last_name].filter(Boolean).join(' ') || name;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return json({ error: 'AI not configured' }, 500);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', max_tokens: 1000, temperature: 0.5,
          system: 'Write a natural cover letter for a young person. Avoid clichés.',
          messages: [{ role: 'user', content: `Job: ${jobTitle} at ${company}\n\nWrite a cover letter under 250 words. End with "Sincerely," and "${name}".` }]
        })
      });

      if (!res.ok) return json({ error: 'AI error' }, 500);
      const data = await res.json();
      return json({ success: true, coverLetter: data.content?.[0]?.text?.trim() });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e: any) {
    console.error('POST error:', e);
    return json({ error: 'Server error' }, 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const user = await getUser(request);
  if (!user) return json({ error: 'API key required' }, 401);

  try {
    const body = await request.json();

    // PUT /api/resume/cover-letters/[id]
    if (path[0] === 'cover-letters' && path[1]) {
      await supabase.from('cover_letters').update({ ...body, updated_at: new Date().toISOString() }).eq('id', path[1]).eq('user_id', user.id);
      return json({ success: true });
    }

    // PUT /api/resume/jobs/[id]
    if (path[0] === 'jobs' && path[1]) {
      await supabase.from('job_applications').update({ ...body, updated_at: new Date().toISOString() }).eq('id', path[1]).eq('user_id', user.id);
      return json({ success: true });
    }

    // PUT /api/resume/[id]
    if (path.length === 1) {
      const resumeId = path[0];
      const { section, data } = body;

      if (!section) {
        await supabase.from('resumes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', resumeId).eq('user_id', user.id);
        return json({ success: true });
      }

      const tables: Record<string, string> = {
        personalInfo: 'resume_personal_info', education: 'resume_education',
        experience: 'resume_experience', skills: 'resume_skills', projects: 'resume_projects'
      };
      const table = tables[section];
      if (!table) return json({ error: 'Invalid section' }, 400);

      if (section === 'personalInfo') {
        const { data: existing } = await supabase.from(table).select('id').eq('resume_id', resumeId).single();
        if (existing) {
          await supabase.from(table).update({ ...data, updated_at: new Date().toISOString() }).eq('resume_id', resumeId);
        } else {
          await supabase.from(table).insert({ resume_id: resumeId, ...data });
        }
      } else if (data.id) {
        await supabase.from(table).update({ ...data, updated_at: new Date().toISOString() }).eq('id', data.id);
      } else {
        const result = await supabase.from(table).insert({ resume_id: resumeId, ...data }).select().single();
        return json({ success: true, item: result.data });
      }

      await supabase.from('resumes').update({ updated_at: new Date().toISOString() }).eq('id', resumeId);
      return json({ success: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e: any) {
    console.error('PUT error:', e);
    return json({ error: 'Server error' }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const user = await getUser(request);
  if (!user) return json({ error: 'API key required' }, 401);

  try {
    // DELETE /api/resume/cover-letters/[id]
    if (path[0] === 'cover-letters' && path[1]) {
      await supabase.from('cover_letters').delete().eq('id', path[1]).eq('user_id', user.id);
      return json({ success: true });
    }

    // DELETE /api/resume/jobs/[id]
    if (path[0] === 'jobs' && path[1]) {
      await supabase.from('job_applications').delete().eq('id', path[1]).eq('user_id', user.id);
      return json({ success: true });
    }

    // DELETE /api/resume/[id]
    if (path.length === 1) {
      const body = await request.json().catch(() => ({}));
      if (body.section && body.itemId) {
        const tables: Record<string, string> = { education: 'resume_education', experience: 'resume_experience', skills: 'resume_skills', projects: 'resume_projects' };
        const table = tables[body.section];
        if (table) await supabase.from(table).delete().eq('id', body.itemId);
        return json({ success: true });
      }
      await supabase.from('resumes').delete().eq('id', path[0]).eq('user_id', user.id);
      return json({ success: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e: any) {
    console.error('DELETE error:', e);
    return json({ error: 'Server error' }, 500);
  }
}

async function trackUsage(userId: string, feature: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('ai_usage').select('*').eq('user_id', userId).eq('feature', feature).eq('usage_date', today).single();
  if (existing) {
    await supabase.from('ai_usage').update({ usage_count: existing.usage_count + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('ai_usage').insert({ user_id: userId, feature, usage_date: today, usage_count: 1 });
  }
}
