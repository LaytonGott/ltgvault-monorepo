const { supabase } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== LOOKUP DEBUG ===');
    console.log('Supabase configured:', !!supabase);

    if (!supabase) {
      console.log('ERROR: Supabase client is null');
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { email } = req.body;
    console.log('Email from request:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const searchEmail = email.toLowerCase().trim();
    console.log('Searching for email:', searchEmail);

    // Look up user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', searchEmail)
      .single();

    console.log('Query result - user:', user ? 'FOUND' : 'NOT FOUND');
    console.log('Query result - error:', userError ? JSON.stringify(userError) : 'none');

    if (userError || !user) {
      // Try a broader search to debug
      const { data: allUsers, error: listError } = await supabase
        .from('users')
        .select('email')
        .limit(10);

      console.log('DEBUG - First 10 emails in DB:', allUsers?.map(u => u.email));
      console.log('DEBUG - List error:', listError ? JSON.stringify(listError) : 'none');

      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'No account found with this email address.',
        debug: {
          searchedFor: searchEmail,
          queryError: userError?.message || null,
          dbHasUsers: allUsers?.length > 0
        }
      });
    }

    // Get user's API key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('key_prefix, last_four, created_at, last_used_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single();

    // Get usage stats for content tools
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usageData } = await supabase
      .from('usage')
      .select('tool, count')
      .eq('user_id', user.id)
      .eq('month', currentMonth);

    // Build usage object for content tools
    const usage = {};
    const tools = ['postup', 'chaptergen', 'threadgen'];
    const freeLimits = { postup: 3, chaptergen: 1, threadgen: 3 };

    tools.forEach(tool => {
      const toolUsage = usageData?.find(u => u.tool === tool);
      const used = toolUsage?.count || 0;
      const subscriptionField = `subscribed_${tool}`;
      const isSubscribed = user[subscriptionField] || false;

      usage[tool] = {
        used: used,
        limit: isSubscribed ? 'unlimited' : freeLimits[tool],
        subscribed: isSubscribed
      };
    });

    // Get Resume Builder stats
    const isResumePro = user.subscribed_resumebuilder || false;

    // Count user's resumes
    const { count: resumeCount } = await supabase
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get AI usage for resume features
    let resumeAiUsed = 0;
    if (isResumePro) {
      // Pro: count this month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyUsage } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter'])
        .gte('usage_date', startOfMonth.toISOString().split('T')[0]);

      resumeAiUsed = (monthlyUsage || []).reduce((sum, row) => sum + (row.usage_count || 0), 0);
    } else {
      // Free: count total lifetime usage
      const { data: totalUsage } = await supabase
        .from('ai_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .in('feature', ['resume_bullets', 'resume_summary', 'cover_letter']);

      resumeAiUsed = (totalUsage || []).reduce((sum, row) => sum + (row.usage_count || 0), 0);
    }

    usage.resumebuilder = {
      resumes: resumeCount || 0,
      aiUsed: resumeAiUsed,
      aiLimit: isResumePro ? 100 : 5,
      subscribed: isResumePro
    };

    return res.status(200).json({
      success: true,
      user: {
        email: user.email,
        createdAt: user.created_at,
        subscribed_resumebuilder: isResumePro
      },
      apiKey: keyData ? {
        prefix: keyData.key_prefix,
        lastFour: keyData.last_four,
        maskedKey: `${keyData.key_prefix}${'*'.repeat(44)}${keyData.last_four}`,
        createdAt: keyData.created_at,
        lastUsedAt: keyData.last_used_at
      } : null,
      subscriptions: {
        postup: user.subscribed_postup || false,
        chaptergen: user.subscribed_chaptergen || false,
        threadgen: user.subscribed_threadgen || false,
        resumebuilder: isResumePro
      },
      usage: usage
    });

  } catch (error) {
    console.error('Lookup error:', error);
    return res.status(500).json({ error: 'Failed to look up account' });
  }
};
