// ChapterGen Popup Script

const DEBUG_PREFIX = '[ChapterGen Popup]';

function log(...args) {
  console.log(DEBUG_PREFIX, ...args);
}

function logError(...args) {
  console.error(DEBUG_PREFIX, ...args);
}

log('Popup script loading...');

document.addEventListener('DOMContentLoaded', init);

// DOM Elements
const elements = {
  settingsBtn: null,
  settingsPanel: null,
  apiKeyInput: null,
  toggleKeyBtn: null,
  saveKeyBtn: null,
  mainContent: null,
  notYoutube: null,
  status: null,
  videoInfo: null,
  videoTitle: null,
  generateBtn: null,
  loading: null,
  results: null,
  chaptersOutput: null,
  copyBtn: null
};

// State
let currentVideoId = null;
let generatedChapters = '';

async function init() {
  log('Initializing popup...');

  // Cache DOM elements
  elements.settingsBtn = document.getElementById('settingsBtn');
  elements.settingsPanel = document.getElementById('settingsPanel');
  elements.apiKeyInput = document.getElementById('apiKey');
  elements.toggleKeyBtn = document.getElementById('toggleKey');
  elements.saveKeyBtn = document.getElementById('saveKey');
  elements.mainContent = document.getElementById('mainContent');
  elements.notYoutube = document.getElementById('notYoutube');
  elements.status = document.getElementById('status');
  elements.videoInfo = document.getElementById('videoInfo');
  elements.videoTitle = document.getElementById('videoTitle');
  elements.generateBtn = document.getElementById('generateBtn');
  elements.loading = document.getElementById('loading');
  elements.results = document.getElementById('results');
  elements.chaptersOutput = document.getElementById('chaptersOutput');
  elements.copyBtn = document.getElementById('copyBtn');

  log('DOM elements cached');

  // Setup event listeners
  setupEventListeners();

  // Load saved API key
  await loadApiKey();

  // Check current tab
  await checkCurrentTab();

  log('Popup initialization complete');
}

function setupEventListeners() {
  elements.settingsBtn.addEventListener('click', toggleSettings);
  elements.toggleKeyBtn.addEventListener('click', toggleKeyVisibility);
  elements.saveKeyBtn.addEventListener('click', saveApiKey);
  elements.generateBtn.addEventListener('click', generateChapters);
  elements.copyBtn.addEventListener('click', copyChapters);
  log('Event listeners attached');
}

function toggleSettings() {
  elements.settingsPanel.classList.toggle('hidden');
}

function toggleKeyVisibility() {
  const type = elements.apiKeyInput.type;
  elements.apiKeyInput.type = type === 'password' ? 'text' : 'password';
}

async function loadApiKey() {
  log('Loading API key from storage...');
  try {
    const result = await chrome.storage.local.get('openaiApiKey');
    if (result.openaiApiKey) {
      elements.apiKeyInput.value = result.openaiApiKey;
      log('API key loaded (length:', result.openaiApiKey.length, ')');
    } else {
      log('No API key found in storage');
    }
  } catch (error) {
    logError('Failed to load API key:', error);
  }
}

async function saveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  log('Saving API key...');

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. OpenAI keys start with "sk-"', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ openaiApiKey: apiKey });
    log('API key saved successfully');
    showStatus('API key saved successfully', 'success');

    // Auto-hide settings after save
    setTimeout(() => {
      elements.settingsPanel.classList.add('hidden');
      hideStatus();
    }, 1500);
  } catch (error) {
    logError('Failed to save API key:', error);
    showStatus('Failed to save API key: ' + error.message, 'error');
  }
}

async function checkCurrentTab() {
  log('Checking current tab...');
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    log('Tabs query result:', tabs);
    log('Number of tabs returned:', tabs.length);

    const tab = tabs[0];
    log('Tab object:', tab);
    log('Tab ID:', tab?.id);
    log('Tab URL:', tab?.url);
    log('Tab status:', tab?.status);

    if (!tab?.url) {
      log('No tab URL available - might need "tabs" permission or URL is restricted');
      showNotYoutube();
      return;
    }

    const isYouTubeWatch = tab.url.includes('youtube.com/watch');
    log('Is YouTube watch page?', isYouTubeWatch, '| URL contains "youtube.com/watch":', tab.url.includes('youtube.com/watch'));

    if (!isYouTubeWatch) {
      log('Not a YouTube watch page. URL:', tab.url);
      showNotYoutube();
      return;
    }

    log('YouTube video page detected, sending message to content script...');

    // Get video info from content script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
      log('Content script response:', response);
    } catch (error) {
      logError('Failed to communicate with content script:', error);
      showStatus('Extension error: Could not connect to page. Try refreshing the YouTube page.', 'error');
      showNotYoutube();
      return;
    }

    if (response?.error) {
      log('Content script returned error:', response.error);
      showNotYoutube();
      return;
    }

    currentVideoId = response.videoId;
    elements.videoTitle.textContent = response.title;
    elements.videoInfo.classList.remove('hidden');
    elements.mainContent.classList.remove('hidden');
    elements.notYoutube.classList.add('hidden');
    log('Video info displayed:', response.videoId, response.title);

    // Check if we have an API key
    const result = await chrome.storage.local.get('openaiApiKey');
    if (!result.openaiApiKey) {
      elements.settingsPanel.classList.remove('hidden');
      showStatus('Please add your OpenAI API key to get started', 'info');
    }
  } catch (error) {
    logError('Error checking tab:', error);
    showStatus('Error: ' + error.message, 'error');
    showNotYoutube();
  }
}

function showNotYoutube() {
  elements.mainContent.classList.add('hidden');
  elements.notYoutube.classList.remove('hidden');
}

function showStatus(message, type = 'info') {
  log('Status:', type, '-', message);
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.classList.remove('hidden');
}

function hideStatus() {
  elements.status.classList.add('hidden');
}

async function generateChapters() {
  log('=== Starting chapter generation ===');

  // Check for API key
  const result = await chrome.storage.local.get('openaiApiKey');
  if (!result.openaiApiKey) {
    log('No API key configured');
    showStatus('Please add your OpenAI API key first', 'error');
    elements.settingsPanel.classList.remove('hidden');
    return;
  }
  log('API key found');

  // Hide previous results and show loading
  elements.results.classList.add('hidden');
  elements.generateBtn.disabled = true;
  elements.loading.classList.remove('hidden');
  hideStatus();

  try {
    // Get active tab
    log('Getting active tab...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    log('Active tab ID:', tab.id);

    // Get transcript from content script
    log('Requesting transcript from content script...');
    const startTime = Date.now();

    let transcriptResponse;
    try {
      transcriptResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' });
    } catch (error) {
      logError('Content script communication failed:', error);
      throw new Error('Could not connect to the YouTube page. Please refresh the page and try again.');
    }

    const transcriptTime = Date.now() - startTime;
    log('Transcript response received in', transcriptTime, 'ms');
    log('Transcript response:', {
      hasError: !!transcriptResponse?.error,
      error: transcriptResponse?.error,
      transcriptLength: transcriptResponse?.transcript?.length,
      language: transcriptResponse?.language
    });

    if (transcriptResponse?.error) {
      throw new Error('Transcript error: ' + transcriptResponse.error);
    }

    const transcript = transcriptResponse.transcript;

    // Log transcript immediately so we can see what was extracted
    console.log('[ChapterGen] Transcript content:', transcript);

    if (!transcript) {
      throw new Error('No transcript data received from content script');
    }

    console.log('[ChapterGen] Transcript type:', typeof transcript);
    console.log('[ChapterGen] Transcript length:', transcript.length);

    if (transcript.length < 100) {
      throw new Error(`Transcript is too short (${transcript.length} characters). The video may have very limited captions.`);
    }

    log('Transcript ready, length:', transcript.length, 'characters');

    // Log the FULL transcript to console
    console.log('[ChapterGen] ===== FULL TRANSCRIPT =====');
    console.log('[ChapterGen] Transcript:', transcript);
    console.log('[ChapterGen] ===== END TRANSCRIPT =====');

    // Check if transcript is too short - something went wrong
    if (transcript.length < 500) {
      throw new Error(`Transcript too short (${transcript.length} chars). Extraction may have failed. Check console for details.`);
    }

    // Check if transcript looks like an error message
    if (transcript.includes('Error') || transcript.includes('error') || transcript.includes('failed') || transcript.includes('No caption')) {
      throw new Error('Transcript extraction failed: ' + transcript.substring(0, 200));
    }

    // Extract video duration from last timestamp in transcript
    const timestampMatches = transcript.match(/\[(\d+):(\d+)\]/g);
    let videoDuration = '0:00';
    if (timestampMatches && timestampMatches.length > 0) {
      videoDuration = timestampMatches[timestampMatches.length - 1].replace(/[\[\]]/g, '');
      log('Detected video duration from transcript:', videoDuration);
      log('Total timestamps found:', timestampMatches.length);
    } else {
      log('WARNING: No timestamps found in transcript!');
    }

    // Send to OpenAI
    log('Calling OpenAI API...');
    log('Transcript length being sent:', transcript.length, 'chars');
    const apiStartTime = Date.now();
    const chapters = await callOpenAI(transcript, result.openaiApiKey, videoDuration);
    const apiTime = Date.now() - apiStartTime;
    log('OpenAI response received in', apiTime, 'ms');
    log('Generated chapters:', chapters);

    // Display results
    generatedChapters = chapters;
    elements.chaptersOutput.textContent = chapters;
    elements.results.classList.remove('hidden');

    // Auto-copy to clipboard so user doesn't lose chapters if popup closes
    try {
      await navigator.clipboard.writeText(chapters);
      log('Chapters auto-copied to clipboard');
      showStatus('Chapters generated and copied to clipboard!', 'success');

      // Show copied state on button
      const originalText = elements.copyBtn.innerHTML;
      elements.copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Copied!
      `;
      elements.copyBtn.classList.add('copied');

      setTimeout(() => {
        elements.copyBtn.innerHTML = originalText;
        elements.copyBtn.classList.remove('copied');
      }, 3000);
    } catch (clipboardError) {
      log('Auto-copy failed:', clipboardError);
      showStatus('Chapters generated! Click Copy to save.', 'success');
    }

    log('=== Chapter generation complete ===');
  } catch (error) {
    logError('Error generating chapters:', error);
    showStatus(error.message || 'Failed to generate chapters', 'error');
  } finally {
    elements.loading.classList.add('hidden');
    elements.generateBtn.disabled = false;
  }
}

async function callOpenAI(transcript, apiKey, videoDuration = '10:00') {
  log('Preparing OpenAI request...');
  log('Video duration:', videoDuration);
  log('Transcript length:', transcript.length);

  const systemPrompt = `You are a YouTube chapter expert. Create chapters at the START of each segment, not where it's described.

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

  const userPrompt = `Create YouTube chapters for this video. Duration: ${videoDuration}

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

  log('System prompt length:', systemPrompt.length);
  log('User prompt length:', userPrompt.length);
  log('Total prompt length:', systemPrompt.length + userPrompt.length);

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.3
  };

  log('Request body prepared, total prompt length:', systemPrompt.length + userPrompt.length);
  log('Using model:', requestBody.model);

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    logError('Network error calling OpenAI:', error);
    throw new Error('Network error: Could not reach OpenAI API. Check your internet connection.');
  }

  log('OpenAI response status:', response.status, response.statusText);
  log('OpenAI response type:', response.headers.get('content-type'));

  if (!response.ok) {
    let errorData = {};
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        log('OpenAI error response:', errorData);
      } catch (e) {
        log('Could not parse error response as JSON:', e.message);
      }
    } else {
      const errorText = await response.text();
      log('OpenAI error response (not JSON):', errorText.substring(0, 500));
    }

    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new Error(`Rate limit exceeded. ${retryAfter ? `Try again in ${retryAfter} seconds.` : 'Please try again later.'}`);
    }
    if (response.status === 400) {
      throw new Error('Bad request: ' + (errorData.error?.message || 'Invalid request to OpenAI'));
    }
    if (response.status === 500 || response.status === 502 || response.status === 503) {
      throw new Error('OpenAI service temporarily unavailable. Please try again in a moment.');
    }
    throw new Error(errorData.error?.message || `OpenAI API error (HTTP ${response.status})`);
  }

  // Check content type before parsing
  const successContentType = response.headers.get('content-type') || '';
  log('Response content-type:', successContentType);

  if (!successContentType.includes('application/json')) {
    const textResponse = await response.text();
    log('Unexpected response type, body:', textResponse.substring(0, 500));
    throw new Error('OpenAI returned unexpected response type: ' + successContentType);
  }

  let data;
  try {
    data = await response.json();
    log('OpenAI response data:', {
      id: data.id,
      model: data.model,
      usage: data.usage,
      choicesCount: data.choices?.length
    });
  } catch (error) {
    logError('Failed to parse OpenAI response:', error);
    throw new Error('Failed to parse response from OpenAI: ' + error.message);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    log('No content in OpenAI response:', data);
    throw new Error('OpenAI returned an empty response. Please try again.');
  }

  log('Chapters content length:', content.length);
  log('Initial chapters:', content);

  // Second pass: Fix name misspellings
  log('Starting second pass to fix name spellings...');
  const correctedChapters = await fixNameSpellings(content, apiKey);

  return correctedChapters;
}

async function fixNameSpellings(chapters, apiKey) {
  log('Fixing name spellings in chapters...');

  const systemPrompt = `You are a spelling correction expert for sports players, celebrities, YouTubers, and brand names.

Your job: Fix obvious misspellings in YouTube chapter titles caused by auto-caption errors.

Common patterns to fix:
- Phonetic spellings: "Cfield" → "Caufield", "Jack Eel" → "Jack Eichel", "Ovetshkin" → "Ovechkin"
- Split names: "Mc David" → "McDavid", "Le Bron" → "LeBron"
- Sound-alikes: "Croz B" → "Crosby", "Dry Seidel" → "Draisaitl"
- Missing letters: "Gretzky" is correct, "Gretsky" is wrong

Rules:
- ONLY fix obvious misspellings of real names
- Do NOT change timestamps
- Do NOT change chapter structure or wording (except the misspelled name)
- If unsure, leave the name as-is
- Keep everything else exactly the same`;

  const userPrompt = `Fix any obvious name misspellings in these YouTube chapters. Only correct names that are clearly wrong phonetic transcriptions of real sports players, celebrities, or brands.

Chapters:
${chapters}

Return the corrected chapters in the exact same format. If no corrections needed, return them unchanged.`;

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 2000,
    temperature: 0.1
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      log('Name correction API call failed, using original chapters');
      return chapters;
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim();

    if (!corrected) {
      log('No corrected content, using original chapters');
      return chapters;
    }

    log('Corrected chapters:', corrected);
    return corrected;
  } catch (error) {
    logError('Name correction failed:', error);
    return chapters; // Fall back to original if correction fails
  }
}

async function copyChapters() {
  if (!generatedChapters) {
    log('No chapters to copy');
    return;
  }

  log('Copying chapters to clipboard...');

  try {
    await navigator.clipboard.writeText(generatedChapters);
    log('Chapters copied successfully');

    // Visual feedback
    const originalText = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!
    `;
    elements.copyBtn.classList.add('copied');

    setTimeout(() => {
      elements.copyBtn.innerHTML = originalText;
      elements.copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    logError('Failed to copy to clipboard:', error);
    showStatus('Failed to copy to clipboard: ' + error.message, 'error');
  }
}

log('Popup script loaded');
