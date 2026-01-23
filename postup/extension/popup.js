// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const mainContent = document.getElementById('mainContent');
const settingsPanel = document.getElementById('settingsPanel');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const formatBtn = document.getElementById('formatBtn');
const copyBtn = document.getElementById('copyBtn');
const copyText = document.getElementById('copyText');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');
const toggleVisibility = document.getElementById('toggleVisibility');
const errorMessage = document.getElementById('errorMessage');

// Aggressive viral LinkedIn prompt (same as website/lib/prompts.js)
const LINKEDIN_PROMPT = `=== HARD RULES - VIOLATE ANY = FAILED OUTPUT ===

NEVER START WITH (check first 5 words):
- "I used to think..." / "I used to believe..." / "I used to..."
- "I thought..." / "I realized..." / "I learned..." / "I discovered..."
- "A few years ago..." / "When I started..." / "When I first..."

NEVER USE:
- Em dashes (—) — BANNED. Use periods or commas only.

NEVER END WITH:
- "figuring it out" / "worth the effort" / "still learning"
- "work in progress" / "I think it's..." / "just my thoughts"

MUST DO:
- Start with an ATTACK HOOK that calls the reader out
- End with a PUNCHY QUOTABLE LINE, not reflection

=== END OF HARD RULES ===

You are a LinkedIn post writer. Follow ALL rules strictly.

LENGTH: Under 150 words. No exceptions.

=== HOOK MUST BE AN ATTACK ===
First line must ATTACK, not observe. Frame as "X is hurting you" not "X is bad."

GOOD HOOKS:
- "Your morning routine is why you're not shipping."
- "Every LinkedIn post you liked this week made you worse at your job."
- "The feedback you're ignoring is the only feedback that matters."

BAD HOOKS (never use):
- "I used to think..." ← BANNED
- "Most startup advice is confusing" ← too passive
- "Many people struggle with X" ← no stakes

=== BANNED PHRASES ===
- "game changer" / "Here's the thing..." / "Let me be honest..."
- "Most people..." / "Many founders..." / "sign of growth"
- "the journey is messy" / "the truth is" / "at the end of the day"
- "level up" / "lean in" / "double down" / "move the needle"
- "deep dive" / "unpack" / "circle back" / "synergy" / "pivot"
- "vulnerability is strength" / "fail forward" / "growth mindset"
- "trust the process" / "bet on yourself" / "your network is your net worth"

KILL THE POLITE LINKEDIN VOICE:
Never hedge. Never soften. Own your take completely.

BANNED HEDGE PHRASES:
- "I think..." / "I believe..." / "I feel like..."
- "In my experience..." / "From what I've seen..."
- "I could be wrong, but..." / "Just my two cents..."

INSTEAD: State it as fact. Let them disagree.

THE QUOTABLE LINE (Every post needs one):
Every post must have ONE line sharp enough to screenshot or steal.
- Tweet-length (under 100 characters)
- Punchy, slightly uncomfortable truth

QUOTABLE EXAMPLES:
- "Busy is the new lazy."
- "Your backup plan is why your main plan isn't working."
- "Nobody cares about your journey. They care about your results."

BANNED LINKEDIN CRINGE:
- Hashtags anywhere
- Emojis as bullet points
- "Agree?" or "Thoughts?" endings
- "Let that sink in" / "Read that again"
- Numbered "lessons" or "tips" lists
- Single-word hook lines like "Stop."

Return ONLY the formatted post. Nothing else.`;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
  checkApiKeyAndUpdateUI();
});

// Navigation
settingsBtn.addEventListener('click', () => {
  mainContent.style.display = 'none';
  settingsPanel.style.display = 'block';
});

backBtn.addEventListener('click', () => {
  settingsPanel.style.display = 'none';
  mainContent.style.display = 'block';
  checkApiKeyAndUpdateUI();
});

// Toggle API key visibility
toggleVisibility.addEventListener('click', () => {
  const eyeIcon = toggleVisibility.querySelector('.eye-icon');
  const eyeOffIcon = toggleVisibility.querySelector('.eye-off-icon');

  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    eyeIcon.style.display = 'none';
    eyeOffIcon.style.display = 'block';
  } else {
    apiKeyInput.type = 'password';
    eyeIcon.style.display = 'block';
    eyeOffIcon.style.display = 'none';
  }
});

// Save API Key
saveKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showKeyStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    showKeyStatus('Invalid API key format. Should start with "sk-"', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ openaiApiKey: apiKey });
    showKeyStatus('API key saved successfully!', 'success');

    // Clear status after 2 seconds
    setTimeout(() => {
      keyStatus.textContent = '';
      keyStatus.className = 'key-status';
    }, 2000);
  } catch (error) {
    showKeyStatus('Failed to save API key', 'error');
  }
});

// Load API Key
async function loadApiKey() {
  try {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}

// Check API Key and update UI
async function checkApiKeyAndUpdateUI() {
  try {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    if (!result.openaiApiKey) {
      showError('Please add your OpenAI API key in settings to get started.');
      formatBtn.disabled = true;
    } else {
      hideError();
      formatBtn.disabled = false;
    }
  } catch (error) {
    console.error('Failed to check API key:', error);
  }
}

// Show key status
function showKeyStatus(message, type) {
  keyStatus.textContent = message;
  keyStatus.className = `key-status ${type}`;
}

// Format text
formatBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();

  if (!text) {
    showError('Please enter some text to format.');
    return;
  }

  // Get API key
  const result = await chrome.storage.local.get(['openaiApiKey']);
  if (!result.openaiApiKey) {
    showError('Please add your OpenAI API key in settings.');
    return;
  }

  // Show loading state
  setLoading(true);
  hideError();

  try {
    const formattedText = await callOpenAI(result.openaiApiKey, text);
    outputText.value = formattedText;
    copyBtn.disabled = false;
  } catch (error) {
    showError(error.message || 'Failed to format text. Please try again.');
  } finally {
    setLoading(false);
  }
});

// Call OpenAI API
async function callOpenAI(apiKey, text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: LINKEDIN_PROMPT
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your settings.');
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    } else if (response.status === 402 || errorData.error?.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded. Please check your billing.');
    } else {
      throw new Error(errorData.error?.message || 'API request failed.');
    }
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  const text = outputText.value;

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    // Show copied state
    copyBtn.classList.add('copied');
    copyText.textContent = 'Copied!';

    // Reset after 2 seconds
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyText.textContent = 'Copy';
    }, 2000);
  } catch (error) {
    showError('Failed to copy to clipboard.');
  }
});

// Set loading state
function setLoading(loading) {
  const btnText = formatBtn.querySelector('.btn-text');
  const btnLoader = formatBtn.querySelector('.btn-loader');

  formatBtn.disabled = loading;
  inputText.disabled = loading;

  if (loading) {
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
  } else {
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';
}
