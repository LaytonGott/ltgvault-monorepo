const { YoutubeTranscript } = require('youtube-transcript');

function extractVideoId(input) {
  if (!input) return null;

  // If it's already just a video ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Try to extract from various YouTube URL formats
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Shorts URL: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // Live URL: youtube.com/live/VIDEO_ID
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    // Video ID with additional params
    /[?&]v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url, videoId } = req.query;
  const input = url || videoId;

  if (!input) {
    res.status(400).json({
      error: 'Missing parameter',
      message: 'Please provide a "url" or "videoId" query parameter'
    });
    return;
  }

  const extractedVideoId = extractVideoId(input);

  if (!extractedVideoId) {
    res.status(400).json({
      error: 'Invalid input',
      message: 'Could not extract video ID from the provided URL or ID'
    });
    return;
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(extractedVideoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      res.status(404).json({
        error: 'No transcript',
        message: 'No transcript found for this video. The video may not have captions available.'
      });
      return;
    }

    // Format transcript with timestamps
    const formattedTranscript = transcriptItems.map(item => {
      const timestamp = formatTimestamp(item.offset / 1000);
      const text = item.text.replace(/\n/g, ' ').trim();
      return `[${timestamp}] ${text}`;
    }).join('\n');

    // Also provide plain text version
    const plainText = transcriptItems.map(item => item.text.replace(/\n/g, ' ').trim()).join(' ');

    res.status(200).json({
      videoId: extractedVideoId,
      transcript: formattedTranscript,
      plainText: plainText,
      segments: transcriptItems.length,
      duration: transcriptItems.length > 0
        ? formatTimestamp(transcriptItems[transcriptItems.length - 1].offset / 1000)
        : '0:00'
    });
  } catch (error) {
    console.error('Transcript fetch error:', error);

    // Handle specific error cases
    if (error.message?.includes('disabled')) {
      res.status(404).json({
        error: 'Transcript disabled',
        message: 'Transcripts are disabled for this video'
      });
      return;
    }

    if (error.message?.includes('not found') || error.message?.includes('unavailable')) {
      res.status(404).json({
        error: 'Video not found',
        message: 'The video could not be found or is not available'
      });
      return;
    }

    res.status(500).json({
      error: 'Fetch failed',
      message: 'Failed to fetch transcript. Please try again later.'
    });
  }
};
