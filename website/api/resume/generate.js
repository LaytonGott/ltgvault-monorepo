// Resume AI Generation API - bullets, summary, cover letter
const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');
const { checkResumeAIUsage } = require('../../lib/resume-ai-usage');
const { debugLog } = require('../../lib/debug');

async function getUser(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return null;
  const user = await validateApiKey(apiKey);
  return user || null;
}

// Track AI usage - inserts one row per generation
// Schema: ai_usage(id, user_id, tool, action, tokens_used, model, created_at)
async function trackUsage(userId, tool) {
  try {
    debugLog('trackUsage', 'Recording usage for tool:', tool);

    const { data: insertData, error: insertError } = await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        tool: tool,           // e.g. 'resume_bullets', 'resume_summary', 'cover_letter'
        action: 'generate',
        tokens_used: 0,
        model: 'claude-3-haiku-20240307'
      })
      .select();

    if (insertError) {
      console.error('[trackUsage] Insert error:', insertError);
    } else {
      debugLog('trackUsage', 'Inserted successfully');
    }
  } catch (error) {
    console.error('[trackUsage] Exception:', error);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'API key required' });
  }

  const body = req.body || {};
  const { type } = body;

  // Check AI usage limits
  let usage = await checkResumeAIUsage(user.id);
  if (!usage.allowed) {
    return res.status(429).json({ error: 'LIMIT_EXCEEDED', message: usage.message });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: 'AI not configured' });
  }

  try {
    // Generate bullets
    if (type === 'bullets') {
      const { description, context: ctx } = body;
      if (!description) return res.status(400).json({ error: 'Description required' });

      await trackUsage(user.id, 'resume_bullets');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          temperature: 0.3,
          system: 'You are a resume writer. Create professional bullet points.',
          messages: [{ role: 'user', content: `Rewrite as 2-3 resume bullets:\n${description}${ctx ? `\nContext: ${ctx}` : ''}\n\nReturn only bullets starting with -.` }]
        })
      });

      if (!response.ok) return res.status(500).json({ error: 'AI error' });
      const data = await response.json();
      // Get updated usage count
      const updatedUsage = await checkResumeAIUsage(user.id);
      return res.status(200).json({
        success: true,
        bullets: data.content?.[0]?.text?.trim(),
        aiUsage: { used: updatedUsage.used, limit: updatedUsage.limit, remaining: updatedUsage.limit - updatedUsage.used, isPro: updatedUsage.isPro }
      });
    }

    // Generate summary
    if (type === 'summary') {
      const { education = [], experience = [], skills = [] } = body;

      await trackUsage(user.id, 'resume_summary');

      const edu = education.map(e => e.school_name).join(', ') || 'None';
      const exp = experience.map(e => `${e.job_title} at ${e.company_name}`).join('; ') || 'None';
      const sk = skills.map(s => s.skill_name).filter(Boolean).join(', ') || 'None';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          temperature: 0.4,
          system: 'Write a 2-3 sentence professional summary for a young person.',
          messages: [{ role: 'user', content: `Education: ${edu}\nExperience: ${exp}\nSkills: ${sk}\n\nWrite only the summary.` }]
        })
      });

      if (!response.ok) return res.status(500).json({ error: 'AI error' });
      const data = await response.json();
      // Get updated usage count
      const updatedUsage = await checkResumeAIUsage(user.id);
      return res.status(200).json({
        success: true,
        summary: data.content?.[0]?.text?.trim(),
        aiUsage: { used: updatedUsage.used, limit: updatedUsage.limit, remaining: updatedUsage.limit - updatedUsage.used, isPro: updatedUsage.isPro }
      });
    }

    // Generate cover letter
    if (type === 'cover-letter') {
      const { jobTitle, company, resumeId } = body;
      if (!jobTitle || !company) return res.status(400).json({ error: 'Job title and company required' });

      await trackUsage(user.id, 'cover_letter');

      let name = '[Your Name]';
      if (resumeId) {
        const { data: pi } = await supabase
          .from('resume_personal_info')
          .select('first_name, last_name')
          .eq('resume_id', resumeId)
          .single();
        if (pi) name = [pi.first_name, pi.last_name].filter(Boolean).join(' ') || name;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: 0.5,
          system: 'Write a natural cover letter for a young person. Avoid clichés.',
          messages: [{ role: 'user', content: `Job: ${jobTitle} at ${company}\n\nWrite a cover letter under 250 words. End with "Sincerely," and "${name}".` }]
        })
      });

      if (!response.ok) return res.status(500).json({ error: 'AI error' });
      const data = await response.json();
      // Get updated usage count
      const updatedUsage = await checkResumeAIUsage(user.id);
      return res.status(200).json({
        success: true,
        coverLetter: data.content?.[0]?.text?.trim(),
        aiUsage: { used: updatedUsage.used, limit: updatedUsage.limit, remaining: updatedUsage.limit - updatedUsage.used, isPro: updatedUsage.isPro }
      });
    }

    return res.status(400).json({ error: 'Invalid type. Use: bullets, summary, or cover-letter' });
  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
