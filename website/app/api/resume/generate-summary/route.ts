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
    const { education, experience, skills, projects } = body;

    // Check AI usage limits
    const usageCheck = await checkResumeAIUsage(user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json({
        error: 'LIMIT_EXCEEDED',
        message: usageCheck.message,
        usage: { used: usageCheck.used, limit: usageCheck.limit, isPro: usageCheck.isPro }
      }, { status: 429 });
    }

    // Track usage in ai_usage table BEFORE making the API call
    const today = new Date().toISOString().split('T')[0];

    const { data: existingUsage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature', 'resume_summary')
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
          feature: 'resume_summary',
          usage_date: today,
          usage_count: 1
        });
    }

    // Call Anthropic Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Format the resume data for the prompt
    const educationText = education && education.length > 0
      ? education.map((e: any) =>
          `${e.degree || 'Degree'} ${e.field_of_study ? `in ${e.field_of_study}` : ''} at ${e.school_name || 'School'}${e.gpa ? ` (GPA: ${e.gpa})` : ''}`
        ).join('; ')
      : 'None provided';

    const experienceText = experience && experience.length > 0
      ? experience.map((e: any) =>
          `${e.job_title || 'Role'} at ${e.company_name || 'Company'}${e.description ? `: ${e.description.substring(0, 100)}` : ''}`
        ).join('; ')
      : 'None provided';

    const skillsText = skills && skills.length > 0
      ? skills.filter((s: any) => s.skill_name).map((s: any) => s.skill_name).join(', ')
      : 'None provided';

    const projectsText = projects && projects.length > 0
      ? projects.map((p: any) =>
          `${p.project_name || 'Project'}${p.role ? ` (${p.role})` : ''}${p.description ? `: ${p.description.substring(0, 100)}` : ''}`
        ).join('; ')
      : 'None provided';

    const systemPrompt = `You are helping a young person write their first resume. Your job is to write a professional summary that highlights their strengths without overselling. Keep it genuine and appropriate for someone with limited work experience.`;

    const userPrompt = `Based on the following information, write a 2-3 sentence professional summary. Keep it confident but genuine. Don't oversell or use clichés like "hardworking" or "team player".

Education: ${educationText}
Experience: ${experienceText}
Skills: ${skillsText}
Projects/Activities: ${projectsText}

Write only the summary paragraph, nothing else.`;

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
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }

    const data = await response.json();
    const summary = data.content?.[0]?.text;

    if (!summary) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      summary: summary.trim()
    });

  } catch (error: any) {
    console.error('Generate summary error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
