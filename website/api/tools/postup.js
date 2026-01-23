const { authenticateRequest } = require('../../lib/auth');
const { canUseTool, incrementUsage } = require('../../lib/usage');

// ============================================================================
// PROMPTS - Imported from single source of truth
// ============================================================================
const {
  buildSystemPrompt,
  buildGenerationPrompt,
  buildRefinementPrompt
} = require('../../lib/prompts');

// ============================================================================
// API HANDLER
// ============================================================================

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(req);

    if (authError) {
      return res.status(401).json({ error: authError });
    }

    // Check if user is subscribed to PostUp
    const isSubscribed = user.subscribed_postup || false;

    // Check usage limits
    const { allowed, used, limit, subscribed } = await canUseTool(user.id, 'postup', isSubscribed);

    if (!allowed) {
      return res.status(429).json({
        error: 'LIMIT_EXCEEDED',
        message: `You've used all ${limit} free PostUp generations. Subscribe for unlimited access.`,
        usage: { used, limit },
        upgradeUrl: '/pricing.html'
      });
    }

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
    const { tone, inputType, niche, action, currentPost } = req.body;

    // Build system prompt from shared prompts module
    const systemPrompt = buildSystemPrompt(tone, inputType, niche);

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
      model: 'claude-3-5-haiku-20241022',
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic error:', errorData);
      return res.status(500).json({
        error: errorData?.error?.message || 'Failed to generate content'
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

    // ========================================
    // POST-PROCESSING: Enforce rules in code
    // ========================================
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

    // Increment usage after successful generation
    await incrementUsage(user.id, 'postup');

    return res.status(200).json({
      success: true,
      result: result,
      usage: {
        used: used + 1,
        limit: subscribed ? 'unlimited' : limit
      },
      _debug: {
        version: 'v7-shared-prompts',
        model: 'claude-3-5-haiku-20241022',
        apiProvider: 'anthropic',
        systemPromptLength: systemPrompt.length,
        systemPromptStart: systemPrompt.substring(0, 800),
        userPromptLength: userPrompt.length
      }
    });

  } catch (error) {
    console.error('PostUp error:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
};
