const { authenticateRequest } = require('../../lib/auth');
const { canUseTool, incrementUsage } = require('../../lib/usage');

// ============================================================================
// CONSOLIDATED TOOLS API - Routes to postup, threadgen, or chaptergen
// ============================================================================

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

  // Get tool from URL parameter
  const { tool } = req.query;

  if (!tool || !['postup', 'threadgen', 'chaptergen'].includes(tool)) {
    return res.status(404).json({ error: 'Tool not found. Valid tools: postup, threadgen, chaptergen' });
  }

  // Route to the appropriate handler
  switch (tool) {
    case 'postup':
      return handlePostUp(req, res);
    case 'threadgen':
      return handleThreadGen(req, res);
    case 'chaptergen':
      return handleChapterGen(req, res);
    default:
      return res.status(404).json({ error: 'Tool not found' });
  }
};

// ============================================================================
// POSTUP HANDLER - LinkedIn Post Generator
// ============================================================================

const {
  buildSystemPrompt,
  buildGenerationPrompt,
  buildRefinementPrompt
} = require('../../lib/prompts');

async function handlePostUp(req, res) {
  try {
    // Check if this is a free trial request (no API key, tracked in localStorage)
    const isFreeTrial = req.headers['x-free-trial'] === 'true';
    const hasApiKey = !!req.headers['x-api-key'];

    let user = null;
    let isSubscribed = false;

    if (hasApiKey) {
      // Authenticate with API key
      const { user: authUser, error: authError } = await authenticateRequest(req);

      if (authError) {
        return res.status(401).json({ error: authError });
      }

      user = authUser;
      isSubscribed = user.subscribed_postup || false;

      // Check usage limits for authenticated users
      const { allowed, used, limit, subscribed } = await canUseTool(user.id, 'postup', isSubscribed);

      if (!allowed) {
        return res.status(429).json({
          error: 'LIMIT_EXCEEDED',
          message: `You've used all ${limit} free PostUp generations. Subscribe for unlimited access.`,
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

    // Get content from request
    const content = req.body.content;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required' });
    }

    if (content.length < 1) {
      return res.status(400).json({ error: 'Content is too short.' });
    }

    if (content.length > 10000) {
      return res.status(400).json({ error: 'Content too long. Maximum 10000 characters.' });
    }

    // Call Anthropic Claude API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      return res.status(500).json({ error: 'Anthropic API not configured' });
    }

    // Get options from request body
    const { style, tone, inputType, niche, action, currentPost } = req.body;

    // Build system prompt from shared prompts module
    const systemPrompt = buildSystemPrompt(tone, inputType, niche, style);

    // Build user prompt - either generation or refinement
    let userPrompt;
    if (action && currentPost) {
      userPrompt = buildRefinementPrompt(currentPost, action);
      if (userPrompt === null) {
        return res.status(400).json({ error: 'Invalid action specified' });
      }
    } else {
      userPrompt = buildGenerationPrompt(content);
    }

    // Build the request payload
    const requestPayload = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 2500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    };

    // Anthropic Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { rawError: errorText };
      }

      return res.status(500).json({
        error: errorData?.error?.message || errorData?.message || 'Failed to generate content'
      });
    }

    const data = await response.json();
    const rawResult = data.content?.[0]?.text;

    if (!rawResult) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    // Process the response
    let result;
    try {
      if (action) {
        // Quick actions return plain text
        result = rawResult.trim();
      } else {
        // Normal generation returns JSON
        result = JSON.parse(rawResult);
      }
    } catch (e) {
      console.error('Process response error:', e);
      return res.status(500).json({ error: 'Failed to process response. Please try again.' });
    }

    // Post-processing: Enforce rules in code
    const bannedStarts = ['I used to', 'I realized', 'I learned', 'I thought', 'I discovered', 'A few years ago', 'When I started', 'When I first'];

    function cleanContent(text) {
      if (!text) return text;
      let cleaned = text;

      // Remove ALL types of dashes
      cleaned = cleaned.replace(/ — /g, ', ');
      cleaned = cleaned.replace(/ – /g, ', ');
      cleaned = cleaned.replace(/—/g, ', ');
      cleaned = cleaned.replace(/–/g, ', ');
      cleaned = cleaned.replace(/\u2014/g, ', ');
      cleaned = cleaned.replace(/\u2013/g, ', ');
      cleaned = cleaned.replace(/\u2012/g, ', ');
      cleaned = cleaned.replace(/\u2015/g, ', ');

      // Clean up spacing
      cleaned = cleaned.replace(/  +/g, ' ');
      cleaned = cleaned.replace(/ ,/g, ',');
      cleaned = cleaned.replace(/,,+/g, ',');
      cleaned = cleaned.replace(/, ,/g, ',');

      return cleaned;
    }

    function hasBannedOpener(text) {
      if (!text) return false;
      const lower = text.toLowerCase().trim();
      return bannedStarts.some(phrase => lower.startsWith(phrase.toLowerCase()));
    }

    // Process the result
    if (action) {
      // Quick action - just clean the text
      result = cleanContent(result);
    } else if (result && result.variations) {
      // Full generation - clean each variation and flag banned openers
      let hasBannedContent = false;

      result.variations = result.variations.map((v) => {
        const cleanedContent = cleanContent(v.content);
        const cleanedHook = cleanContent(v.hookLine);

        if (hasBannedOpener(cleanedContent)) {
          hasBannedContent = true;
        }

        return {
          ...v,
          content: cleanedContent,
          hookLine: cleanedHook
        };
      });

      // Clean hook alternatives too
      if (result.hookAlternatives) {
        result.hookAlternatives = result.hookAlternatives.map(h => ({
          ...h,
          text: cleanContent(h.text)
        }));
      }

      // Add warning if banned content detected
      if (hasBannedContent) {
        result._warning = 'Output contained banned opener phrases. Consider regenerating.';
      }
    }

    // Increment usage after successful generation (only for authenticated users)
    if (user) {
      await incrementUsage(user.id, 'postup');
    }

    return res.status(200).json({
      success: true,
      result: result,
      isFreeTrial: !user,
      usage: user ? {
        used: (await canUseTool(user.id, 'postup', isSubscribed)).used,
        limit: isSubscribed ? 'unlimited' : 3
      } : null
    });

  } catch (error) {
    console.error('PostUp error:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}

// ============================================================================
// THREADGEN HANDLER - Twitter Thread Generator
// ============================================================================

const THREAD_TYPE_PROMPTS = {
  viral_narrative: `THREAD TYPE: Viral Narrative
- Build tension and curiosity throughout
- Use cliffhangers between tweets
- End with a surprising twist or powerful insight
- Make readers NEED to see what happens next
- Structure: Hook → Rising tension → Peak moment → Resolution/insight`,

  story: `THREAD TYPE: Story Thread
- Start in the middle of the action (in medias res)
- Use specific details: dates, places, names, dialogue
- Show emotions and stakes, don't just tell
- Each tweet should advance the narrative
- Structure: Scene-setting → Conflict → Journey → Turning point → Lesson`,

  list: `THREAD TYPE: List Thread
- Clear, numbered points (but don't include numbers in tweets - that's handled separately)
- Each tweet = one distinct, actionable point
- Front-load the most valuable insights
- Make each point standalone but connected
- Structure: Promise in hook → Point-by-point value → Summary/CTA`,

  tutorial: `THREAD TYPE: Tutorial/How-to
- Step-by-step progression
- Be specific and actionable
- Include concrete examples or commands
- Anticipate and address common mistakes
- Structure: Problem/Goal → Step 1 → Step 2 → ... → Result/Next steps`,

  hot_take: `THREAD TYPE: Hot Take
- Lead with your controversial opinion IMMEDIATELY
- Challenge conventional wisdom directly
- Back up with unexpected evidence or logic
- Be willing to alienate some readers
- Structure: Bold claim → "Here's why" → Evidence → Double down → Challenge to reader`
};

async function handleThreadGen(req, res) {
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
    } else if (action === 'stronger_hook' || action === 'add_tweet' || action === 'sharper_cta' || action === 'more_viral' || action === 'rewrite_hook') {
      return await refineThread(req, res, action);
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }

  } catch (error) {
    console.error('ThreadGen error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

// Generate hooks (step 1)
async function generateHooks(req, res, user, used, limit, subscribed) {
  const { content, emojiUsage, tone, threadType } = req.body;

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
    'educational': 'TONE: Educational - clear, informative, helpful. Focus on teaching or sharing knowledge.',
    'spicy': 'TONE: Spicy/Hot Take - bold, controversial, challenges conventional wisdom. Take a strong stance. Be provocative but not offensive.',
    'story': 'TONE: Story-driven - narrative, personal, pulls reader into a journey. Start mid-action.',
    'opinionated': 'TONE: Opinionated - strong personal views, not afraid to disagree. Voice your perspective confidently.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions['educational'];
  const threadTypeInstruction = THREAD_TYPE_PROMPTS[threadType] || THREAD_TYPE_PROMPTS['viral_narrative'];

  const hookPrompt = `You generate Twitter thread hooks using ONLY the user's words and information.

${toneInstruction}

${threadTypeInstruction}

=== GOLDEN RULE ===
User's voice > AI smoothness. Amplify what's good. Don't sand down edges.

=== WHAT TO PRESERVE ===

1. SPECIFIC/CONCRETE DETAILS FIRST
If the input has a specific number, result, or moment ("54 people signed up. 17 showed up."), LEAD WITH THAT. Concrete details beat abstract statements. Numbers and outcomes are more scroll-stopping than concepts like "Did you know distribution isn't something you add later..."

2. CONTRARIAN/SCROLL-STOPPING OPENINGS
If the input starts with something edgy ("You might unfollow me but...", "I don't believe in X"), THAT IS THE HOOK. Use it directly. Don't replace with safe questions like "How do followers turn into leads?"

3. STRONGEST LINES - WORD FOR WORD
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
  const { content, hook, emojiUsage, tone, threadType } = req.body;

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
    'educational': 'TONE: Educational - clear, informative, helpful. Teach or share knowledge.',
    'spicy': 'TONE: Spicy/Hot Take - bold, provocative, challenges norms. Don\'t play it safe.',
    'story': 'TONE: Story-driven - narrative flow, personal journey, emotional beats.',
    'opinionated': 'TONE: Opinionated - strong views, confident stance, not afraid to disagree.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions['educational'];
  const threadTypeInstruction = THREAD_TYPE_PROMPTS[threadType] || THREAD_TYPE_PROMPTS['viral_narrative'];

  // Build the body prompt
  const bodyPrompt = `You write Twitter thread bodies using ONLY the user's words and information.

SELECTED HOOK (Tweet 1):
${hook}

${toneInstruction}

${threadTypeInstruction}

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
  const { content, tone, tweetNumbering, emojiUsage, threadType } = req.body;

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
    'educational': 'TONE: Educational - clear, informative, helpful. Focus on teaching or sharing knowledge.',
    'spicy': 'TONE: Spicy/Hot Take - bold, controversial, challenges conventional wisdom. Be provocative but not offensive.',
    'story': 'TONE: Story-driven - narrative, personal, pulls reader into a journey. Start mid-action.',
    'opinionated': 'TONE: Opinionated - strong personal views, not afraid to disagree. Voice your perspective confidently.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions['educational'];
  const threadTypeInstruction = THREAD_TYPE_PROMPTS[threadType] || THREAD_TYPE_PROMPTS['viral_narrative'];

  const systemPrompt = `You are a Twitter thread expert. Create engaging Twitter threads that capture attention and drive engagement.

${toneInstruction}

${threadTypeInstruction}

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

Return the COMPLETE thread as a JSON array with the improved CTA.`,

    'more_viral': `Rewrite this ENTIRE thread for MAXIMUM virality and engagement:

1. Make the hook impossible to scroll past - more controversial, pattern-interrupting, or calling the reader out
2. Add tension and curiosity throughout - each tweet should make them NEED to see the next one
3. Include at least one "screenshot-worthy" quotable line
4. Make the ending shareable - something people want to retweet or argue about
5. Increase emotional stakes - shock, recognition, "finally someone said it"
6. Cut anything predictable or safe

Current thread:
${currentThread}

Return the COMPLETE thread as a JSON array, rewritten for maximum viral potential.`,

    'rewrite_hook': `Generate a completely NEW hook for this thread. The new hook should:
- Take a different angle or approach than the current one
- Be more attention-grabbing and scroll-stopping
- Create curiosity or tension that pulls readers in
- Feel fresh, not a slight variation of the original

Current thread:
${currentThread}

Return the COMPLETE thread as a JSON array with the brand new hook.`
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

// ============================================================================
// CHAPTERGEN HANDLER - YouTube Chapter Generator
// ============================================================================

const { YoutubeTranscript } = require('youtube-transcript');
const { getSubtitles } = require('youtube-captions-scraper');

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();

  // If it's already just an ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // Standard youtube.com/watch?v= format
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be short format
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/ format
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // youtube.com/v/ format
  const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];

  // youtube.com/shorts/ format
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

// Format transcript items into readable text with timestamps
function formatTranscript(items) {
  return items.map(item => {
    const timestamp = formatTime(item.offset || item.start * 1000);
    const text = (item.text || item.text).replace(/\n/g, ' ').trim();
    return `[${timestamp}] ${text}`;
  }).join('\n');
}

// Format captions-scraper items (different structure)
function formatCaptionsScraperTranscript(items) {
  return items.map(item => {
    const timestamp = formatTimeSeconds(parseFloat(item.start));
    const text = item.text.replace(/\n/g, ' ').trim();
    return `[${timestamp}] ${text}`;
  }).join('\n');
}

// Convert milliseconds to MM:SS or HH:MM:SS format
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Convert seconds to MM:SS or HH:MM:SS format
function formatTimeSeconds(totalSeconds) {
  totalSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Method 1: youtube-transcript library
async function tryYoutubeTranscript(videoId) {
  console.log('Trying youtube-transcript library...');
  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error('No transcript returned');
  }

  const transcript = formatTranscript(transcriptItems);
  const lastItem = transcriptItems[transcriptItems.length - 1];
  const videoDuration = formatTime(lastItem.offset + lastItem.duration);

  return {
    success: true,
    transcript,
    videoDuration,
    itemCount: transcriptItems.length,
    method: 'youtube-transcript'
  };
}

// Method 2: youtube-captions-scraper library
async function tryCaptionsScraper(videoId) {
  console.log('Trying youtube-captions-scraper library...');

  // Try English first, then auto-generated
  const languages = ['en', 'en-US', 'en-GB', 'a.en'];

  for (const lang of languages) {
    try {
      const captions = await getSubtitles({ videoID: videoId, lang: lang });

      if (captions && captions.length > 0) {
        const transcript = formatCaptionsScraperTranscript(captions);
        const lastItem = captions[captions.length - 1];
        const videoDuration = formatTimeSeconds(parseFloat(lastItem.start) + parseFloat(lastItem.dur || 0));

        return {
          success: true,
          transcript,
          videoDuration,
          itemCount: captions.length,
          method: 'youtube-captions-scraper',
          language: lang
        };
      }
    } catch (e) {
      console.log(`Language ${lang} failed:`, e.message);
      continue;
    }
  }

  throw new Error('No captions found in any language');
}

// Fetch transcript from YouTube - tries multiple methods
async function fetchYouTubeTranscript(url) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return { error: 'Invalid YouTube URL or video ID' };
  }

  console.log('Fetching transcript for video:', videoId);

  // Try Method 1: youtube-transcript
  try {
    const result = await tryYoutubeTranscript(videoId);
    console.log('Success with youtube-transcript');
    return result;
  } catch (error1) {
    console.log('youtube-transcript failed:', error1.message);

    // Try Method 2: youtube-captions-scraper
    try {
      const result = await tryCaptionsScraper(videoId);
      console.log('Success with youtube-captions-scraper');
      return result;
    } catch (error2) {
      console.log('youtube-captions-scraper failed:', error2.message);

      // Both methods failed - return helpful error
      if (error1.message?.includes('Transcript is disabled') || error2.message?.includes('disabled')) {
        return { error: 'Transcripts are disabled for this video. Try pasting the transcript manually.' };
      }
      if (error1.message?.includes('Video unavailable') || error1.message?.includes('not found')) {
        return { error: 'Video not found. Check the URL and try again.' };
      }

      return { error: 'Could not fetch transcript automatically. Try pasting it manually.' };
    }
  }
}

// Output type prompts for ChapterGen
const OUTPUT_TYPE_PROMPTS = {
  chapters: {
    system: `You are a YouTube chapter expert. Create chapters at the START of each segment, not where it's described.

CRITICAL - CHAPTER TIMING:
Chapters mark where a viewer should SKIP TO to watch a segment FROM THE BEGINNING.

The problem: Captions often describe what just happened. If a play happens from 0:02-0:19, the player's name appears in captions at 0:19 (after the play). But the chapter should be at 0:02 (where the play STARTS).

How to find the correct timestamp:
1. When you see a name/topic mentioned, look BACKWARDS to find where that segment STARTED
2. For highlights: Each clip starts right after the previous clip ends. New clip = new chapter at its START
3. For list videos: Chapter starts at "next up", "number X is", "moving on to" - NOT in the middle of discussion
4. Look for gaps/transitions between segments - that's where the new chapter begins

Think: "If someone clicks this chapter, where do they land to see the WHOLE segment?"

OTHER RULES:
- SHORT TITLES (3-5 words): "[Player Name]'s [Play Type]" or "[Item] - [Detail]"
- Copy names EXACTLY as spelled in transcript
- Capture EVERY distinct play/item - don't skip any
- First chapter at 0:00: "Intro" or brief topic (2-3 words)`,
    user: (transcript, videoDuration) => `Create YouTube chapters for this video. Duration: ${videoDuration}

CRITICAL - READ CAREFULLY:
The transcript shows timestamps where words are SPOKEN, but chapters should be where segments START.

Example problem:
- [0:02] (play begins - no caption yet)
- [0:19] "What a goal by Caufield!" (caption appears AFTER the play)
- WRONG: 0:19 Caufield's Goal (this is the END)
- RIGHT: 0:02 Caufield's Goal (this is the START)

For each chapter: Look at the context BEFORE the description to find where that segment actually began. Place the chapter at the START of the action, not where it's narrated.

Transcript with context:
${transcript}

Return ONLY chapters in format (timestamps at segment STARTS):
0:00 Intro
0:02 Player's Goal`
  },

  clips: {
    system: `You are a video editor identifying clip-worthy moments from longer content.

Find 3-5 moments that would work as standalone short clips (30-60 seconds).

GOOD CLIPS HAVE:
- A complete thought or moment (doesn't need context)
- Something interesting happens (story, tip, reaction, insight)
- Clear start and end points

AVOID:
- Rambling without payoff
- Moments that need prior context
- Incomplete thoughts`,
    user: (transcript, videoDuration) => `Find the 3-5 most interesting moments to clip from this video. Duration: ${videoDuration}

Transcript:
${transcript}

Return in this simple format:

CLIP 1: [start] - [end]
Hook: [One sentence describing what happens in this moment]

CLIP 2: [start] - [end]
Hook: [One sentence describing what happens in this moment]

CLIP 3: [start] - [end]
Hook: [One sentence describing what happens in this moment]`
  },

  blog: {
    system: `You are turning a video transcript into a simple blog outline.

Create a clean, useful outline that someone could actually write from.
Use specific details from the transcript, not generic filler.
No emojis. No marketing fluff. No "let's dive in" phrases.`,
    user: (transcript, videoDuration) => `Create a blog outline from this transcript. Duration: ${videoDuration}

Transcript:
${transcript}

Return in this simple format:

HEADLINE: [Clear, simple title based on the content]

INTRO: [2-3 sentences setting up the topic - based on how the video starts]

SECTIONS:
1. [Section title] - [one sentence summary of what to cover]
2. [Section title] - [one sentence summary]
3. [Section title] - [one sentence summary]
4. [Section title] - [one sentence summary]

KEY POINTS TO INCLUDE:
- [specific detail or quote from the transcript]
- [specific detail or quote from the transcript]
- [specific detail or quote from the transcript]
- [specific detail or quote from the transcript]

CONCLUSION ANGLE: [one sentence on how to wrap it up]`
  },

  highlights: {
    system: `You extract the most important moments from video transcripts.

List the key points someone would want to know if they don't have time to watch.
No emojis. No labels. No verbose explanations.
Just timestamp, dash, and one short sentence.`,
    user: (transcript, videoDuration) => `Extract the key highlights from this transcript. Duration: ${videoDuration}

Transcript:
${transcript}

Return a simple list in this exact format:

KEY HIGHLIGHTS

0:00 - [One sentence describing the key point]
1:23 - [One sentence describing the key point]
3:45 - [One sentence describing the key point]
5:12 - [One sentence describing the key point]

List 8-15 of the most important moments. Keep each point to one short sentence.`
  }
};

// Spelling correction system prompt
const SPELLING_PROMPT = `You are a spelling correction expert for sports players, celebrities, YouTubers, and brand names.

Your job: Fix obvious misspellings in YouTube chapter titles caused by auto-caption errors.

Common patterns to fix:
- Phonetic spellings: "Cfield" -> "Caufield", "Jack Eel" -> "Jack Eichel", "Ovetshkin" -> "Ovechkin"
- Split names: "Mc David" -> "McDavid", "Le Bron" -> "LeBron"
- Sound-alikes: "Croz B" -> "Crosby", "Dry Seidel" -> "Draisaitl"
- Missing letters: "Gretzky" is correct, "Gretsky" is wrong

Rules:
- ONLY fix obvious misspellings of real names
- Do NOT change timestamps
- Do NOT change chapter structure or wording (except the misspelled name)
- If unsure, leave the name as-is
- Keep everything else exactly the same`;

// Build refinement prompt for quick actions
function buildChapterRefinementPrompt(currentChapters, action, transcript) {
  const actionPrompts = {
    'more_chapters': `Add more chapters to break this video into smaller segments. Find additional natural breakpoints in the content.

Current chapters:
${currentChapters}

Reference transcript:
${transcript}

Return the improved chapters with more granular timestamps. Keep existing chapters but add new ones between them where appropriate.`,

    'shorter_titles': `Make these chapter titles shorter and punchier. Aim for 2-4 words per title.

Current chapters:
${currentChapters}

Return the same chapters with shorter, more scannable titles. Keep the same timestamps.`,

    'add_timestamps': `Find more section breaks and add additional timestamps to these chapters.

Current chapters:
${currentChapters}

Reference transcript:
${transcript}

Add more timestamps to capture transitions and topic changes that were missed. Return the complete chapter list with additions.`
  };

  return actionPrompts[action] || null;
}

// Fix name spellings (second pass)
async function fixNameSpellings(chapters, openaiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SPELLING_PROMPT },
          { role: 'user', content: `Fix any obvious name misspellings in these YouTube chapters. Only correct names that are clearly wrong phonetic transcriptions of real sports players, celebrities, or brands.\n\nChapters:\n${chapters}\n\nReturn the corrected chapters in the exact same format. If no corrections needed, return them unchanged.` }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      const corrected = data.choices?.[0]?.message?.content?.trim();
      if (corrected) return corrected;
    }
  } catch (e) {
    console.error('Spelling correction failed:', e);
  }
  return chapters;
}

async function handleChapterGen(req, res) {
  try {
    // Check if this is a free trial request
    const isFreeTrial = req.headers['x-free-trial'] === 'true';
    const hasApiKey = !!req.headers['x-api-key'];

    let user = null;
    let isSubscribed = false;

    if (hasApiKey) {
      // Authenticate with API key
      const { user: authUser, error: authError } = await authenticateRequest(req);

      if (authError) {
        return res.status(401).json({ error: authError });
      }

      user = authUser;
      isSubscribed = user.subscribed_chaptergen || false;

      // Check usage limits for authenticated users
      const { allowed, used, limit, subscribed } = await canUseTool(user.id, 'chaptergen', isSubscribed);

      if (!allowed) {
        return res.status(429).json({
          error: 'LIMIT_EXCEEDED',
          message: `You've used all ${limit} free ChapterGen generations. Subscribe for unlimited access.`,
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

    // Get parameters from request
    const { transcript: providedTranscript, youtubeUrl, action, currentChapters, fetchOnly, outputType } = req.body;

    let transcript = providedTranscript;

    // If YouTube URL provided, fetch transcript first
    if (youtubeUrl) {
      const fetchResult = await fetchYouTubeTranscript(youtubeUrl);

      if (fetchResult.error) {
        return res.status(400).json({
          error: fetchResult.error,
          requiresManualEntry: true
        });
      }

      // If fetchOnly mode, just return the transcript
      if (fetchOnly) {
        return res.status(200).json({
          success: true,
          transcript: fetchResult.transcript,
          videoDuration: fetchResult.videoDuration,
          itemCount: fetchResult.itemCount
        });
      }

      transcript = fetchResult.transcript;
    }

    // For quick actions, we need currentChapters
    if (action && !currentChapters) {
      return res.status(400).json({ error: 'currentChapters is required for quick actions' });
    }

    // For normal generation, we need transcript
    if (!action && (!transcript || transcript.trim().length === 0)) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    if (transcript && transcript.length < 100) {
      return res.status(400).json({ error: 'Transcript is too short. Minimum 100 characters.' });
    }

    if (transcript && transcript.length > 50000) {
      return res.status(400).json({ error: 'Transcript too long. Maximum 50,000 characters.' });
    }

    // Call OpenAI API
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI not configured' });
    }

    let userPrompt;
    let systemPrompt;

    // Check if this is a quick action refinement (only for chapters output type)
    if (action && currentChapters) {
      userPrompt = buildChapterRefinementPrompt(currentChapters, action, transcript || '');
      if (!userPrompt) {
        return res.status(400).json({ error: 'Invalid action specified' });
      }
      systemPrompt = 'You are a YouTube chapter expert. Improve the given chapters based on the request. Return ONLY the improved chapters in the same format (timestamp followed by title, one per line).';
    } else {
      // Extract video duration from last timestamp in transcript
      const timestampMatches = transcript.match(/\[?(\d+):(\d+)\]?/g);
      let videoDuration = '10:00';
      if (timestampMatches && timestampMatches.length > 0) {
        videoDuration = timestampMatches[timestampMatches.length - 1].replace(/[\[\]]/g, '');
      }

      // Build prompts based on output type
      const selectedOutputType = outputType || 'chapters';
      const prompts = OUTPUT_TYPE_PROMPTS[selectedOutputType] || OUTPUT_TYPE_PROMPTS.chapters;
      systemPrompt = prompts.system;
      userPrompt = prompts.user(transcript, videoDuration);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI error:', errorData);
      return res.status(500).json({
        error: errorData?.error?.message || 'Failed to generate chapters'
      });
    }

    const data = await response.json();
    const rawResult = data.choices?.[0]?.message?.content;

    if (!rawResult) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    // Process the response
    let result = rawResult.trim();

    // Run second pass: Fix name spellings (only for chapters output type, skip for quick actions)
    const selectedOutputType = outputType || 'chapters';
    if (!action && selectedOutputType === 'chapters') {
      result = await fixNameSpellings(result, openaiKey);
    }

    // Increment usage after successful generation (only for new generations, not refinements)
    // Increment usage only for authenticated users
    if (user && !action) {
      await incrementUsage(user.id, 'chaptergen');
    }

    return res.status(200).json({
      success: true,
      result: result,
      outputType: selectedOutputType,
      isFreeTrial: !user,
      usage: user ? {
        used: (await canUseTool(user.id, 'chaptergen', isSubscribed)).used,
        limit: isSubscribed ? 'unlimited' : 1
      } : null
    });

  } catch (error) {
    console.error('ChapterGen error:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}
