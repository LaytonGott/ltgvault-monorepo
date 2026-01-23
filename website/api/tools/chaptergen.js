const { authenticateRequest } = require('../../lib/auth');
const { canUseTool, incrementUsage } = require('../../lib/usage');

// ============================================================================
// CHAPTERGEN PROMPTS
// ============================================================================

// Main chapter generation system prompt
const SYSTEM_PROMPT = `You are a YouTube chapter expert. Create chapters at the START of each segment, not where it's described.

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
- First chapter at 0:00: "Intro" or brief topic (2-3 words)`;

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

// Build user prompt
function buildUserPrompt(transcript, videoDuration = '10:00') {
  return `Create YouTube chapters for this video. Duration: ${videoDuration}

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
0:02 Player's Goal`;
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

// ============================================================================
// API HANDLER
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

    // Get transcript from request
    const transcript = req.body.transcript;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    if (transcript.length < 100) {
      return res.status(400).json({ error: 'Transcript is too short. Minimum 100 characters.' });
    }

    if (transcript.length > 50000) {
      return res.status(400).json({ error: 'Transcript too long. Maximum 50,000 characters.' });
    }

    // Call OpenAI API
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log('OPENAI_API_KEY check:', openaiKey ? `Set (${openaiKey.substring(0, 10)}...)` : 'NOT SET');
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI not configured' });
    }

    // Extract video duration from last timestamp in transcript
    const timestampMatches = transcript.match(/\[?(\d+):(\d+)\]?/g);
    let videoDuration = '10:00';
    if (timestampMatches && timestampMatches.length > 0) {
      videoDuration = timestampMatches[timestampMatches.length - 1].replace(/[\[\]]/g, '');
    }

    // Build user prompt
    const userPrompt = buildUserPrompt(transcript, videoDuration);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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
    let chapters = rawResult.trim();

    // Run second pass: Fix name spellings
    chapters = await fixNameSpellings(chapters, openaiKey);

    // Increment usage after successful generation
    // Increment usage only for authenticated users
    if (user) {
      await incrementUsage(user.id, 'chaptergen');
    }

    return res.status(200).json({
      success: true,
      result: chapters,
      isFreeTrial: !user,
      usage: user ? {
        used: (await canUseTool(user.id, 'chaptergen', isSubscribed)).used,
        limit: isSubscribed ? 'unlimited' : 1
      } : null
    });

  } catch (error) {
    console.error('ChapterGen error:', error);
    return res.status(500).json({ error: 'Failed to generate chapters' });
  }
};
