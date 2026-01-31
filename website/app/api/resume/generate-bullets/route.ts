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
    const { description, context } = body;

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (description.length > 2000) {
      return NextResponse.json({ error: 'Description too long. Maximum 2000 characters.' }, { status: 400 });
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

    // Track usage in ai_usage table BEFORE making the API call
    const today = new Date().toISOString().split('T')[0];

    // Get or create usage record for today
    const { data: existingUsage } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('feature', 'resume_bullets')
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
          feature: 'resume_bullets',
          usage_date: today,
          usage_count: 1
        });
    }

    // Call Anthropic Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const systemPrompt = `You are a professional resume writer helping a young person with little to no work experience create their first resume. Your job is to take casual descriptions and turn them into professional resume bullet points.

Guidelines:
- Use strong action verbs (Managed, Created, Developed, Organized, Assisted, etc.)
- Quantify achievements when possible (numbers, percentages, amounts)
- Keep each bullet concise (1-2 lines max)
- Sound professional but authentic - don't exaggerate or add fake accomplishments
- Focus on transferable skills even from casual activities
- Make it appropriate for a first-time job seeker`;

    const userPrompt = `Take this description and rewrite it as 2-3 professional resume bullet points.${context ? `\n\nContext: ${context}` : ''}

Description: ${description}

Return only the bullet points, one per line, starting with a dash (-). Do not include any other text or explanation.`;

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
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate bullets' }, { status: 500 });
    }

    const data = await response.json();
    const bullets = data.content?.[0]?.text;

    if (!bullets) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bullets: bullets.trim()
    });

  } catch (error: any) {
    console.error('Generate bullets error:', error);
    return NextResponse.json({ error: 'Failed to generate bullets' }, { status: 500 });
  }
}
