// Resume Builder Pro Status & Limits
// Free users: 1 resume, 5 AI generations, Clean template only, 3 jobs
// Pro users ($19 one-time): Unlimited everything, 100 AI/month

const { supabase } = require('./supabase');

const FREE_LIMITS = {
  resumes: 1,
  jobs: 3,
  aiGenerations: 5,
  templates: ['clean']
};

const PRO_LIMITS = {
  resumes: Infinity,
  jobs: Infinity,
  aiGenerationsPerMonth: 100,
  templates: ['clean', 'modern', 'professional', 'bold', 'minimal', 'compact']
};

// Check if user is Pro (has purchased Resume Builder)
async function isResumeProUser(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('subscribed_resumebuilder')
      .eq('id', userId)
      .single();

    if (error || !user) return false;
    return user.subscribed_resumebuilder === true;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
}

// Get user's Pro status and usage stats
async function getResumeProStatus(userId) {
  try {
    // Get user pro status
    const isPro = await isResumeProUser(userId);

    // Get resume count
    const { count: resumeCount } = await supabase
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get job count
    const { count: jobCount } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get AI usage
    let aiUsed = 0;
    if (isPro) {
      // Pro: count this month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyUsage } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter'])
        .gte('usage_date', startOfMonth.toISOString().split('T')[0]);

      aiUsed = (monthlyUsage || []).reduce((sum, row) => sum + (row.usage_count || 0), 0);
    } else {
      // Free: count total lifetime usage
      const { data: totalUsage } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter']);

      aiUsed = (totalUsage || []).reduce((sum, row) => sum + (row.usage_count || 0), 0);
    }

    return {
      isPro,
      limits: isPro ? PRO_LIMITS : FREE_LIMITS,
      usage: {
        resumes: resumeCount || 0,
        jobs: jobCount || 0,
        aiGenerations: aiUsed
      },
      canCreateResume: isPro || (resumeCount || 0) < FREE_LIMITS.resumes,
      canCreateJob: isPro || (jobCount || 0) < FREE_LIMITS.jobs,
      canUseTemplate: (template) => isPro || FREE_LIMITS.templates.includes(template),
      aiLimit: isPro ? PRO_LIMITS.aiGenerationsPerMonth : FREE_LIMITS.aiGenerations,
      aiRemaining: isPro
        ? Math.max(0, PRO_LIMITS.aiGenerationsPerMonth - aiUsed)
        : Math.max(0, FREE_LIMITS.aiGenerations - aiUsed)
    };
  } catch (error) {
    console.error('Error getting pro status:', error);
    // Default to free limits on error
    return {
      isPro: false,
      limits: FREE_LIMITS,
      usage: { resumes: 0, jobs: 0, aiGenerations: 0 },
      canCreateResume: true,
      canCreateJob: true,
      canUseTemplate: (template) => FREE_LIMITS.templates.includes(template),
      aiLimit: FREE_LIMITS.aiGenerations,
      aiRemaining: FREE_LIMITS.aiGenerations
    };
  }
}

// Check if user can create a resume
async function canCreateResume(userId) {
  const status = await getResumeProStatus(userId);
  return {
    allowed: status.canCreateResume,
    isPro: status.isPro,
    current: status.usage.resumes,
    limit: status.isPro ? 'unlimited' : FREE_LIMITS.resumes
  };
}

// Check if user can create a job
async function canCreateJob(userId) {
  const status = await getResumeProStatus(userId);
  return {
    allowed: status.canCreateJob,
    isPro: status.isPro,
    current: status.usage.jobs,
    limit: status.isPro ? 'unlimited' : FREE_LIMITS.jobs
  };
}

// Check if template is allowed for user
async function canUseTemplate(userId, template) {
  const isPro = await isResumeProUser(userId);
  return isPro || FREE_LIMITS.templates.includes(template);
}

module.exports = {
  FREE_LIMITS,
  PRO_LIMITS,
  isResumeProUser,
  getResumeProStatus,
  canCreateResume,
  canCreateJob,
  canUseTemplate
};
