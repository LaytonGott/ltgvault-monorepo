// Resume API - Pages Router catch-all handler
const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');
const { checkResumeAIUsage, getResumeAIUsageStats } = require('../../lib/resume-ai-usage');
const { getResumeProStatus, canCreateResume, canCreateJob, canUseTemplate } = require('../../lib/resume-pro');

async function getUser(req) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return await validateApiKey(apiKey);
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const user = await getUser(req);
  if (!user) {
    console.log('Resume API: No valid user from API key');
    return res.status(401).json({ error: 'API key required' });
  }

  const path = req.query.path || [];
  const segment = path[0];
  const id = path[1];

  console.log('Resume API:', req.method, 'path:', path, 'segment:', segment);

  try {
    // GET requests
    if (req.method === 'GET') {
      if (segment === 'list') {
        const { data, error } = await supabase.from('resumes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
        if (error) {
          console.error('Resume list query error:', error);
          return res.status(500).json({ error: 'Database error', message: error.message });
        }
        return res.status(200).json({ resumes: data || [] });
      }

      if (segment === 'ai-usage') {
        const stats = await getResumeAIUsageStats(user.id);
        return res.status(200).json({ used: stats.used, limit: stats.limit, isPro: stats.isPro, remaining: stats.limit - stats.used });
      }

      if (segment === 'pro-status') {
        const status = await getResumeProStatus(user.id);
        return res.status(200).json(status);
      }

      if (segment === 'cover-letters' && !id) {
        const { data } = await supabase.from('cover_letters').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
        return res.status(200).json({ coverLetters: data || [] });
      }

      if (segment === 'cover-letters' && id) {
        const { data } = await supabase.from('cover_letters').select('*').eq('id', id).eq('user_id', user.id).single();
        if (!data) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ coverLetter: data });
      }

      if (segment === 'jobs' && !id) {
        const { data } = await supabase.from('job_applications').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
        return res.status(200).json({ jobs: data || [] });
      }

      if (segment === 'jobs' && id) {
        const { data } = await supabase.from('job_applications').select('*').eq('id', id).eq('user_id', user.id).single();
        if (!data) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ job: data });
      }

      // GET /api/resume/[id]
      if (path.length === 1 && !['list', 'ai-usage', 'cover-letters', 'jobs', 'create'].includes(segment)) {
        const { data: resume } = await supabase.from('resumes').select('*').eq('id', segment).eq('user_id', user.id).single();
        if (!resume) return res.status(404).json({ error: 'Resume not found' });

        const [pi, edu, exp, skills, proj] = await Promise.all([
          supabase.from('resume_personal_info').select('*').eq('resume_id', segment).single(),
          supabase.from('resume_education').select('*').eq('resume_id', segment).order('sort_order'),
          supabase.from('resume_experience').select('*').eq('resume_id', segment).order('sort_order'),
          supabase.from('resume_skills').select('*').eq('resume_id', segment).order('sort_order'),
          supabase.from('resume_projects').select('*').eq('resume_id', segment).order('sort_order')
        ]);

        return res.status(200).json({ resume, personalInfo: pi.data, education: edu.data || [], experience: exp.data || [], skills: skills.data || [], projects: proj.data || [] });
      }

      console.log('Resume API: Unrecognized GET route, path:', path, 'segment:', segment);
      return res.status(404).json({ error: 'Not found', path: path, segment: segment });
    }

    // POST requests
    if (req.method === 'POST') {
      const body = req.body || {};

      if (segment === 'create') {
        // Check if user can create more resumes
        const resumeCheck = await canCreateResume(user.id);
        if (!resumeCheck.allowed) {
          return res.status(403).json({
            error: 'RESUME_LIMIT',
            message: 'Upgrade to Pro to create unlimited resumes',
            current: resumeCheck.current,
            limit: resumeCheck.limit,
            isPro: resumeCheck.isPro
          });
        }

        const { title = 'Untitled Resume', template = 'clean' } = body;
        const { data } = await supabase.from('resumes').insert({ user_id: user.id, title, template }).select().single();
        return res.status(200).json({ resume: data });
      }

      if (segment === 'cover-letters' && !id) {
        const { data } = await supabase.from('cover_letters').insert({ user_id: user.id, ...body }).select().single();
        return res.status(200).json({ coverLetter: data });
      }

      if (segment === 'jobs' && !id) {
        // Check if user can create more jobs
        const jobCheck = await canCreateJob(user.id);
        if (!jobCheck.allowed) {
          return res.status(403).json({
            error: 'JOB_LIMIT',
            message: 'Upgrade to Pro to track unlimited job applications',
            current: jobCheck.current,
            limit: jobCheck.limit,
            isPro: jobCheck.isPro
          });
        }

        const { data } = await supabase.from('job_applications').insert({ user_id: user.id, status: 'saved', ...body }).select().single();
        return res.status(200).json({ job: data });
      }

      if (segment === 'generate-bullets') {
        const { description, context: ctx } = body;
        if (!description) return res.status(400).json({ error: 'Description required' });

        const usage = await checkResumeAIUsage(user.id);
        if (!usage.allowed) return res.status(429).json({ error: 'LIMIT_EXCEEDED', message: usage.message });

        await trackUsage(user.id, 'resume_bullets');

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', max_tokens: 500, temperature: 0.3,
            system: 'You are a resume writer. Create professional bullet points.',
            messages: [{ role: 'user', content: `Rewrite as 2-3 resume bullets:\n${description}${ctx ? `\nContext: ${ctx}` : ''}\n\nReturn only bullets starting with -.` }]
          })
        });

        if (!response.ok) return res.status(500).json({ error: 'AI error' });
        const data = await response.json();
        return res.status(200).json({ success: true, bullets: data.content?.[0]?.text?.trim() });
      }

      if (segment === 'generate-summary') {
        const usage = await checkResumeAIUsage(user.id);
        if (!usage.allowed) return res.status(429).json({ error: 'LIMIT_EXCEEDED', message: usage.message });

        await trackUsage(user.id, 'resume_summary');

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

        const { education = [], experience = [], skills = [] } = body;
        const edu = education.map(e => e.school_name).join(', ') || 'None';
        const exp = experience.map(e => `${e.job_title} at ${e.company_name}`).join('; ') || 'None';
        const sk = skills.map(s => s.skill_name).filter(Boolean).join(', ') || 'None';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', max_tokens: 300, temperature: 0.4,
            system: 'Write a 2-3 sentence professional summary for a young person.',
            messages: [{ role: 'user', content: `Education: ${edu}\nExperience: ${exp}\nSkills: ${sk}\n\nWrite only the summary.` }]
          })
        });

        if (!response.ok) return res.status(500).json({ error: 'AI error' });
        const data = await response.json();
        return res.status(200).json({ success: true, summary: data.content?.[0]?.text?.trim() });
      }

      if (segment === 'generate-cover-letter') {
        const { jobTitle, company, resumeId } = body;
        if (!jobTitle || !company) return res.status(400).json({ error: 'Job title and company required' });

        const usage = await checkResumeAIUsage(user.id);
        if (!usage.allowed) return res.status(429).json({ error: 'LIMIT_EXCEEDED', message: usage.message });

        await trackUsage(user.id, 'cover_letter');

        let name = '[Your Name]';
        if (resumeId) {
          const { data: pi } = await supabase.from('resume_personal_info').select('first_name, last_name').eq('resume_id', resumeId).single();
          if (pi) name = [pi.first_name, pi.last_name].filter(Boolean).join(' ') || name;
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', max_tokens: 1000, temperature: 0.5,
            system: 'Write a natural cover letter for a young person. Avoid clichés.',
            messages: [{ role: 'user', content: `Job: ${jobTitle} at ${company}\n\nWrite a cover letter under 250 words. End with "Sincerely," and "${name}".` }]
          })
        });

        if (!response.ok) return res.status(500).json({ error: 'AI error' });
        const data = await response.json();
        return res.status(200).json({ success: true, coverLetter: data.content?.[0]?.text?.trim() });
      }

      return res.status(404).json({ error: 'Not found' });
    }

    // PUT requests
    if (req.method === 'PUT') {
      const body = req.body || {};

      if (segment === 'cover-letters' && id) {
        await supabase.from('cover_letters').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      if (segment === 'jobs' && id) {
        await supabase.from('job_applications').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      // PUT /api/resume/[id]
      if (path.length === 1) {
        const resumeId = segment;
        const { section, data } = body;

        if (!section) {
          // Check template restrictions if template is being changed
          if (data && data.template) {
            const templateAllowed = await canUseTemplate(user.id, data.template);
            if (!templateAllowed) {
              return res.status(403).json({
                error: 'TEMPLATE_LOCKED',
                message: 'Upgrade to Pro to unlock all templates',
                template: data.template
              });
            }
          }
          await supabase.from('resumes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', resumeId).eq('user_id', user.id);
          return res.status(200).json({ success: true });
        }

        const tables = {
          personalInfo: 'resume_personal_info', education: 'resume_education',
          experience: 'resume_experience', skills: 'resume_skills', projects: 'resume_projects'
        };
        const table = tables[section];
        if (!table) return res.status(400).json({ error: 'Invalid section' });

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
          return res.status(200).json({ success: true, item: result.data });
        }

        await supabase.from('resumes').update({ updated_at: new Date().toISOString() }).eq('id', resumeId);
        return res.status(200).json({ success: true });
      }

      return res.status(404).json({ error: 'Not found' });
    }

    // DELETE requests
    if (req.method === 'DELETE') {
      if (segment === 'cover-letters' && id) {
        await supabase.from('cover_letters').delete().eq('id', id).eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      if (segment === 'jobs' && id) {
        await supabase.from('job_applications').delete().eq('id', id).eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      // DELETE /api/resume/[id]
      if (path.length === 1) {
        const body = req.body || {};
        if (body.section && body.itemId) {
          const tables = { education: 'resume_education', experience: 'resume_experience', skills: 'resume_skills', projects: 'resume_projects' };
          const table = tables[body.section];
          if (table) await supabase.from(table).delete().eq('id', body.itemId);
          return res.status(200).json({ success: true });
        }
        await supabase.from('resumes').delete().eq('id', segment).eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Resume API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

async function trackUsage(userId, feature) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('ai_usage').select('*').eq('user_id', userId).eq('feature', feature).eq('usage_date', today).single();
  if (existing) {
    await supabase.from('ai_usage').update({ usage_count: existing.usage_count + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('ai_usage').insert({ user_id: userId, feature, usage_date: today, usage_count: 1 });
  }
}
