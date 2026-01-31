import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';
import { checkResumeAIUsage } from '@/lib/resume-ai-usage';

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

    const body = await request.json();
    const { jobTitle, company, jobDescription, resumeId } = body;

    if (!jobTitle || !company) {
      return NextResponse.json({ error: 'Job title and company are required' }, { status: 400 });
    }

    // Check AI usage limits
    const usageCheck = await checkResumeAIUsage(user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: 'LIMIT_EXCEEDED',
        message: usageCheck.message,
        usage: { used: usageCheck.used, limit: usageCheck.limit, isPro: usageCheck.isPro }
      }, { status: 429 });
    }

    // Track usage in ai_usage table
    const today = new Date().toISOString().split('T')[0];

    const { data: existingUsage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature', 'cover_letter')
      .eq('usage_date', today)
      .single();

    if (existingUsage) {
      await supabase
        .from('ai_usage')
        .update({ usage_count: existingUsage.usage_count + 1 })
        .eq('id', existingUsage.id);
    } else {
      await supabase
        .from('ai_usage')
        .insert({
          user_id: user.id,
          feature: 'cover_letter',
          usage_date: today,
          usage_count: 1
        });
    }

    // Fetch resume data if resumeId provided
    let resumeData = '';
    if (resumeId) {
      const [personalInfo, education, experience, skills] = await Promise.all([
        supabase.from('resume_personal_info').select('*').eq('resume_id', resumeId).single(),
        supabase.from('resume_education').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_experience').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_skills').select('*').eq('resume_id', resumeId).order('sort_order')
      ]);

      const pi = personalInfo.data;
      const eduList = education.data || [];
      const expList = experience.data || [];
      const skillList = skills.data || [];

      resumeData = `
Name: ${pi?.first_name || ''} ${pi?.last_name || ''}
Summary: ${pi?.summary || 'Not provided'}

Education:
${eduList.length > 0
  ? eduList.map((e: any) => `- ${e.degree || 'Degree'} ${e.field_of_study ? `in ${e.field_of_study}` : ''} at ${e.school_name || 'School'}`).join('\n')
  : 'No education listed'}

Experience:
${expList.length > 0
  ? expList.map((e: any) => `- ${e.job_title || 'Role'} at ${e.company_name || 'Company'}${e.description ? `: ${e.description.substring(0, 200)}` : ''}`).join('\n')
  : 'No experience listed'}

Skills: ${skillList.filter((s: any) => s.skill_name).map((s: any) => s.skill_name).join(', ') || 'None listed'}`;
    }

    // Call Anthropic Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Get candidate name for closing
    let candidateName = '';
    if (resumeId) {
      const { data: pi } = await supabase
        .from('resume_personal_info')
        .select('first_name, last_name')
        .eq('resume_id', resumeId)
        .single();
      if (pi) {
        candidateName = [pi.first_name, pi.last_name].filter(Boolean).join(' ');
      }
    }

    const systemPrompt = `You are helping a high school student or young person write a cover letter for one of their first jobs.

IMPORTANT STYLE RULES:
- Write like a real person, not a corporate robot
- NO generic phrases like "passionate individual", "thrilled to apply", "valuable contribution", "I believe I have the skills", "I am writing to express my interest"
- Be specific and genuine, not buzzwordy
- Short sentences. Casual but professional.
- Sound like a confident teenager, not a 45-year-old HR person
- It's okay to show personality
- Assume they are in high school unless their resume says otherwise`;

    const userPrompt = `Write a cover letter for this job application:

Job Title: ${jobTitle}
Company: ${company}
${jobDescription ? `Job Description: ${jobDescription}` : ''}

${resumeData ? `Candidate's Resume:\n${resumeData}` : 'No resume data provided - write a general cover letter.'}

Write a cover letter that:
- Opens with something specific about why this job/company interests them (not generic excitement)
- Shows what they've actually done that's relevant (from their resume)
- Ends with a simple ask for an interview
- Closes with "Sincerely," followed by a new line and "${candidateName || '[Your Name]'}"

Keep it under 250 words. Make it sound human. Start with "Dear Hiring Manager,"`;

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
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 });
    }

    const data = await response.json();
    const coverLetter = data.content?.[0]?.text;

    if (!coverLetter) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      coverLetter: coverLetter.trim()
    });

  } catch (error: any) {
    console.error('Generate cover letter error:', error);
    return NextResponse.json({ error: 'Failed to generate cover letter' }, { status: 500 });
  }
}
