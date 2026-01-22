// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const errorMessage = document.getElementById('errorMessage');
const outputSection = document.getElementById('outputSection');
const tweetsContainer = document.getElementById('tweetsContainer');
const copyAllBtn = document.getElementById('copyAllBtn');
const apiKeyInput = document.getElementById('apiKey');
const toggleVisibility = document.getElementById('toggleVisibility');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const saveStatus = document.getElementById('saveStatus');

// State
let currentThread = [];

// Enhanced State for Multi-Step Flow
let state = {
  currentStep: 1,  // 1=input, 2=hook, 3=body, 4=cta, 5=done
  originalContent: '',
  processedContent: '',
  selectedHook: null,
  selectedHookIndex: -1,
  hookOptions: [],
  bodyTweets: [],
  selectedCta: null,
  selectedCtaIndex: -1,
  ctaOptions: [],
  customCta: '',
  useCustomCta: false,
  finalThread: [],
  settings: {
    tweetNumbering: true,
    emojiUsage: false
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Load saved settings
  loadSettings();

  // Event listeners
  settingsBtn.addEventListener('click', showSettings);
  backBtn.addEventListener('click', hideSettings);
  inputText.addEventListener('input', updateCharCount);
  generateBtn.addEventListener('click', startGeneration);
  copyAllBtn.addEventListener('click', copyAllTweets);
  toggleVisibility.addEventListener('click', togglePasswordVisibility);
  saveApiKeyBtn.addEventListener('click', saveApiKey);

  // Setup formatting toggle listeners
  setupSettingsListeners();

  // Setup step navigation listeners
  setupStepListeners();
}

// Load settings from storage
function loadSettings() {
  const apiKey = localStorage.getItem('apiKey');
  const tweetNumbering = localStorage.getItem('tweetNumbering');
  const emojiUsage = localStorage.getItem('emojiUsage');

  if (apiKey) {
    apiKeyInput.value = apiKey;
  }

  state.settings.tweetNumbering = tweetNumbering !== 'false'; // default true
  state.settings.emojiUsage = emojiUsage === 'true'; // default false

  // Update toggle states if elements exist
  const numberingToggle = document.getElementById('tweetNumbering');
  const emojiToggle = document.getElementById('emojiUsage');
  if (numberingToggle) numberingToggle.checked = state.settings.tweetNumbering;
  if (emojiToggle) emojiToggle.checked = state.settings.emojiUsage;
}

// Setup formatting toggle listeners
function setupSettingsListeners() {
  const numberingToggle = document.getElementById('tweetNumbering');
  const emojiToggle = document.getElementById('emojiUsage');

  if (numberingToggle) {
    numberingToggle.addEventListener('change', (e) => {
      state.settings.tweetNumbering = e.target.checked;
      localStorage.setItem('tweetNumbering', e.target.checked);
    });
  }

  if (emojiToggle) {
    emojiToggle.addEventListener('change', (e) => {
      state.settings.emojiUsage = e.target.checked;
      localStorage.setItem('emojiUsage', e.target.checked);
    });
  }
}

// Setup step navigation listeners
function setupStepListeners() {
  // Hook selection
  const confirmHookBtn = document.getElementById('confirmHookBtn');
  const backToInputBtn = document.getElementById('backToInputBtn');

  if (confirmHookBtn) {
    confirmHookBtn.addEventListener('click', continueWithHook);
  }
  if (backToInputBtn) {
    backToInputBtn.addEventListener('click', () => setStep(1));
  }

  // CTA selection
  const confirmCtaBtn = document.getElementById('confirmCtaBtn');
  const backToBodyBtn = document.getElementById('backToBodyBtn');
  const useCustomCtaToggle = document.getElementById('useCustomCta');
  const customCtaInput = document.getElementById('customCtaInput');

  if (confirmCtaBtn) {
    confirmCtaBtn.addEventListener('click', completeThread);
  }
  if (backToBodyBtn) {
    backToBodyBtn.addEventListener('click', () => setStep(2));
  }
  if (useCustomCtaToggle) {
    useCustomCtaToggle.addEventListener('change', toggleCustomCta);
  }
  if (customCtaInput) {
    customCtaInput.addEventListener('input', updateCustomCtaCharCount);
  }

  // Too short warning buttons
  const useSingleTweetBtn = document.getElementById('useSingleTweetBtn');
  const continueAnywayBtn = document.getElementById('continueAnywayBtn');

  if (useSingleTweetBtn) {
    useSingleTweetBtn.addEventListener('click', useSingleTweet);
  }
  if (continueAnywayBtn) {
    continueAnywayBtn.addEventListener('click', () => proceedWithGeneration(true));
  }

  // Start over button
  const startOverBtn = document.getElementById('startOverBtn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', resetToStart);
  }
}

// Step Navigation
function setStep(stepNumber) {
  state.currentStep = stepNumber;

  // Update step indicator
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    if (stepNum < stepNumber) {
      step.classList.add('completed');
    } else if (stepNum === stepNumber) {
      step.classList.add('active');
    }
  });

  // Get view elements
  const hookSelectionView = document.getElementById('hookSelectionView');
  const bodyGenerationView = document.getElementById('bodyGenerationView');
  const ctaSelectionView = document.getElementById('ctaSelectionView');

  // Hide all views
  mainView.classList.add('hidden');
  if (hookSelectionView) hookSelectionView.classList.add('hidden');
  if (bodyGenerationView) bodyGenerationView.classList.add('hidden');
  if (ctaSelectionView) ctaSelectionView.classList.add('hidden');
  outputSection.classList.add('hidden');

  // Show appropriate view
  switch (stepNumber) {
    case 1:
      mainView.classList.remove('hidden');
      break;
    case 2:
      if (hookSelectionView) hookSelectionView.classList.remove('hidden');
      break;
    case 3:
      if (bodyGenerationView) bodyGenerationView.classList.remove('hidden');
      break;
    case 4:
      if (ctaSelectionView) ctaSelectionView.classList.remove('hidden');
      break;
    case 5:
      mainView.classList.remove('hidden');
      outputSection.classList.remove('hidden');
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
  }
}

// Reset to start
function resetToStart() {
  state = {
    currentStep: 1,
    originalContent: '',
    processedContent: '',
    selectedHook: null,
    selectedHookIndex: -1,
    hookOptions: [],
    bodyTweets: [],
    selectedCta: null,
    selectedCtaIndex: -1,
    ctaOptions: [],
    customCta: '',
    useCustomCta: false,
    finalThread: [],
    settings: state.settings // preserve settings
  };
  currentThread = [];
  inputText.value = '';
  updateCharCount();
  hideError();
  hideTooShortWarning();
  setStep(1);
}

// Content Preprocessing
function preprocessContent(rawContent) {
  let processed = rawContent;

  // Remove timestamps (00:00, 1:23:45, etc.)
  processed = processed.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '');

  // Remove URLs
  processed = processed.replace(/https?:\/\/[^\s]+/g, '');

  // Remove common filler words/phrases
  const fillerPatterns = [
    /\b(um|uh|like|you know|basically|actually|literally|honestly|frankly)\b/gi,
    /\b(kind of|sort of|i mean|i guess)\b/gi,
  ];
  fillerPatterns.forEach(pattern => {
    processed = processed.replace(pattern, '');
  });

  // Remove markdown headers (# ## ### etc.)
  processed = processed.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown formatting artifacts
  processed = processed.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1'); // **bold** or *italic*
  processed = processed.replace(/_{1,2}([^_]+)_{1,2}/g, '$1');   // __bold__ or _italic_
  processed = processed.replace(/`([^`]+)`/g, '$1');             // `code`
  processed = processed.replace(/^\s*[-*+]\s+/gm, '');           // bullet points
  processed = processed.replace(/^\s*\d+\.\s+/gm, '');           // numbered lists

  // Remove excessive whitespace
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/[ \t]+/g, ' ');
  processed = processed.trim();

  return processed;
}

// Content length validation
function checkContentLength(content) {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = content.length;

  // Too short for a thread
  if (wordCount < 50 || charCount < 300) {
    return {
      valid: false,
      reason: 'too_short',
      wordCount,
      charCount
    };
  }

  // Good length
  return {
    valid: true,
    wordCount,
    charCount
  };
}

// View Navigation
function showSettings() {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
}

function hideSettings() {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
}

// Character Count
function updateCharCount() {
  charCount.textContent = inputText.value.length;
}

// Toggle API Key Visibility
function togglePasswordVisibility() {
  const eyeIcon = toggleVisibility.querySelector('.eye-icon');
  const eyeOffIcon = toggleVisibility.querySelector('.eye-off-icon');

  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    eyeIcon.classList.add('hidden');
    eyeOffIcon.classList.remove('hidden');
  } else {
    apiKeyInput.type = 'password';
    eyeIcon.classList.remove('hidden');
    eyeOffIcon.classList.add('hidden');
  }
}

// Save API Key
function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showError('Please enter an API key');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showError('Invalid API key format. It should start with "sk-"');
    return;
  }

  localStorage.setItem('apiKey', apiKey);

  saveStatus.classList.remove('hidden');
  setTimeout(() => {
    saveStatus.classList.add('hidden');
  }, 2000);
}

// Start Generation Flow (Step 1 -> Step 2)
async function startGeneration() {
  const text = inputText.value.trim();

  if (!text) {
    showError('Please paste some content first');
    return;
  }

  state.originalContent = text;

  // Preprocess content
  state.processedContent = preprocessContent(text);

  // Check length
  const lengthCheck = checkContentLength(state.processedContent);
  if (!lengthCheck.valid) {
    showTooShortWarning();
    return;
  }

  await proceedWithGeneration(false);
}

// Proceed with hook generation
async function proceedWithGeneration(skipLengthCheck) {
  hideTooShortWarning();

  const apiKey = localStorage.getItem('apiKey');

  if (!apiKey) {
    showError('Please set your OpenAI API key in settings');
    return;
  }

  // Show loading state
  setLoading(true);
  hideError();

  try {
    state.hookOptions = await generateHookOptions(apiKey, state.processedContent);
    displayHookOptions(state.hookOptions);
    setStep(2);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

// Show too short warning
function showTooShortWarning() {
  const warning = document.getElementById('tooShortWarning');
  if (warning) warning.classList.remove('hidden');
}

// Hide too short warning
function hideTooShortWarning() {
  const warning = document.getElementById('tooShortWarning');
  if (warning) warning.classList.add('hidden');
}

// Use as single tweet
function useSingleTweet() {
  const content = state.processedContent || state.originalContent;
  // Truncate to 280 if needed
  const singleTweet = content.length > 280 ? content.substring(0, 277) + '...' : content;
  currentThread = [singleTweet];
  state.finalThread = [singleTweet];
  hideTooShortWarning();
  displayThread([singleTweet]);
  setStep(5);
}

// Continue after hook selection (Step 2 -> Step 3 -> Step 4)
async function continueWithHook() {
  if (state.selectedHookIndex === -1) {
    showError('Please select a hook first');
    return;
  }

  const apiKey = localStorage.getItem('apiKey');

  setStep(3); // Show loading view

  try {
    state.bodyTweets = await generateThreadBody(apiKey, state.processedContent, state.selectedHook);

    // Validate all tweets under 280
    state.bodyTweets = state.bodyTweets.map(validateTweetLength);

    // Generate CTA options
    const threadContext = [state.selectedHook, ...state.bodyTweets].slice(0, 3).join('\n');
    state.ctaOptions = await generateCtaOptions(apiKey, state.processedContent.slice(0, 200), threadContext);

    displayCtaOptions(state.ctaOptions);
    setStep(4);
  } catch (error) {
    showError(error.message);
    setStep(2); // Go back to hook selection
  }
}

// Toggle custom CTA mode
function toggleCustomCta() {
  const toggle = document.getElementById('useCustomCta');
  const customInput = document.getElementById('customCtaInput');
  const customCharCount = document.getElementById('customCtaCharCount');
  const confirmBtn = document.getElementById('confirmCtaBtn');

  if (toggle && customInput && customCharCount) {
    state.useCustomCta = toggle.checked;

    if (toggle.checked) {
      customInput.classList.remove('hidden');
      customCharCount.classList.remove('hidden');
      // Deselect any CTA option
      document.querySelectorAll('.cta-option').forEach(opt => opt.classList.remove('selected'));
      state.selectedCtaIndex = -1;
      state.selectedCta = null;
      // Enable confirm if custom has content
      if (confirmBtn) confirmBtn.disabled = customInput.value.trim().length === 0;
    } else {
      customInput.classList.add('hidden');
      customCharCount.classList.add('hidden');
      // Disable confirm until CTA selected
      if (confirmBtn) confirmBtn.disabled = state.selectedCtaIndex === -1;
    }
  }
}

// Update custom CTA character count
function updateCustomCtaCharCount() {
  const customInput = document.getElementById('customCtaInput');
  const customCharCount = document.getElementById('customCtaCharCount');
  const confirmBtn = document.getElementById('confirmCtaBtn');

  if (customInput && customCharCount) {
    const len = customInput.value.length;
    customCharCount.textContent = `${len}/280`;
    state.customCta = customInput.value;

    if (state.useCustomCta && confirmBtn) {
      confirmBtn.disabled = len === 0 || len > 280;
    }
  }
}

// Complete thread after CTA selection (Step 4 -> Step 5)
function completeThread() {
  const cta = state.useCustomCta ? state.customCta : state.selectedCta;

  if (!cta) {
    showError('Please select or write a CTA');
    return;
  }

  // Assemble final thread
  state.finalThread = [
    state.selectedHook,
    ...state.bodyTweets,
    cta
  ];

  // Run quality checks
  const qualityIssues = runQualityChecks(state.finalThread);
  if (qualityIssues.length > 0) {
    console.warn('Quality issues:', qualityIssues);
  }

  // Display final thread
  currentThread = state.finalThread;
  displayThread(state.finalThread);
  setStep(5);
}

// Validate tweet length
function validateTweetLength(tweet) {
  if (tweet.length > 280) {
    return tweet.substring(0, 277) + '...';
  }
  return tweet;
}

// Quality Checks
function runQualityChecks(tweets) {
  const issues = [];

  // Check 1: All tweets under 280 characters
  tweets.forEach((tweet, i) => {
    if (tweet.length > 280) {
      issues.push(`Tweet ${i + 1} exceeds 280 characters (${tweet.length})`);
    }
  });

  // Check 2: Hook creates curiosity
  const hook = tweets[0];
  const curiosityIndicators = [':', '...', 'here\'s', 'this is', 'what', '?'];
  const hasCuriosity = curiosityIndicators.some(ind => hook.toLowerCase().includes(ind));
  if (!hasCuriosity) {
    issues.push('Hook may not create sufficient curiosity');
  }

  // Check 3: Has clear arc
  if (tweets.length < 3) {
    issues.push('Thread may be too short for clear arc');
  }

  return issues;
}

// Legacy generateThread for backwards compatibility (now uses startGeneration)
async function generateThread() {
  await startGeneration();
}

// Handle API errors
async function handleApiError(response) {
  const errorData = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error('Invalid API key. Please check your settings.');
  } else if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
  } else if (response.status === 503) {
    throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
  } else {
    throw new Error(errorData.error?.message || 'Failed to generate. Please try again.');
  }
}

// Parse JSON response from API
function parseJsonResponse(content) {
  if (!content) {
    throw new Error('No response from OpenAI. Please try again.');
  }

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Invalid format');
    }
  } catch (e) {
    throw new Error('Failed to parse response. Please try again.');
  }
}

// Generate Hook Options (API Call 1)
async function generateHookOptions(apiKey, content) {
  const emojiInstruction = state.settings.emojiUsage
    ? '- You may use one emoji at the start if appropriate'
    : '- NO emojis at all';

  const hookPrompt = `You generate Twitter thread hooks. Given the content below, create exactly 3 different hook options.

HOOK STYLES TO GENERATE:
1. CURIOSITY/OPEN LOOP: Creates mystery, makes reader need to know more
   Example: "Most people get X wrong. Here's what actually works:"

2. BOLD CLAIM/HOT TAKE: Strong statement that challenges conventional wisdom
   Example: "X is dead. Here's what's replacing it:"

3. STORY-DRIVEN: Personal experience that draws reader in
   Example: "I spent 6 months doing X. Here's everything I learned:"

RULES:
- Each hook MUST be under 280 characters
- Each hook should be specific to the content provided
- Capital "I" ONLY at the start. Lowercase "i" everywhere else in the hook
${emojiInstruction}
- Make each hook genuinely different in approach
- The hook must create genuine curiosity
- No metaphors or similes
- Write like texting a friend

OUTPUT FORMAT:
Return a JSON array with exactly 3 objects:
[
  {"type": "curiosity", "content": "hook text here"},
  {"type": "bold_claim", "content": "hook text here"},
  {"type": "story", "content": "hook text here"}
]

CONTENT TO CREATE HOOKS FOR:
${content}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: hookPrompt }
      ],
      temperature: 0.8,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();
  return parseJsonResponse(data.choices[0]?.message?.content);
}

// Generate Thread Body (API Call 2)
async function generateThreadBody(apiKey, content, selectedHook) {
  const emojiInstruction = state.settings.emojiUsage
    ? '- Emojis allowed sparingly'
    : '- NO emojis at all';

  const bodyPrompt = `You write Twitter thread bodies. The hook has already been chosen. Generate the remaining tweets.

SELECTED HOOK (Tweet 1):
${selectedHook}

RULES:
- Generate 4-11 additional tweets (total thread will be 5-12 tweets including hook)
- Each tweet MUST be under 280 characters (HARD LIMIT - count carefully)
- One clear idea per tweet
- Natural flow from hook through middle to conclusion
- Include mini-transitions between tweets ("but here's the thing...", "that's when i realized...")
- Write like texting a friend
- Keep specific details (numbers, names, examples)
- Capital "I" ONLY at the start of a tweet. Lowercase "i" everywhere else
${emojiInstruction}

DO NOT:
- Use metaphors or similes
- Use rhetorical questions as transitions
- End with motivational-sounding conclusions
- Use banned phrases: "plot twist", "here's the thing", "trust me", "the struggle is real", "adulting"
- Use ALL CAPS for emphasis
- Split sentences across tweets

The thread should have:
- Clear beginning (hook already done)
- Strong middle (development, examples, story)
- Natural end that sets up the CTA (not preachy)

OUTPUT FORMAT:
Return a JSON array of tweet strings (NOT including the hook):
["tweet 2 text", "tweet 3 text", ...]

CONTENT:
${content}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: bodyPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();
  return parseJsonResponse(data.choices[0]?.message?.content);
}

// Generate CTA Options (API Call 3)
async function generateCtaOptions(apiKey, topic, threadContext) {
  const emojiInstruction = state.settings.emojiUsage
    ? '- One emoji allowed if appropriate'
    : '- NO emojis';

  const ctaPrompt = `Generate 3 different CTA (call-to-action) options for ending a Twitter thread.

THREAD TOPIC/CONTEXT:
${topic}

THREAD SO FAR (for context):
${threadContext}

CTA STYLES TO GENERATE:
1. ENGAGEMENT PROMPT: Ask a question to get replies
   Example: "What's your experience with X? Drop it below."

2. FOLLOW CTA: Encourage following for more content
   Example: "If this helped, follow for more on Y."

3. LINK CTA: Direct to external resource (use [link] as placeholder)
   Example: "Full breakdown here: [link]"

RULES:
- Each CTA MUST be under 280 characters
- Make them specific to the thread topic
- Keep tone casual and authentic
- Capital "I" ONLY at the start. Lowercase "i" everywhere else
${emojiInstruction}
- No fake enthusiasm or excessive punctuation

OUTPUT FORMAT:
Return a JSON array with exactly 3 objects:
[
  {"type": "engagement", "content": "cta text here"},
  {"type": "follow", "content": "cta text here"},
  {"type": "link", "content": "cta text here"}
]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ctaPrompt }
      ],
      temperature: 0.8,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data = await response.json();
  return parseJsonResponse(data.choices[0]?.message?.content);
}

// Display Hook Options
function displayHookOptions(hooks) {
  const hookOptionsContainer = document.getElementById('hookOptions');
  if (!hookOptionsContainer) return;

  hookOptionsContainer.innerHTML = '';

  const typeLabels = {
    'curiosity': 'Curiosity / Open Loop',
    'bold_claim': 'Bold Claim / Hot Take',
    'story': 'Story-Driven'
  };

  hooks.forEach((hook, index) => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'hook-option';
    optionDiv.dataset.index = index;

    optionDiv.innerHTML = `
      <div class="option-type">${typeLabels[hook.type] || hook.type}</div>
      <div class="option-content">${escapeHtml(hook.content)}</div>
      <div class="option-char-count">${hook.content.length}/280</div>
    `;

    optionDiv.addEventListener('click', () => selectHook(index));
    hookOptionsContainer.appendChild(optionDiv);
  });

  // Reset selection state
  state.selectedHookIndex = -1;
  state.selectedHook = null;
  const confirmBtn = document.getElementById('confirmHookBtn');
  if (confirmBtn) confirmBtn.disabled = true;
}

// Select a hook
function selectHook(index) {
  state.selectedHookIndex = index;
  state.selectedHook = state.hookOptions[index].content;

  // Update UI
  document.querySelectorAll('.hook-option').forEach((opt, i) => {
    opt.classList.toggle('selected', i === index);
  });

  const confirmBtn = document.getElementById('confirmHookBtn');
  if (confirmBtn) confirmBtn.disabled = false;
}

// Display CTA Options
function displayCtaOptions(ctas) {
  const ctaOptionsContainer = document.getElementById('ctaOptions');
  if (!ctaOptionsContainer) return;

  ctaOptionsContainer.innerHTML = '';

  const typeLabels = {
    'engagement': 'Engagement Prompt',
    'follow': 'Follow CTA',
    'link': 'Link CTA'
  };

  ctas.forEach((cta, index) => {
    const optionDiv = document.createElement('div');
    optionDiv.className = 'cta-option';
    optionDiv.dataset.index = index;

    optionDiv.innerHTML = `
      <div class="option-type">${typeLabels[cta.type] || cta.type}</div>
      <div class="option-content">${escapeHtml(cta.content)}</div>
      <div class="option-char-count">${cta.content.length}/280</div>
    `;

    optionDiv.addEventListener('click', () => selectCta(index));
    ctaOptionsContainer.appendChild(optionDiv);
  });

  // Reset selection state
  state.selectedCtaIndex = -1;
  state.selectedCta = null;
  state.useCustomCta = false;
  state.customCta = '';

  const confirmBtn = document.getElementById('confirmCtaBtn');
  if (confirmBtn) confirmBtn.disabled = true;

  // Reset custom CTA UI
  const customToggle = document.getElementById('useCustomCta');
  const customInput = document.getElementById('customCtaInput');
  const customCharCount = document.getElementById('customCtaCharCount');
  if (customToggle) customToggle.checked = false;
  if (customInput) {
    customInput.classList.add('hidden');
    customInput.value = '';
  }
  if (customCharCount) {
    customCharCount.classList.add('hidden');
    customCharCount.textContent = '0/280';
  }
}

// Select a CTA
function selectCta(index) {
  if (state.useCustomCta) return; // Don't select if custom mode

  state.selectedCtaIndex = index;
  state.selectedCta = state.ctaOptions[index].content;

  document.querySelectorAll('.cta-option').forEach((opt, i) => {
    opt.classList.toggle('selected', i === index);
  });

  const confirmBtn = document.getElementById('confirmCtaBtn');
  if (confirmBtn) confirmBtn.disabled = false;
}

// Display Thread
function displayThread(tweets) {
  tweetsContainer.innerHTML = '';

  tweets.forEach((tweet, index) => {
    const tweetCard = document.createElement('div');
    tweetCard.className = 'tweet-card';

    // Apply numbering if enabled
    const displayNumber = state.settings.tweetNumbering
      ? `${index + 1}/${tweets.length}`
      : `Tweet ${index + 1}`;

    tweetCard.innerHTML = `
      <div class="tweet-header">
        <span class="tweet-number">${displayNumber}</span>
        <span class="tweet-char-count">${tweet.length}/280</span>
      </div>
      <div class="tweet-content">${escapeHtml(tweet)}</div>
      <div class="tweet-footer">
        <button class="copy-tweet-btn" data-index="${index}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
      </div>
    `;

    tweetsContainer.appendChild(tweetCard);
  });

  // Add copy event listeners
  document.querySelectorAll('.copy-tweet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      copyTweet(index, btn);
    });
  });

  outputSection.classList.remove('hidden');
}

// Copy Individual Tweet
async function copyTweet(index, button) {
  const tweet = currentThread[index];

  try {
    await navigator.clipboard.writeText(tweet);

    button.classList.add('copied');
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied!
    `;

    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      `;
    }, 2000);
  } catch (err) {
    showError('Failed to copy to clipboard');
  }
}

// Copy All Tweets
async function copyAllTweets() {
  const fullThread = currentThread.map((tweet, index) => {
    if (state.settings.tweetNumbering) {
      return `${index + 1}/${currentThread.length}\n${tweet}`;
    }
    return tweet;
  }).join('\n\n');

  try {
    await navigator.clipboard.writeText(fullThread);

    copyAllBtn.classList.add('copied');
    copyAllBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied!
    `;

    setTimeout(() => {
      copyAllBtn.classList.remove('copied');
      copyAllBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy All
      `;
    }, 2000);
  } catch (err) {
    showError('Failed to copy to clipboard');
  }
}

// Loading State
function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  const btnText = generateBtn.querySelector('.btn-text');
  const btnLoader = generateBtn.querySelector('.btn-loader');

  if (isLoading) {
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
}

// Error Handling
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
