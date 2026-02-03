// AI Usage Limits for Resume Builder
// Free users: 5 total AI generations (lifetime)
// Pro users (subscribed_resumebuilder): 100 per month
//
// Schema: ai_usage(id, user_id, tool, action, tokens_used, model, created_at)
// Each row = 1 generation. Count rows to get usage.

const { supabase } = require('./supabase');

const FREE_LIMIT = 5;
const PRO_MONTHLY_LIMIT = 100;

// Check if user can make an AI generation
async function checkResumeAIUsage(userId) {
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
      // Pro users: count this month's usage (count rows, not sum)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: usageError } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('tool', ['resume_bullets', 'resume_summary', 'cover_letter'])
        .gte('created_at', startOfMonth.toISOString());

      const used = count || 0;
      console.log('[checkResumeAIUsage] Pro user, monthly count:', used);

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
      // Free users: count total lifetime usage (count rows)
      const { count, error: usageError } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('tool', ['resume_bullets', 'resume_summary', 'cover_letter']);

      const used = count || 0;
      console.log('[checkResumeAIUsage] Free user, total count:', used);

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
async function getResumeAIUsageStats(userId) {
  const result = await checkResumeAIUsage(userId);
  return {
    used: result.used,
    limit: result.limit,
    isPro: result.isPro
  };
}

module.exports = {
  FREE_LIMIT,
  PRO_MONTHLY_LIMIT,
  checkResumeAIUsage,
  getResumeAIUsageStats
};
