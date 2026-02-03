// Resume Builder Pro Status & Limits
// Free users: 1 resume, 5 AI generations, Single Column Classic template only, 3 jobs
// Pro users ($19 one-time): Unlimited everything, 100 AI/month, 25 templates

const { supabase } = require('./supabase');

// All 25 templates (5 layouts × 5 styles)
const ALL_TEMPLATES = [
  // Single Column layouts
  'single-classic', 'single-modern', 'single-bold', 'single-elegant', 'single-minimal',
  // Two Column layouts
  'twocolumn-classic', 'twocolumn-modern', 'twocolumn-bold', 'twocolumn-elegant', 'twocolumn-minimal',
  // Header Focus layouts
  'header-classic', 'header-modern', 'header-bold', 'header-elegant', 'header-minimal',
  // Compact layouts
  'compact-classic', 'compact-modern', 'compact-bold', 'compact-elegant', 'compact-minimal',
  // Modern Split layouts
  'split-classic', 'split-modern', 'split-bold', 'split-elegant', 'split-minimal',
];

// Legacy template name mapping (for backwards compatibility)
const LEGACY_TEMPLATE_MAP = {
  'clean': 'single-classic',
  'modern': 'twocolumn-modern',
  'professional': 'single-elegant',
  'bold': 'header-bold',
  'minimal': 'single-minimal',
  'compact': 'compact-classic',
};

const FREE_TEMPLATES = ['single-classic', 'clean']; // 'clean' for backwards compatibility

const FREE_LIMITS = {
  resumes: 1,
  jobs: 3,
  aiGenerations: 5,
  templates: FREE_TEMPLATES
};

const PRO_LIMITS = {
  resumes: Infinity,
  jobs: Infinity,
  aiGenerationsPerMonth: 100,
  templates: ALL_TEMPLATES
};

// Check if user is Pro (has purchased Resume Builder)
async function isResumeProUser(userId) {
  try {
    console.log('[isResumeProUser] Checking userId:', userId);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, subscribed_resumebuilder')
      .eq('id', userId)
      .single();

    console.log('[isResumeProUser] Query result:', {
      userId: user?.id,
      email: user?.email,
      subscribed_resumebuilder: user?.subscribed_resumebuilder,
      error: error?.message
    });

    if (error || !user) return false;
    const isPro = user.subscribed_resumebuilder === true;
    console.log('[isResumeProUser] Final isPro:', isPro);
    return isPro;
  } catch (error) {
    console.error('[isResumeProUser] Error:', error);
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

    // Get AI usage - count rows in ai_usage table
    // Schema: ai_usage(id, user_id, tool, action, tokens_used, model, created_at)
    let aiUsed = 0;
    console.log('[getResumeProStatus] Checking AI usage for userId:', userId, 'isPro:', isPro);
    if (isPro) {
      // Pro: count this month's usage (count rows)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: usageError } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('tool', ['resume_bullets', 'resume_summary', 'cover_letter'])
        .gte('created_at', startOfMonth.toISOString());

      console.log('[getResumeProStatus] Pro monthly usage count:', count, 'error:', usageError?.message);
      aiUsed = count || 0;
    } else {
      // Free: count total lifetime usage (count rows)
      const { count, error: usageError } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('tool', ['resume_bullets', 'resume_summary', 'cover_letter']);

      console.log('[getResumeProStatus] Free total usage count:', count, 'error:', usageError?.message);
      aiUsed = count || 0;
    }
    console.log('[getResumeProStatus] Final aiUsed:', aiUsed);

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
      canUseTemplate: (template) => {
        if (isPro) return true;
        const normalizedTemplate = LEGACY_TEMPLATE_MAP[template] || template;
        return FREE_TEMPLATES.includes(template) || FREE_TEMPLATES.includes(normalizedTemplate);
      },
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
      canUseTemplate: (template) => {
        const normalizedTemplate = LEGACY_TEMPLATE_MAP[template] || template;
        return FREE_TEMPLATES.includes(template) || FREE_TEMPLATES.includes(normalizedTemplate);
      },
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
  if (isPro) return true;

  // Check both the exact template and any legacy mapping
  const normalizedTemplate = LEGACY_TEMPLATE_MAP[template] || template;
  return FREE_TEMPLATES.includes(template) || FREE_TEMPLATES.includes(normalizedTemplate);
}

module.exports = {
  FREE_LIMITS,
  PRO_LIMITS,
  FREE_TEMPLATES,
  ALL_TEMPLATES,
  LEGACY_TEMPLATE_MAP,
  isResumeProUser,
  getResumeProStatus,
  canCreateResume,
  canCreateJob,
  canUseTemplate
};
