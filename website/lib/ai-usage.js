const { supabase } = require('./supabase');

// Limits configuration
const LIMITS = {
  FREE_TOTAL: 10,      // Free users: 10 total AI generations ever
  PRO_MONTHLY: 100,    // Pro users: 100 per month
  RATE_PER_MINUTE: 10  // All users: 10 requests per minute
};

/**
 * Get current month string (YYYY-MM)
 */
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check rate limit (10 requests per minute)
 * @param {string} userId - User ID
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkRateLimit(userId) {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if we can't check
    return { allowed: true, remaining: LIMITS.RATE_PER_MINUTE, resetIn: 0 };
  }

  const used = count || 0;
  const remaining = Math.max(0, LIMITS.RATE_PER_MINUTE - used);

  return {
    allowed: used < LIMITS.RATE_PER_MINUTE,
    remaining,
    resetIn: remaining === 0 ? 60 : 0
  };
}

/**
 * Get usage count for a user
 * @param {string} userId - User ID
 * @param {string} tool - Tool name
 * @param {boolean} isPro - Whether user is subscribed
 * @returns {Promise<{used: number, limit: number}>}
 */
async function getUsageCount(userId, tool, isPro) {
  if (isPro) {
    // Pro users: check monthly usage
    const month = getCurrentMonth();

    const { data, error } = await supabase
      .from('ai_usage_monthly')
      .select('count')
      .eq('user_id', userId)
      .eq('tool', tool)
      .eq('month', month)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching monthly usage:', error);
    }

    return {
      used: data?.count || 0,
      limit: LIMITS.PRO_MONTHLY
    };
  } else {
    // Free users: check total usage (all time)
    const { count, error } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tool', tool);

    if (error) {
      console.error('Error fetching total usage:', error);
    }

    return {
      used: count || 0,
      limit: LIMITS.FREE_TOTAL
    };
  }
}

/**
 * Check if user can make an AI request
 * @param {string} userId - User ID
 * @param {string} tool - Tool name (e.g., 'resumebuilder')
 * @param {boolean} isPro - Whether user has pro subscription
 * @returns {Promise<{allowed: boolean, reason?: string, usage: object, rateLimit: object}>}
 */
async function canUseAI(userId, tool, isPro) {
  // Check rate limit first
  const rateLimit = await checkRateLimit(userId);

  if (!rateLimit.allowed) {
    return {
      allowed: false,
      reason: 'RATE_LIMITED',
      message: `Too many requests. Please wait ${rateLimit.resetIn} seconds.`,
      usage: null,
      rateLimit
    };
  }

  // Check usage limits
  const usage = await getUsageCount(userId, tool, isPro);

  if (usage.used >= usage.limit) {
    return {
      allowed: false,
      reason: isPro ? 'MONTHLY_LIMIT' : 'FREE_LIMIT',
      message: isPro
        ? `You've reached your monthly limit of ${usage.limit} AI generations. Resets next month.`
        : `You've used all ${usage.limit} free AI generations. Upgrade to Pro for more.`,
      usage,
      rateLimit
    };
  }

  return {
    allowed: true,
    usage,
    rateLimit
  };
}

/**
 * Track an AI usage event
 * @param {string} userId - User ID
 * @param {string} tool - Tool name
 * @param {string} action - Action performed (e.g., 'generate_summary', 'improve_bullet')
 * @param {object} options - Additional options
 * @param {number} options.tokensUsed - Tokens used in the request
 * @param {string} options.model - Model used
 * @param {boolean} options.isPro - Whether user is pro (for monthly tracking)
 */
async function trackAIUsage(userId, tool, action, options = {}) {
  const { tokensUsed = 0, model = null, isPro = false } = options;

  // Insert into ai_usage table
  const { error: usageError } = await supabase
    .from('ai_usage')
    .insert({
      user_id: userId,
      tool,
      action,
      tokens_used: tokensUsed,
      model
    });

  if (usageError) {
    console.error('Error tracking AI usage:', usageError);
  }

  // Update monthly summary (for faster limit checks on pro users)
  const month = getCurrentMonth();

  // Try to increment existing record first
  const { data: existing } = await supabase
    .from('ai_usage_monthly')
    .select('id, count')
    .eq('user_id', userId)
    .eq('tool', tool)
    .eq('month', month)
    .single();

  if (existing) {
    // Increment existing
    await supabase
      .from('ai_usage_monthly')
      .update({
        count: existing.count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    // Insert new
    await supabase
      .from('ai_usage_monthly')
      .insert({
        user_id: userId,
        tool,
        month,
        count: 1
      });
  }
}

/**
 * Middleware helper for API routes
 * Checks both rate limit and usage limit, returns error response if blocked
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string} userId - User ID
 * @param {string} tool - Tool name
 * @param {boolean} isPro - Whether user is pro
 * @returns {Promise<{allowed: boolean, usage?: object}>}
 */
async function checkAILimits(req, res, userId, tool, isPro) {
  const check = await canUseAI(userId, tool, isPro);

  if (!check.allowed) {
    const statusCode = check.reason === 'RATE_LIMITED' ? 429 : 403;

    res.status(statusCode).json({
      error: check.reason,
      message: check.message,
      usage: check.usage,
      rateLimit: check.rateLimit,
      upgradeUrl: check.reason === 'FREE_LIMIT' ? '/pricing.html' : null
    });

    return { allowed: false };
  }

  return {
    allowed: true,
    usage: check.usage,
    rateLimit: check.rateLimit
  };
}

module.exports = {
  LIMITS,
  checkRateLimit,
  getUsageCount,
  canUseAI,
  trackAIUsage,
  checkAILimits
};
