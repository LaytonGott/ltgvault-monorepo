const { supabase } = require('./supabase');
const { FREE_LIMITS } = require('./stripe');

// Get lifetime usage for a user for a specific tool
async function getUsage(userId, tool) {
  const { data, error } = await supabase
    .from('usage')
    .select('count')
    .eq('user_id', userId)
    .eq('tool', tool)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching usage:', error);
    return 0;
  }

  return data?.count || 0;
}

// Get all usage for a user
async function getAllUsage(userId) {
  const { data, error } = await supabase
    .from('usage')
    .select('tool, count')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching all usage:', error);
    return { postup: 0, chaptergen: 0, threadgen: 0 };
  }

  const usage = { postup: 0, chaptergen: 0, threadgen: 0 };
  for (const row of data || []) {
    usage[row.tool] = row.count;
  }

  return usage;
}

// Increment usage for a user for a specific tool
async function incrementUsage(userId, tool) {
  // Check if record exists
  const { data: existing } = await supabase
    .from('usage')
    .select('id, count')
    .eq('user_id', userId)
    .eq('tool', tool)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('usage')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    // Insert new record
    await supabase
      .from('usage')
      .insert({
        user_id: userId,
        tool: tool,
        count: 1
      });
  }
}

// Check if user can use a tool
// Returns { allowed, used, limit, subscribed }
async function canUseTool(userId, tool, isSubscribed) {
  // If subscribed to this tool, unlimited access
  if (isSubscribed) {
    const used = await getUsage(userId, tool);
    return { allowed: true, used, limit: 'unlimited', subscribed: true };
  }

  // Free tier - lifetime limit
  const limit = FREE_LIMITS[tool];
  if (limit === undefined) {
    return { allowed: false, used: 0, limit: 0, subscribed: false };
  }

  const used = await getUsage(userId, tool);
  return {
    allowed: used < limit,
    used,
    limit,
    subscribed: false
  };
}

// Get usage with limits for all tools
async function getUsageWithLimits(userId, subscriptions) {
  const usage = await getAllUsage(userId);

  return {
    postup: {
      used: usage.postup,
      limit: subscriptions.postup ? 'unlimited' : FREE_LIMITS.postup,
      subscribed: subscriptions.postup
    },
    chaptergen: {
      used: usage.chaptergen,
      limit: subscriptions.chaptergen ? 'unlimited' : FREE_LIMITS.chaptergen,
      subscribed: subscriptions.chaptergen
    },
    threadgen: {
      used: usage.threadgen,
      limit: subscriptions.threadgen ? 'unlimited' : FREE_LIMITS.threadgen,
      subscribed: subscriptions.threadgen
    }
  };
}

module.exports = {
  getUsage,
  getAllUsage,
  incrementUsage,
  canUseTool,
  getUsageWithLimits
};
