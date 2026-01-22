// Content script - Extract transcript by clicking YouTube's transcript button

console.log('[ChapterGen] Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[ChapterGen] Message:', request.action);

  if (request.action === 'getVideoInfo') {
    const videoId = new URLSearchParams(window.location.search).get('v');
    const title = document.title.replace(' - YouTube', '');
    sendResponse({ videoId, title });
    return true;
  }

  if (request.action === 'getTranscript') {
    extractTranscriptFromUI()
      .then(transcript => {
        console.log('[ChapterGen] SUCCESS! Transcript length:', transcript.length);
        sendResponse({ transcript });
      })
      .catch(error => {
        console.error('[ChapterGen] FAILED:', error.message);
        sendResponse({ error: error.message });
      });
    return true;
  }
});

async function extractTranscriptFromUI() {
  console.log('[ChapterGen] === EXTRACTING TRANSCRIPT FROM UI ===');

  // Check if transcript panel is already open
  let transcriptPanel = document.querySelector('ytd-transcript-renderer');

  if (!transcriptPanel) {
    console.log('[ChapterGen] Step 1: Opening transcript panel...');
    await openTranscriptPanel();
  }

  // Wait for transcript segments to load
  console.log('[ChapterGen] Step 2: Waiting for transcript segments...');
  await waitForElement('ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer', 10000);

  // Get all transcript segments
  console.log('[ChapterGen] Step 3: Extracting segments...');
  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  console.log('[ChapterGen] Found segments:', segments.length);

  if (segments.length === 0) {
    throw new Error('No transcript segments found. Video may not have captions.');
  }

  // Extract text from each segment - include ALL timestamps for context
  let transcript = '';
  let lastTimestamp = '';

  segments.forEach((segment, index) => {
    // Get timestamp
    const timestampEl = segment.querySelector('.segment-timestamp');
    const textEl = segment.querySelector('.segment-text, yt-formatted-string.segment-text');

    if (!textEl) {
      console.log('[ChapterGen] No text element in segment', index);
      return;
    }

    const timestamp = timestampEl ? timestampEl.textContent.trim() : '0:00';
    const text = textEl.textContent.trim();

    if (!text) return;

    // Log first few segments
    if (index < 3) {
      console.log(`[ChapterGen] Segment ${index}: [${timestamp}] "${text.substring(0, 50)}..."`);
    }

    // Include timestamp for EVERY segment so GPT can see exact timing
    // This helps GPT figure out where segments START vs where they're described
    if (timestamp !== lastTimestamp) {
      transcript += `\n[${timestamp}] `;
      lastTimestamp = timestamp;
    }

    transcript += text + ' ';
  });

  console.log('[ChapterGen] Step 4: Final transcript length:', transcript.length);
  console.log('[ChapterGen] Preview:', transcript.substring(0, 300));

  if (transcript.length < 100) {
    throw new Error('Transcript too short - extraction may have failed');
  }

  return transcript.trim();
}

async function openTranscriptPanel() {
  // Method 1: Try clicking the description expand first, then look for transcript button
  console.log('[ChapterGen] Looking for transcript button...');

  // Try to find and click "...more" to expand description
  const moreButton = document.querySelector('tp-yt-paper-button#expand');
  if (moreButton) {
    console.log('[ChapterGen] Clicking expand button...');
    moreButton.click();
    await sleep(500);
  }

  // Look for "Show transcript" button in description
  const buttons = document.querySelectorAll('ytd-button-renderer button, ytd-button-renderer a');
  for (const btn of buttons) {
    const text = btn.textContent.toLowerCase();
    if (text.includes('transcript')) {
      console.log('[ChapterGen] Found transcript button, clicking...');
      btn.click();
      await sleep(1000);
      return;
    }
  }

  // Method 2: Click the ... menu under the video
  console.log('[ChapterGen] Trying menu button approach...');

  // Find the "..." button (more actions)
  const menuButton = document.querySelector('ytd-menu-renderer button[aria-label="More actions"]') ||
                     document.querySelector('ytd-video-primary-info-renderer ytd-menu-renderer button') ||
                     document.querySelector('#top-level-buttons-computed + ytd-menu-renderer button');

  if (menuButton) {
    console.log('[ChapterGen] Clicking menu button...');
    menuButton.click();
    await sleep(500);

    // Look for "Show transcript" in the menu
    const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
    for (const item of menuItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes('transcript')) {
        console.log('[ChapterGen] Found transcript menu item, clicking...');
        item.click();
        await sleep(1000);
        return;
      }
    }
  }

  // Method 3: Try the engagement panel directly
  console.log('[ChapterGen] Trying engagement panel approach...');
  const engagementPanels = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
  for (const panel of engagementPanels) {
    const title = panel.querySelector('#title');
    if (title && title.textContent.toLowerCase().includes('transcript')) {
      console.log('[ChapterGen] Found transcript panel');
      return;
    }
  }

  // Method 4: Keyboard shortcut (if available)
  console.log('[ChapterGen] Trying to trigger via other methods...');

  // Look for the transcript in expandable sections
  const expandableSections = document.querySelectorAll('ytd-structured-description-content-renderer');
  for (const section of expandableSections) {
    const transcriptSection = section.querySelector('ytd-video-description-transcript-section-renderer');
    if (transcriptSection) {
      const btn = transcriptSection.querySelector('button');
      if (btn) {
        console.log('[ChapterGen] Found transcript section button, clicking...');
        btn.click();
        await sleep(1000);
        return;
      }
    }
  }

  throw new Error('Could not find transcript button. Make sure the video has captions.');
}

async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      console.log('[ChapterGen] Found element:', selector);
      return element;
    }
    await sleep(200);
  }

  throw new Error(`Timeout waiting for: ${selector}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
