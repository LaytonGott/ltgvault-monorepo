// AI Usage Limits for Resume Builder
// Free users: 10 total AI generations (lifetime)
// Pro users (subscribed_resumebuilder): 100 per month

import { supabase } from './supabase';

export const FREE_LIMIT = 5;
export const PRO_MONTHLY_LIMIT = 100;

interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  isPro: boolean;
  message?: string;
}

// Check if user can make an AI generation
export async function checkResumeAIUsage(userId: string): Promise<UsageCheckResult> {
  try {
    // Get user to check subscription status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscribed_resumebuilder')
      .eq('id', userId)
      .single();

    // For localhost dev users or if user not found, treat as free
    const isPro = user?.subscribed_resumebuilder === true;

    if (isPro) {
      // Pro users: count this month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyUsage, error: usageError } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter'])
        .gte('usage_date', startOfMonth.toISOString().split('T')[0]);

      const used = (monthlyUsage || []).reduce((sum: number, row: any) => sum + (row.usage_count || 0), 0);

      if (used >= PRO_MONTHLY_LIMIT) {
        return {
          allowed: false,
          used,
          limit: PRO_MONTHLY_LIMIT,
          isPro: true,
          message: `You've used all ${PRO_MONTHLY_LIMIT} AI generations this month. Your limit resets on the 1st.`
        };
      }

      return {
        allowed: true,
        used,
        limit: PRO_MONTHLY_LIMIT,
        isPro: true
      };
    } else {
      // Free users: count total lifetime usage
      const { data: totalUsage, error: usageError } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter']);

      const used = (totalUsage || []).reduce((sum: number, row: any) => sum + (row.usage_count || 0), 0);

      if (used >= FREE_LIMIT) {
        return {
          allowed: false,
          used,
          limit: FREE_LIMIT,
          isPro: false,
          message: `You've used all ${FREE_LIMIT} free AI generations. Upgrade to Pro for ${PRO_MONTHLY_LIMIT}/month.`
        };
      }

      return {
        allowed: true,
        used,
        limit: FREE_LIMIT,
        isPro: false
      };
    }
  } catch (error) {
    console.error('Error checking AI usage:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      used: 0,
      limit: FREE_LIMIT,
      isPro: false
    };
  }
}

// Get current usage stats for display in UI
export async function getResumeAIUsageStats(userId: string): Promise<{ used: number; limit: number; isPro: boolean }> {
  const result = await checkResumeAIUsage(userId);
  return {
    used: result.used,
    limit: result.limit,
    isPro: result.isPro
  };
}

