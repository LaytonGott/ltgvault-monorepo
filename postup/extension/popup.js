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

const LINKEDIN_PROMPT = `Rewrite this into a LinkedIn post that sounds like a real person wrote it. Not a copywriter. Not a "LinkedIn influencer." Just someone sharing a genuine thought or experience.

VOICE:
- Use "I" naturally throughout — this is YOUR experience, YOUR opinion
- Write like you're telling a friend, not performing for an audience
- Be direct but not preachy
- It's okay to sound a little frustrated, excited, or uncertain — that's human

FORMAT:
- Mix short and medium-length sentences naturally
- Group related sentences into real paragraphs (2-4 sentences is fine)
- NOT every sentence on its own line — that's the fake LinkedIn style we're avoiding
- Use line breaks between paragraphs, not between every thought
- Aim for how you'd actually write a text or email to someone

ENDING:
- Just end naturally. Make your point and stop.
- NO forced engagement questions like "What do you think?" or "Anyone else feel this way?"
- NO call-to-action unless it genuinely fits
- It's fine to end on a statement, a realization, or even mid-thought

BANNED:
- Hashtags
- Emojis
- "Here's the thing..."
- "Let that sink in"
- "Read that again"
- "Most people don't realize..."
- Starting with a one-word hook line
- Numbered lists of "lessons" or "tips"
- Humble brags disguised as stories
- Wrapping everything up with a neat bow

EXAMPLE OF THE TONE:
"I mass applied to 50 jobs last month just because I was panicking. Got maybe 2 responses. Then I spent a week actually tailoring 5 applications — researching the companies, rewriting my resume for each one, writing cover letters that didn't sound like a template.

I got 4 interviews from those 5.

I'm not saying the spray-and-pray method never works, but I wasted so much time convincing myself that volume was the answer when it really wasn't. Sometimes doing less but doing it properly just hits different."

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
