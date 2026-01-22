// Temporary test endpoint to see the prompt being generated
// DELETE THIS FILE AFTER DEBUGGING

const VIRAL_PATTERNS_BASE = `You are a LinkedIn post writer. Follow these rules STRICTLY.

=== HARD RULES - BREAK ANY AND THE POST IS REJECTED ===

BANNED OPENERS (never start a post with these):
- "I used to think..." / "I used to believe..."
- "I realized..." / "I learned..." / "I discovered..."
- "A few years ago..." / "When I started..."

BANNED PUNCTUATION:
- NEVER use em dashes (—). Use periods or commas instead.

BANNED PHRASES (anywhere in post):
- "game changer" / "game-changer"
- "Here's the thing..." / "Let me be honest..."
- "Most people..." / "Many founders..."
- "work in progress" / "still figuring it out" / "still learning"

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
`;

const TONE_PROMPTS = {
  casual: `
TONE: Casual but Opinionated
- Say what you actually think, not the safe version
- End with a punchy one-liner that sticks
`
};

function buildSystemPrompt(tone) {
  let prompt = VIRAL_PATTERNS_BASE;
  prompt += TONE_PROMPTS[tone] || TONE_PROMPTS.casual;
  return prompt;
}

function buildGenerationPrompt(userInput) {
  return `Transform the following into a LinkedIn post. Return a JSON object with this exact structure:
{
  "variations": [
    {"hookLine": "first line hook", "content": "full post including hook"},
    {"hookLine": "first line hook", "content": "full post including hook"}
  ]
}

CRITICAL RULES (FOLLOW STRICTLY):

NEVER USE THESE PHRASES - THEY WILL CAUSE REJECTION:
- "I used to think..." / "I used to believe..."
- "I realized..." / "I learned..."
- "game changer" / "game-changer"
- "A few years ago..." / "When I started..."
- Em dashes (—) - use periods or commas instead

HOOK REQUIREMENTS:
- First line must ATTACK: "X is hurting you" not "X is bad"
- NEVER start with "I used to..." or "I realized..."

OTHER RULES:
- Under 150 words total
- No hedge words (I think, might, maybe)

INPUT TO TRANSFORM:
${userInput}

=== FINAL SELF-CHECK (DO THIS BEFORE RETURNING) ===
Before returning your response, check each variation:
1. Does the hook start with "I used to" or "I realized"? → DELETE IT and rewrite with an attack hook
2. Are there any em dashes (—)? → Replace with periods or commas
3. Is it over 150 words? → Cut it down
4. Does it end soft ("still learning", "work in progress", "figuring it out")? → Rewrite ending with a punch

If ANY check fails, rewrite that variation before returning.

Return ONLY the JSON object, no other text.`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const testInput = req.query.input || "being busy vs being productive";
  const systemPrompt = buildSystemPrompt('casual');
  const userPrompt = buildGenerationPrompt(testInput);

  return res.status(200).json({
    message: "This shows the EXACT prompts being sent to Claude",
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length
  });
};
