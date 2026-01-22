module.exports = async function handler(req, res) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Missing URL parameter. Please provide a YouTube URL.'
    });
  }

  // Extract video ID from URL
  const videoId = extractVideoId(url);

  if (!videoId) {
    return res.status(400).json({
      success: false,
      error: 'Invalid YouTube URL. Could not extract video ID.'
    });
  }

  try {
    console.log(`Fetching transcript for video ID: ${videoId}`);

    // Fetch the YouTube watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Fetched page: ${html.length} chars`);

    // Extract video title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Unknown';
    console.log(`Video title: ${title}`);

    // Find the captions data in the page
    const captionsMatch = html.match(/"captions":\s*(\{[^}]+\})/);
    if (!captionsMatch) {
      // Try alternative pattern
      const captionsMatch2 = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
      if (!captionsMatch2) {
        console.log('No captions data found in page');
        return res.status(404).json({
          success: false,
          error: 'No captions available for this video.'
        });
      }
    }

    // Find caption track URLs
    const trackMatch = html.match(/"captionTracks":\s*(\[[^\]]*\])/);
    if (!trackMatch) {
      console.log('No caption tracks found');
      return res.status(404).json({
        success: false,
        error: 'No captions available for this video.'
      });
    }

    let tracks;
    try {
      // Clean up the JSON - it might have nested quotes
      const trackJson = trackMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      tracks = JSON.parse(trackJson);
    } catch (e) {
      console.log('Failed to parse tracks JSON:', e.message);
      console.log('Track data:', trackMatch[1].substring(0, 200));

      // Try a different extraction method
      const baseUrlMatch = html.match(/"baseUrl":\s*"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
      if (!baseUrlMatch) {
        return res.status(404).json({
          success: false,
          error: 'Could not extract caption URL.'
        });
      }

      // Decode the URL
      const captionUrl = baseUrlMatch[1].replace(/\\u0026/g, '&');
      console.log(`Found caption URL: ${captionUrl.substring(0, 100)}...`);

      // Fetch the caption
      const captionResponse = await fetch(captionUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const captionXml = await captionResponse.text();
      console.log(`Caption XML length: ${captionXml.length}`);

      if (captionXml.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Empty caption response from YouTube.'
        });
      }

      // Parse XML
      const segments = parseXmlCaptions(captionXml);

      if (segments.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No caption content found.'
        });
      }

      return formatResponse(res, videoId, title, segments, 'en', 'unknown');
    }

    console.log(`Found ${tracks.length} caption tracks`);

    // Find English track (prefer manual over auto-generated)
    let selectedTrack = tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr');
    if (!selectedTrack) {
      selectedTrack = tracks.find(t => t.languageCode === 'en');
    }
    if (!selectedTrack) {
      selectedTrack = tracks.find(t => t.languageCode?.startsWith('en'));
    }
    if (!selectedTrack && tracks.length > 0) {
      selectedTrack = tracks[0];
    }

    if (!selectedTrack || !selectedTrack.baseUrl) {
      return res.status(404).json({
        success: false,
        error: 'No usable caption track found.'
      });
    }

    console.log(`Selected track: ${selectedTrack.name?.simpleText || selectedTrack.languageCode}`);

    // Try to fetch the caption content using YouTube's timedtext API with proper cookies
    const captionUrl = selectedTrack.baseUrl.replace(/\\u0026/g, '&');
    console.log(`Fetching captions from: ${captionUrl.substring(0, 80)}...`);

    // Extract cookies from the initial page response for authenticated requests
    const setCookieHeader = response.headers.get('set-cookie');

    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': setCookieHeader || '',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`
      }
    });

    let captionXml = await captionResponse.text();
    console.log(`Caption XML length: ${captionXml.length}`);

    // If still empty, try with fmt=srv3 format
    if (captionXml.length === 0) {
      const srv3Url = captionUrl + '&fmt=srv3';
      console.log('Trying srv3 format...');
      const srv3Response = await fetch(srv3Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': setCookieHeader || '',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`
        }
      });
      captionXml = await srv3Response.text();
      console.log(`srv3 response length: ${captionXml.length}`);
    }

    // If direct fetch fails, try YouTube's innertube transcript API
    if (captionXml.length === 0) {
      console.log('Direct fetch failed, trying innertube API...');

      // Extract the video params from page for innertube request
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([^"]+)"/);
      const visitorDataMatch = html.match(/"visitorData":\s*"([^"]+)"/);

      if (apiKeyMatch) {
        const apiKey = apiKeyMatch[1];
        const visitorData = visitorDataMatch ? visitorDataMatch[1] : '';

        // Make innertube transcript request
        const innertubeResponse = await fetch(
          `https://www.youtube.com/youtubei/v1/get_transcript?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'X-Youtube-Client-Name': '1',
              'X-Youtube-Client-Version': '2.20240101.00.00'
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: 'WEB',
                  clientVersion: '2.20240101.00.00',
                  visitorData: visitorData
                }
              },
              params: Buffer.from(`\n\x0b${videoId}`).toString('base64')
            })
          }
        );

        if (innertubeResponse.ok) {
          const innertubeData = await innertubeResponse.json();
          console.log('Innertube response received');

          // Extract transcript segments from innertube response
          const transcriptRenderer = innertubeData?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer;
          const cueGroups = transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;

          if (cueGroups && cueGroups.length > 0) {
            const segments = cueGroups
              .filter(g => g.transcriptSegmentRenderer)
              .map(g => {
                const r = g.transcriptSegmentRenderer;
                return {
                  startMs: parseInt(r.startMs || '0'),
                  text: r.snippet?.runs?.map(run => run.text).join('') || ''
                };
              })
              .filter(s => s.text.trim());

            if (segments.length > 0) {
              console.log(`Got ${segments.length} segments from innertube`);
              return formatResponse(res, videoId, title, segments, 'en', 'unknown');
            }
          }
        }
      }

      return res.status(503).json({
        success: false,
        error: 'YouTube is blocking automated transcript fetches. Please copy the transcript manually from YouTube (click "..." under the video, then "Show transcript") and paste it into the text area.'
      });
    }

    // Parse XML captions
    const segments = parseXmlCaptions(captionXml);

    if (segments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No caption content found.'
      });
    }

    return formatResponse(
      res,
      videoId,
      title,
      segments,
      selectedTrack.languageCode,
      selectedTrack.kind === 'asr' ? 'auto-generated' : 'manual'
    );

  } catch (error) {
    console.error('Transcript fetch error:', {
      videoId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });

    let errorMessage = 'Failed to fetch transcript.';
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('private')) {
        errorMessage = 'This video is private.';
      } else if (msg.includes('unavailable')) {
        errorMessage = 'This video is unavailable.';
      } else {
        errorMessage = `Transcript fetch failed: ${error.message}`;
      }
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

function parseXmlCaptions(xml) {
  const segments = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const startSec = parseFloat(match[1]);
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();

    if (text) {
      segments.push({ startMs: startSec * 1000, text });
    }
  }

  return segments;
}

function formatResponse(res, videoId, title, segments, language, captionType) {
  // Format transcript with timestamps
  const formattedTranscript = segments.map(segment => {
    const timestamp = formatTimestamp(segment.startMs / 1000);
    return `[${timestamp}] ${segment.text}`;
  }).join('\n');

  // Calculate duration from last segment
  const lastSegment = segments[segments.length - 1];
  const duration = formatTimestamp(lastSegment.startMs / 1000);

  return res.status(200).json({
    success: true,
    videoId: videoId,
    title: title,
    language: language,
    captionType: captionType,
    segments: segments.length,
    duration: duration,
    transcript: formattedTranscript
  });
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Format seconds to timestamp (M:SS or H:MM:SS)
function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
