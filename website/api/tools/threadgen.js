const { authenticateRequest } = require('../../lib/auth');
const { canUseTool, incrementUsage } = require('../../lib/usage');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-free-trial');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if this is a free trial request (no API key, tracked in localStorage)
    const isFreeTrial = req.headers['x-free-trial'] === 'true';
    const hasApiKey = !!req.headers['x-api-key'];

    let user = null;
    let isSubscribed = false;
    let used = 0;
    let limit = 1;
    let subscribed = false;

    if (hasApiKey) {
      // Authenticate with API key
      const { user: authUser, error: authError } = await authenticateRequest(req);

      if (authError) {
        return res.status(401).json({ error: authError });
      }

      user = authUser;
      isSubscribed = user.subscribed_threadgen || false;

      // Check usage limits for authenticated users
      const usageResult = await canUseTool(user.id, 'threadgen', isSubscribed);
      used = usageResult.used;
      limit = usageResult.limit;
      subscribed = usageResult.subscribed;

      if (!usageResult.allowed) {
        return res.status(429).json({
          error: 'LIMIT_EXCEEDED',
          message: `You've used all ${limit} free ThreadGen generations. Subscribe for unlimited access.`,
          usage: { used, limit },
          upgradeUrl: '/pricing.html'
        });
      }
    } else if (!isFreeTrial) {
      // No API key and not marked as free trial
      return res.status(401).json({
        error: 'API key required. Use free trial or subscribe for access.',
        freeTrialAvailable: true
      });
    }
    // If isFreeTrial && !hasApiKey, we allow the request (frontend tracks usage)

    // Get action from request (hooks, body, full_thread, or quick actions)
    const { action } = req.body;

    if (action === 'hooks') {
      return await generateHooks(req, res, user, used, limit, subscribed);
    } else if (action === 'body') {
      return await generateBody(req, res, user, used, limit, subscribed);
    } else if (action === 'full_thread') {
      return await generateFullThread(req, res, user, used, limit, subscribed);
    } else if (action === 'stronger_hook' || action === 'add_tweet' || action === 'sharper_cta') {
      return await refineThread(req, res, action);
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }

  } catch (error) {
    console.error('ThreadGen error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};

// Generate hooks (step 1)
async function generateHooks(req, res, user, used, limit, subscribed) {
  const { content, emojiUsage, tone } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'content is required' });
  }

  if (content.length < 100) {
    return res.status(400).json({ error: 'Content is too short. Minimum 100 characters.' });
  }

  if (content.length > 20000) {
    return res.status(400).json({ error: 'Content too long. Maximum 20,000 characters.' });
  }

  // Build the hook prompt
  const emojiInstruction = emojiUsage
    ? '- You may use one emoji at the start if appropriate'
    : '- NO emojis at all';

  const toneInstructions = {
    'educational': 'TONE: Educational — clear, informative, helpful. Focus on teaching or sharing knowledge.',
    'spicy': 'TONE: Spicy/Hot Take — bold, controversial, challenges conventional wisdom. Take a strong stance. Be provocative but not offensive.',
    'story': 'TONE: Story-driven — narrative, personal, pulls reader into a journey. Start mid-action.',
    'opinionated': 'TONE: Opinionated — strong personal views, not afraid to disagree. Voice your perspective confidently.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions['educational'];

  const hookPrompt = `You generate Twitter thread hooks using ONLY the user's words and information.

${toneInstruction}

=== GOLDEN RULE ===
User's voice > AI smoothness. Amplify what's good. Don't sand down edges.

=== WHAT TO PRESERVE ===

1. SPECIFIC/CONCRETE DETAILS FIRST
If the input has a specific number, result, or moment ("54 people signed up. 17 showed up."), LEAD WITH THAT. Concrete details beat abstract statements. Numbers and outcomes are more scroll-stopping than concepts like "Did you know distribution isn't something you add later..."

2. CONTRARIAN/SCROLL-STOPPING OPENINGS
If the input starts with something edgy ("You might unfollow me but...", "I don't believe in X"), THAT IS THE HOOK. Use it directly. Don't replace with safe questions like "How do followers turn into leads?"

3. STRONGEST LINES — WORD FOR WORD
Quotable statements like "A good content strategy is a good CONVERSION strategy." stay EXACTLY as written. These are the thread's backbone.

4. VIVID, SPECIFIC EXAMPLES
Concrete details like "Emojis. Hashtags. I'm humbled to announce posts." stay exactly. Specificity > vague descriptions.

5. THE ENEMIES
Callouts to hook formulas, pods, carousels, engagement bait = POV. Keep them. Don't sanitize into generic advice.

6. THE CONTROVERSY
Spicy or polarizing content is intentional. Preserve it. Strong takes outperform safe marketing blog energy.

=== BANNED HOOKS ===
NEVER use these generic openings:
- "Have you ever..." (weak, generic)
- "Did you know..." (lecture mode)
- "What if I told you..." (clickbait)
- "Here's something most people don't know..." (generic)
If the input has a specific moment or tension ("debugging a webhook at 2am"), lead with THAT. Specific struggle > generic question.

=== HOOK STYLES ===
1. CURIOSITY: Surprising detail that creates an open loop
2. BOLD CLAIM: Strong statement (adjust boldness to tone)
3. STORY-DRIVEN: Start mid-action

=== FORMATTING ===
- Under 280 characters
- Grammatically correct
- Capital "I" only at sentence start; lowercase "i" elsewhere
- Keep "i" in sentences: "Day 5 i built X" (human) not "Day 5 built X" (robotic)
- Sound like a person talking, not a headline
- NO em dashes. Use commas, periods, or ellipses
${emojiInstruction}

=== FINAL QUALITY GATE ===
Before outputting each hook, verify:
1. Is it SPECIFIC (concrete detail, number, moment) not generic?
2. Does it avoid banned openings ("Have you ever...", "Did you know...", etc.)?
3. Does it have a SHARP POV or tension, not vague curiosity?
If NO to any, rewrite that hook.

=== OUTPUT FORMAT ===
Return JSON array with exactly 3 objects:
[{"type": "curiosity", "content": "..."}, {"type": "bold_claim", "content": "..."}, {"type": "story", "content": "..."}]

=== CONTENT ===
${content}`;

  // Call OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: 'OpenAI not configured' });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: hookPrompt }],
      temperature: 0.8,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenAI error:', errorData);
    return res.status(500).json({
      error: errorData?.error?.message || 'Failed to generate hooks'
    });
  }

  const data = await response.json();
  const rawResult = data.choices?.[0]?.message?.content;

  if (!rawResult) {
    return res.status(500).json({ error: 'Empty response from AI' });
  }

  // Parse the JSON response
  let hooks;
  try {
    const jsonMatch = rawResult.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      hooks = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Invalid format');
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to parse response. Please try again.' });
  }

  if (!Array.isArray(hooks) || hooks.length === 0) {
    return res.status(500).json({ error: 'No hooks generated. Please try again.' });
  }

  // Note: We don't increment usage here - only when the full thread is generated
  return res.status(200).json({
    success: true,
    result: hooks,
    usage: {
      used: used,
      limit: subscribed ? 'unlimited' : limit
    }
  });
}

// Generate body (step 2)
async function generateBody(req, res, user, used, limit, subscribed) {
  const { content, hook, emojiUsage, tone } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'content is required' });
  }

  if (!hook || hook.trim().length === 0) {
    return res.status(400).json({ error: 'hook is required' });
  }

  // Build emoji instruction
  const emojiInstruction = emojiUsage
    ? '- Emojis allowed sparingly'
    : '- NO emojis at all';

  const toneInstructions = {
    'educational': 'TONE: Educational — clear, informative, helpful. Teach or share knowledge.',
    'spicy': 'TONE: Spicy/Hot Take — bold, provocative, challenges norms. Don\'t play it safe.',
    'story': 'TONE: Story-driven — narrative flow, personal journey, emotional beats.',
    'opinionated': 'TONE: Opinionated — strong views, confident stance, not afraid to disagree.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions['educational'];

  // Build the body prompt
  const bodyPrompt = `You write Twitter thread bodies using ONLY the user's words and information.

SELECTED HOOK (Tweet 1):
${hook}

${toneInstruction}

=== GOLDEN RULE ===
User's voice > AI smoothness. Amplify what's good. Don't polish into blandness.

=== CONTENT RULES ===

1. NO DUPLICATES (CHECK ALL TWEETS)
- Tweet 2 must NOT repeat or paraphrase the hook
- Check NON-ADJACENT tweets too: if tweet 1 and tweet 3 (or tweet 2 and tweet 5) express the same core idea, merge or cut
- Repetition kills momentum even when tweets aren't back-to-back
- Before output, compare every tweet against every other tweet. If they say the same thing, merge into one and add new value

2. PRESERVE WORD-FOR-WORD
- Quotable lines like "A good content strategy is a good CONVERSION strategy." stay exactly
- Don't paraphrase gold into generic advice

3. PRESERVE VIVID EXAMPLES
- "Emojis. Hashtags. I'm humbled to announce posts." stays exactly
- Don't paraphrase into "typical LinkedIn behavior"

4. KEEP THE ENEMIES
- Callouts to pods, carousels, hook formulas, engagement bait = POV
- Don't sanitize into generic advice

5. KEEP THE CONTROVERSY
- Spicy/polarizing content is intentional. Preserve it.
- Don't sand down edges to sound "professional"

6. KEEP PERSONALITY
- Humor, relatability, casual asides stay
- "i wish we could go back haha" stays

7. USE THEIR ENDING (NON-NEGOTIABLE)
- Scan for the strongest closing line in the input. USE THAT.
- If they have a memorable moment ("TAKEOVER"), that's the ending
- BANNED MOTIVATIONAL ENDINGS:
  * "authenticity is your strongest asset"
  * "consistency is key"
  * "start being real" / "be yourself"
  * "that's the real secret"
  * "Embrace the chaos, it leads to clarity"
  * "Trust the process"
  * Any inspirational poster language
- If the input is honest and raw, the ending MUST match that tone
- DON'T pivot to motivational fluff at the end
- Their exact closing > any ending you generate

8. EXTRACT/SURFACE A SHARP POV
- Every thread needs a TAKE. Scan for an underlying opinion or insight.
- If there isn't one explicit, derive it from the story
- GOOD POV: "AI didn't make building easy. It just made debugging the real skill."
- BAD (not a POV): "Embrace the chaos" / "Keep going" / "That's the journey"
- The POV should be specific and arguable, not generic wisdom

9. PRESERVE STRUCTURE
- Sections become separate tweets
- Bullets become \\n line breaks within tweets

=== LENGTH ===
4-5 tweets after hook. MAX. Every tweet adds something new.

=== FORMATTING ===
- Each tweet under 280 characters
- Capital "I" only at sentence start; lowercase "i" elsewhere
- Keep first-person "i": "Day 5 i built X" (human) not "Day 5 built X" (robotic)
- NO em dashes. Use commas, periods, or ellipses
${emojiInstruction}

=== BANNED ===
Tweet 2 repeating tweet 1, paraphrasing quotable lines, paraphrasing vivid examples, sanitizing callouts, cutting personality, generic advice, motivational endings, dropping "i", em dashes, duplicate themes, "Embrace the chaos", "Trust the process", inspirational poster language

=== FINAL QUALITY GATE ===
Before outputting, verify:
1. Does the thread have a SHARP POV (specific, arguable take)? Not generic wisdom.
2. Does the ending match the tone of the input? If input is raw/honest, ending can't be motivational fluff.
3. Is there at least one concrete detail, number, or specific moment?
If ANY answer is NO, fix that part before outputting.

=== OUTPUT FORMAT ===
Return JSON array of tweet strings (NOT including the hook):
["tweet 2", "tweet 3 with\\nline breaks", ...]

=== CONTENT ===
${content}`;

  // Build the CTA prompt
  const threadContext = hook;
  const topic = content.slice(0, 200);

  const ctaPrompt = `Generate 3 STRONG endings for a Twitter thread. No weak throwaway lines.

THREAD TOPIC/CONTEXT:
${topic}

THREAD SO FAR:
${threadContext}

=== GOLDEN RULE ===
A punchy final line beats a forced question. If the thread has a strong story or moment, reference it specifically or let the content speak for itself.

=== QUALITY CHECK ===
BANNED GENERIC QUESTIONS (weak):
- "when did you realize..."
- "what's your experience with..."
- "have you ever felt..."
- "what do you think about..."
- Any vague engagement bait that could apply to any thread

BANNED MOTIVATIONAL ENDINGS:
- "Embrace the chaos, it leads to clarity"
- "Trust the process"
- "That's the real secret"
- "Be yourself" / "Stay authentic"
- Any inspirational poster language
- If the input is honest/raw, the ending MUST match that tone

If you write a question, it MUST reference something SPECIFIC from this thread.

=== ENDING STYLES ===

1. PUNCHY TAKEAWAY (PREFERRED)
- End with a bold, quotable line that lands
- Reference the specific story/moment from the thread
- "54 people signed up. 17 showed up. those 17 became my first customers."
- The thread's climax often IS the ending. Use it.

2. SPECIFIC CALLBACK
- Reference a concrete detail from the thread
- "that one email changed everything."
- "turns out the answer was in the spreadsheet the whole time."
- Must be specific to THIS thread, not generic

3. DIRECT CTA (only if appropriate)
- "if you're stuck on [specific thing from thread], DM me"
- "building something similar? let's talk"
- Skip this if the thread doesn't call for it

=== RULES ===
- Each ending under 280 characters
- NO weak exits ("that's it", "anyway", "idk")
- NO generic engagement questions
- NO motivational fluff
- End with PUNCH, not a whimper
- Capital "I" only at start; lowercase "i" elsewhere
- NO em dashes. Use commas, periods, or ellipses
${emojiInstruction}

=== FINAL QUALITY GATE ===
Before outputting each ending, verify:
1. Does it reference something SPECIFIC from this thread (not generic)?
2. Does it match the tone of the thread (if raw/honest, no motivational pivot)?
3. Is it a sharp POV or concrete callback, not vague wisdom?
If NO to any, rewrite that ending.

=== OUTPUT FORMAT ===
Return JSON array with exactly 3 objects:
[{"type": "takeaway", "content": "..."}, {"type": "callback", "content": "..."}, {"type": "cta", "content": "..."}]`;

  // Call OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: 'OpenAI not configured' });
  }

  // Make both API calls in parallel
  const [bodyResponse, ctaResponse] = await Promise.all([
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: bodyPrompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    }),
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: ctaPrompt }],
        temperature: 0.8,
        max_tokens: 600
      })
    })
  ]);

  if (!bodyResponse.ok) {
    const errorData = await bodyResponse.json().catch(() => ({}));
    console.error('OpenAI body error:', errorData);
    return res.status(500).json({
      error: errorData?.error?.message || 'Failed to generate thread body'
    });
  }

  if (!ctaResponse.ok) {
    const errorData = await ctaResponse.json().catch(() => ({}));
    console.error('OpenAI CTA error:', errorData);
    return res.status(500).json({
      error: errorData?.error?.message || 'Failed to generate CTAs'
    });
  }

  const bodyData = await bodyResponse.json();
  const ctaData = await ctaResponse.json();

  const rawBody = bodyData.choices?.[0]?.message?.content;
  const rawCtas = ctaData.choices?.[0]?.message?.content;

  if (!rawBody || !rawCtas) {
    return res.status(500).json({ error: 'Empty response from AI' });
  }

  // Parse the JSON responses
  let bodyTweets, ctas;
  try {
    const bodyMatch = rawBody.match(/\[[\s\S]*\]/);
    if (bodyMatch) {
      bodyTweets = JSON.parse(bodyMatch[0]);
    } else {
      throw new Error('Invalid body format');
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to parse body response. Please try again.' });
  }

  try {
    const ctaMatch = rawCtas.match(/\[[\s\S]*\]/);
    if (ctaMatch) {
      ctas = JSON.parse(ctaMatch[0]);
    } else {
      throw new Error('Invalid CTA format');
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to parse CTA response. Please try again.' });
  }

  // Validate tweet lengths
  bodyTweets = bodyTweets.map(tweet => {
    if (tweet.length > 280) {
      return tweet.substring(0, 277) + '...';
    }
    return tweet;
  });

  // Increment usage after successful generation (only for authenticated users)
  if (user) {
    await incrementUsage(user.id, 'threadgen');
  }

  return res.status(200).json({
    success: true,
    result: {
      body: bodyTweets,
      ctas: ctas
    },
    usage: {
      used: used + 1,
      limit: subscribed ? 'unlimited' : limit
    }
  });
}

// Generate complete thread at once (simplified flow)
async function generateFullThread(req, res, user, used, limit, subscribed) {
  const { content, tone, tweetNumbering, emojiUsage } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'content is required' });
  }

  if (content.length < 100) {
    return res.status(400).json({ error: 'Content is too short. Minimum 100 characters.' });
  }

  if (content.length > 20000) {
    return res.status(400).json({ error: 'Content too long. Maximum 20,000 characters.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: 'Anthropic API not configured' });
  }

  const emojiInstruction = emojiUsage
    ? 'You may use emojis sparingly where appropriate.'
    : 'Do NOT use any emojis.';

  const toneInstructions = {
    'educational': 'TONE: Educational — clear, informative, helpful. Focus on teaching or sharing knowledge.',
    'spicy': 'TONE: Spicy/Hot Take — bold, controversial, challenges conventional wisdom. Be provocative but not offensive.',
    'story': 'TONE: Story-driven — narrative, personal, pulls reader into a journey. Start mid-action.',
    'opinionated': 'TONE: Opinionated — strong personal views, not afraid to disagree. Voice your perspective confidently.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions['educational'];

  const systemPrompt = `You are a Twitter thread expert. Create engaging Twitter threads that capture attention and drive engagement.

${toneInstruction}

${emojiInstruction}

Rules:
1. Each tweet must be under 280 characters
2. The first tweet (hook) must grab attention immediately
3. Use short, punchy sentences
4. Include a clear CTA at the end
5. Preserve the author's voice and key points
6. Make it scannable and easy to read

Return ONLY a JSON array of tweets. Example:
["First tweet (hook)", "Second tweet", "Third tweet", "Final tweet with CTA"]`;

  const userPrompt = `Transform this content into an engaging Twitter thread (4-8 tweets):

${content}

Return ONLY a JSON array of tweets, nothing else.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic error:', errorData);
      return res.status(500).json({
        error: errorData?.error?.message || 'Failed to generate thread'
      });
    }

    const data = await response.json();
    const rawResult = data.content?.[0]?.text;

    if (!rawResult) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    // Parse the JSON array
    let tweets;
    try {
      const match = rawResult.match(/\[[\s\S]*\]/);
      if (match) {
        tweets = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (e) {
      // Try to parse as newline-separated tweets
      tweets = rawResult.split('\n\n').filter(t => t.trim());
    }

    // Validate and trim tweets
    tweets = tweets.map(tweet => {
      const cleaned = tweet.replace(/^\d+[\/\.]\s*/, ''); // Remove existing numbering
      if (cleaned.length > 280) {
        return cleaned.substring(0, 277) + '...';
      }
      return cleaned;
    });

    // Add numbering if requested
    if (tweetNumbering) {
      tweets = tweets.map((tweet, i) => `${i + 1}/${tweets.length}\n${tweet}`);
    }

    // Increment usage after successful generation
    if (user) {
      await incrementUsage(user.id, 'threadgen');
    }

    return res.status(200).json({
      success: true,
      result: tweets,
      usage: {
        used: used + 1,
        limit: subscribed ? 'unlimited' : limit
      }
    });

  } catch (error) {
    console.error('Full thread generation error:', error);
    return res.status(500).json({ error: 'Failed to generate thread' });
  }
}

// Refine thread (quick actions)
async function refineThread(req, res, action) {
  const { content, currentThread, tone, tweetNumbering, emojiUsage } = req.body;

  if (!currentThread) {
    return res.status(400).json({ error: 'currentThread is required for refinement' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: 'Anthropic API not configured' });
  }

  const emojiInstruction = emojiUsage
    ? 'You may use emojis sparingly.'
    : 'Do NOT use any emojis.';

  const actionPrompts = {
    'stronger_hook': `Rewrite the first tweet of this thread with a stronger, more attention-grabbing hook. Make it more compelling and scroll-stopping.

Current thread:
${currentThread}

Return the COMPLETE thread as a JSON array with the improved hook.`,

    'add_tweet': `Add one more tweet to this thread that adds value. It should fit naturally and maintain the thread's tone.

Current thread:
${currentThread}

Return the COMPLETE thread as a JSON array with the new tweet added.`,

    'sharper_cta': `Rewrite the last tweet of this thread with a sharper, more compelling call-to-action. Make it drive engagement.

Current thread:
${currentThread}

Return the COMPLETE thread as a JSON array with the improved CTA.`
  };

  const userPrompt = actionPrompts[action];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.7,
        system: `You are a Twitter thread expert. ${emojiInstruction} Return ONLY a JSON array of tweets.`,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(500).json({
        error: errorData?.error?.message || 'Failed to refine thread'
      });
    }

    const data = await response.json();
    const rawResult = data.content?.[0]?.text;

    if (!rawResult) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    // Parse the JSON array
    let tweets;
    try {
      const match = rawResult.match(/\[[\s\S]*\]/);
      if (match) {
        tweets = JSON.parse(match[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (e) {
      tweets = rawResult.split('\n\n').filter(t => t.trim());
    }

    // Validate and trim tweets
    tweets = tweets.map(tweet => {
      const cleaned = tweet.replace(/^\d+[\/\.]\s*/, '');
      if (cleaned.length > 280) {
        return cleaned.substring(0, 277) + '...';
      }
      return cleaned;
    });

    // Add numbering if requested
    if (tweetNumbering) {
      tweets = tweets.map((tweet, i) => `${i + 1}/${tweets.length}\n${tweet}`);
    }

    return res.status(200).json({
      success: true,
      result: tweets
    });

  } catch (error) {
    console.error('Thread refinement error:', error);
    return res.status(500).json({ error: 'Failed to refine thread' });
  }
}
