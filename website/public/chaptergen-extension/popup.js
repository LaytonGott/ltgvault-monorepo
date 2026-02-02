// Elements
const youtubeContent = document.getElementById('youtubeContent');
const notYoutube = document.getElementById('notYoutube');
const grabBtn = document.getElementById('grabBtn');
const sendBtn = document.getElementById('sendBtn');
const status = document.getElementById('status');
const transcriptPreview = document.getElementById('transcriptPreview');
const transcriptInfo = document.getElementById('transcriptInfo');
const openYoutubeBtn = document.getElementById('openYoutube');

let currentTranscript = '';

// Check if we're on YouTube
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  if (url.includes('youtube.com/watch')) {
    youtubeContent.style.display = 'block';
    notYoutube.style.display = 'none';
  } else {
    youtubeContent.style.display = 'none';
    notYoutube.style.display = 'block';
  }
});

// Open YouTube button
openYoutubeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.youtube.com' });
});

// Grab transcript button
grabBtn.addEventListener('click', async () => {
  grabBtn.disabled = true;
  grabBtn.textContent = 'Grabbing...';
  showStatus('Opening transcript panel...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject and run the content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: grabTranscriptFromPage
    });

    const result = results[0]?.result;

    if (result?.error) {
      showStatus(result.error, 'error');
      grabBtn.disabled = false;
      grabBtn.textContent = 'Grab Transcript';
      return;
    }

    if (result?.transcript) {
      currentTranscript = result.transcript;

      // Show preview
      const previewText = currentTranscript.substring(0, 500) + (currentTranscript.length > 500 ? '...' : '');
      transcriptPreview.textContent = previewText;
      transcriptPreview.classList.add('visible');

      // Show info
      const wordCount = currentTranscript.split(/\s+/).length;
      transcriptInfo.textContent = `${wordCount.toLocaleString()} words captured`;
      transcriptInfo.style.display = 'block';

      // Show send button
      sendBtn.style.display = 'block';

      showStatus('Transcript grabbed successfully!', 'success');
      grabBtn.textContent = 'Grab Again';
      grabBtn.disabled = false;
    } else {
      showStatus('No transcript found. Make sure the video has captions.', 'error');
      grabBtn.disabled = false;
      grabBtn.textContent = 'Grab Transcript';
    }

  } catch (err) {
    console.error('Error:', err);
    showStatus('Failed to grab transcript. Try refreshing the page.', 'error');
    grabBtn.disabled = false;
    grabBtn.textContent = 'Grab Transcript';
  }
});

// Send to ChapterGen button
sendBtn.addEventListener('click', async () => {
  if (!currentTranscript) return;

  sendBtn.disabled = true;
  sendBtn.textContent = 'Opening ChapterGen...';

  // For short transcripts, use URL hash (most reliable)
  // For longer transcripts, use localStorage with retries
  const encodedTranscript = encodeURIComponent(currentTranscript);

  if (encodedTranscript.length < 8000) {
    // Short enough for URL - most reliable method
    chrome.tabs.create({
      url: `https://ltgvault.com/chaptergen.html?from_extension=true&transcript=${encodedTranscript}`
    });
  } else {
    // Long transcript - use localStorage injection with retries
    const tab = await chrome.tabs.create({
      url: 'https://ltgvault.com/chaptergen.html?from_extension=true&use_storage=true'
    });

    // Wait for page to load, then inject transcript multiple times to ensure it works
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // Inject multiple times with delays to ensure the page catches it
        const injectTranscript = () => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (transcript) => {
              // Store in both localStorage and sessionStorage
              localStorage.setItem('chaptergen_extension_transcript', transcript);
              sessionStorage.setItem('chaptergen_extension_transcript', transcript);
              // Trigger custom event
              window.dispatchEvent(new CustomEvent('chaptergen_transcript_ready', { detail: transcript }));
              // Also dispatch storage event manually (for cross-tab listeners)
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'chaptergen_extension_transcript',
                newValue: transcript
              }));
            },
            args: [currentTranscript]
          }).catch(err => console.log('Inject error (may be normal):', err));
        };

        // Inject immediately and with delays
        injectTranscript();
        setTimeout(injectTranscript, 500);
        setTimeout(injectTranscript, 1500);
        setTimeout(injectTranscript, 3000);
      }
    });
  }
});

// Show status message
function showStatus(message, type) {
  status.textContent = message;
  status.className = 'status visible ' + type;
}

// Function that runs in the page context to grab transcript
function grabTranscriptFromPage() {
  return new Promise((resolve) => {
    // First, try to find and click the "Show transcript" button
    const expandButton = document.querySelector('tp-yt-paper-button#expand');
    if (expandButton) {
      expandButton.click();
    }

    // Wait a moment for description to expand
    setTimeout(() => {
      // Look for "Show transcript" button in the description
      const buttons = document.querySelectorAll('button, ytd-button-renderer');
      let transcriptBtn = null;

      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('show transcript')) {
          transcriptBtn = btn;
          break;
        }
      }

      // Also check for the engagement panel button
      if (!transcriptBtn) {
        const menuButtons = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
        for (const btn of menuButtons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('transcript')) {
            transcriptBtn = btn;
            break;
          }
        }
      }

      if (transcriptBtn) {
        transcriptBtn.click();

        // Wait for transcript panel to load
        setTimeout(() => {
          const transcript = extractTranscript();
          resolve(transcript);
        }, 1500);
      } else {
        // Try to find already open transcript
        const transcript = extractTranscript();
        if (transcript.transcript) {
          resolve(transcript);
        } else {
          resolve({ error: 'Could not find transcript button. Try clicking "...more" under the video first.' });
        }
      }
    }, 500);
  });

  function extractTranscript() {
    // Look for transcript segments
    const segments = document.querySelectorAll('ytd-transcript-segment-renderer');

    if (segments.length > 0) {
      const lines = [];
      segments.forEach(segment => {
        const timestamp = segment.querySelector('.segment-timestamp')?.textContent?.trim() || '';
        const text = segment.querySelector('.segment-text')?.textContent?.trim() || '';
        if (text) {
          lines.push(`[${timestamp}] ${text}`);
        }
      });

      if (lines.length > 0) {
        return { transcript: lines.join('\n') };
      }
    }

    // Alternative: check for transcript in engagement panel
    const transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
    if (transcriptPanel) {
      const items = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
      const lines = [];
      items.forEach(item => {
        const timestamp = item.querySelector('.segment-timestamp')?.textContent?.trim() || '';
        const text = item.querySelector('.segment-text')?.textContent?.trim() || '';
        if (text) {
          lines.push(`[${timestamp}] ${text}`);
        }
      });

      if (lines.length > 0) {
        return { transcript: lines.join('\n') };
      }
    }

    return { transcript: null };
  }
}
