const { YoutubeTranscript } = require('youtube-transcript');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, videoId } = req.body;

    // Extract video ID from URL if provided
    let id = videoId;
    if (!id && url) {
      id = extractVideoId(url);
    }

    if (!id) {
      return res.status(400).json({
        error: 'Invalid YouTube URL or video ID',
        message: 'Please provide a valid YouTube URL (e.g., https://youtube.com/watch?v=xxx)'
      });
    }

    console.log('Fetching transcript for video:', id);

    // Fetch transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(id);

    if (!transcriptItems || transcriptItems.length === 0) {
      return res.status(404).json({
        error: 'No transcript available',
        message: 'This video doesn\'t have captions/transcript available. Try pasting the transcript manually.'
      });
    }

    // Format transcript with timestamps
    const formattedTranscript = formatTranscript(transcriptItems);

    // Calculate video duration from last transcript item
    const lastItem = transcriptItems[transcriptItems.length - 1];
    const videoDuration = formatTime(lastItem.offset + lastItem.duration);

    return res.status(200).json({
      success: true,
      transcript: formattedTranscript,
      videoDuration: videoDuration,
      itemCount: transcriptItems.length
    });

  } catch (error) {
    console.error('Transcript fetch error:', error);

    // Handle specific errors
    if (error.message?.includes('Transcript is disabled')) {
      return res.status(404).json({
        error: 'Transcript disabled',
        message: 'Transcripts are disabled for this video. Try pasting the transcript manually.'
      });
    }

    if (error.message?.includes('Video unavailable') || error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Video not found',
        message: 'Could not find this video. Check the URL and try again.'
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch transcript',
      message: 'Couldn\'t fetch transcript automatically. Try pasting it manually below.'
    });
  }
};

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  if (!url) return null;

  // Clean up the URL
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
    const timestamp = formatTime(item.offset);
    const text = item.text.replace(/\n/g, ' ').trim();
    return `${timestamp} ${text}`;
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
