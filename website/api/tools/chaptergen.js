const { authenticateRequest } = require('../../lib/auth');
const { canUseTool, incrementUsage } = require('../../lib/usage');
const { YoutubeTranscript } = require('youtube-transcript');
const { getSubtitles } = require('youtube-captions-scraper');

// ============================================================================
// YOUTUBE TRANSCRIPT FETCHING - Multiple library fallback
// ============================================================================

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

// ============================================================================
// CHAPTERGEN PROMPTS - Different output types
// ============================================================================

// Output type prompts
const OUTPUT_TYPE_PROMPTS = {
  // CHAPTERS - timestamps + chapter titles (default)
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

  // CLIPS - identify 3-5 viral moments for TikTok/Shorts
  clips: {
    system: `You are a viral content expert specializing in identifying short-form video moments from longer content.

Your job is to find the 3-5 MOST VIRAL moments in a transcript that would make great TikTok/YouTube Shorts/Reels clips.

WHAT MAKES A VIRAL CLIP:
- Strong emotional moment (funny, shocking, inspiring, relatable)
- Complete thought or story arc in 30-60 seconds
- Clear hook at the start
- Quotable or shareable line
- Universal appeal or niche community appeal
- Controversial or unexpected take
- Tutorial/tip that delivers quick value

FOR EACH CLIP IDENTIFY:
1. Start timestamp (where to begin the clip)
2. End timestamp (where to cut)
3. Viral potential title (hook-style, what makes people click)
4. Why it's viral (1 sentence explanation)
5. Suggested hashtags (3-5 relevant tags)

AVOID:
- Rambling sections without clear payoff
- Inside jokes without context
- Technical explanations that need prior context
- Moments that require watching more to understand`,
    user: (transcript, videoDuration) => `Find the 3-5 most viral clip moments in this transcript. Duration: ${videoDuration}

Look for moments that would work as standalone 30-60 second clips on TikTok, YouTube Shorts, or Reels.

Transcript:
${transcript}

Return in this format:

CLIP 1: [Viral Title]
⏱️ Start: [timestamp] → End: [timestamp]
🔥 Why it's viral: [1 sentence]
#hashtag1 #hashtag2 #hashtag3

CLIP 2: [Viral Title]
...`
  },

  // BLOG - turn transcript into blog post structure
  blog: {
    system: `You are a content strategist who transforms video transcripts into well-structured blog post outlines.

Your job is to extract the key content from a transcript and organize it into a scannable, SEO-friendly blog structure.

BLOG STRUCTURE TO CREATE:
1. Compelling headline (not the video title - write a better one)
2. Meta description (150-160 chars for SEO)
3. Introduction hook (2-3 sentences that pull readers in)
4. Main sections with H2 headers (3-6 sections)
5. Key points under each section (bullet points)
6. Notable quotes from the transcript (word-for-word, with context)
7. Conclusion/takeaway
8. Suggested tags/categories

WRITING STYLE:
- Convert spoken language to written (remove "um", "like", filler words)
- Keep the author's voice and personality
- Make headers scannable and benefit-focused
- Extract actionable insights
- Include specific examples/numbers from the content`,
    user: (transcript, videoDuration) => `Transform this video transcript into a blog post outline. Duration: ${videoDuration}

Extract the key content, organize it logically, and create a structure that would work as a standalone blog post.

Transcript:
${transcript}

Return in this format:

📰 HEADLINE: [Compelling blog title]

📝 META DESCRIPTION: [150-160 char SEO description]

🎯 INTRODUCTION:
[2-3 sentence hook]

📌 SECTION 1: [H2 Header]
• [Key point]
• [Key point]
• [Key point]

📌 SECTION 2: [H2 Header]
...

💬 NOTABLE QUOTES:
"[Exact quote]" - [context]

🎬 CONCLUSION:
[Key takeaway]

🏷️ TAGS: [tag1], [tag2], [tag3]`
  },

  // HIGHLIGHTS - bullet points of most important moments
  highlights: {
    system: `You are a content analyst who extracts the most important and valuable moments from video transcripts.

Your job is to identify the KEY HIGHLIGHTS - the moments someone would want to know if they don't have time to watch the whole video.

WHAT COUNTS AS A HIGHLIGHT:
- Main arguments or thesis statements
- Surprising facts or statistics
- Actionable tips or advice
- Important announcements or news
- Memorable quotes or one-liners
- Key decisions or turning points
- Lessons learned or insights
- Controversial opinions or hot takes

FOR EACH HIGHLIGHT:
1. Timestamp where it occurs
2. The highlight itself (1-2 sentences max)
3. Category tag (Insight, Tip, Quote, Fact, Story, Opinion)

PRIORITIZE:
- Quality over quantity (8-15 highlights max)
- Most impactful moments first
- Variety of highlight types
- Actionable over abstract`,
    user: (transcript, videoDuration) => `Extract the key highlights from this video transcript. Duration: ${videoDuration}

Identify the 8-15 most important moments someone would want to know.

Transcript:
${transcript}

Return in this format:

⭐ KEY HIGHLIGHTS

[0:00] 💡 INSIGHT: [The highlight in 1-2 sentences]

[1:23] 🎯 TIP: [Actionable advice from the video]

[3:45] 💬 QUOTE: "[Memorable quote word-for-word]"

[5:12] 📊 FACT: [Surprising statistic or fact mentioned]

[7:30] 📖 STORY: [Key story or example shared]

[9:15] 🔥 OPINION: [Controversial or strong take]

...`
  }
};

// Legacy: Main chapter generation system prompt (kept for backwards compatibility)
const SYSTEM_PROMPT = OUTPUT_TYPE_PROMPTS.chapters.system;

// Legacy: Build user prompt (kept for backwards compatibility)
function buildUserPrompt(transcript, videoDuration = '10:00') {
  return OUTPUT_TYPE_PROMPTS.chapters.user(transcript, videoDuration);
}

// Build prompt based on output type
function buildOutputTypePrompt(outputType, transcript, videoDuration = '10:00') {
  const prompts = OUTPUT_TYPE_PROMPTS[outputType] || OUTPUT_TYPE_PROMPTS.chapters;
  return {
    system: prompts.system,
    user: prompts.user(transcript, videoDuration)
  };
}

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
function buildRefinementPrompt(currentChapters, action, transcript) {
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
    console.log('OPENAI_API_KEY check:', openaiKey ? `Set (${openaiKey.substring(0, 10)}...)` : 'NOT SET');
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI not configured' });
    }

    let userPrompt;
    let systemPrompt;

    // Check if this is a quick action refinement (only for chapters output type)
    if (action && currentChapters) {
      userPrompt = buildRefinementPrompt(currentChapters, action, transcript || '');
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
      const prompts = buildOutputTypePrompt(selectedOutputType, transcript, videoDuration);
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
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
};
