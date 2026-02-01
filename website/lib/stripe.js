const Stripe = require('stripe');

const rawKey = process.env.STRIPE_SECRET_KEY;
const stripeSecretKey = rawKey ? rawKey.trim() : null;

if (!stripeSecretKey) {
  console.warn('Stripe secret key not configured');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Price IDs for each tool - trim to remove any trailing newlines
// Note: Vercel env vars use inconsistent naming, so we check both patterns
// Subscriptions ($7/month): postup, chaptergen, threadgen
// One-time ($19): resumebuilder
const PRICE_IDS = {
  postup: (process.env.STRIPE_POSTUP_PRICE_ID || process.env.STRIPE_POSTUP_PRICE || '').trim() || undefined,
  chaptergen: (process.env.STRIPE_CHAPTERGEN_PRICE_ID || process.env.STRIPE_CHAPTERGEN_PRICE || '').trim() || undefined,
  threadgen: (process.env.STRIPE_THREADGEN_PRICE_ID || process.env.STRIPE_THREADGEN_PRICE || '').trim() || undefined,
  resumebuilder: (process.env.STRIPE_RESUMEBUILDER_PRICE_ID || process.env.STRIPE_RESUMEBUILDER_PRICE || '').trim() || undefined
};

// Tools that use one-time payment instead of subscription
const ONE_TIME_TOOLS = ['resumebuilder'];

// Free tier limits (lifetime, not monthly)
const FREE_LIMITS = {
  postup: 3,
  chaptergen: 1,
  threadgen: 3
};

// Get tool name from price ID
function getToolFromPriceId(priceId) {
  if (priceId === PRICE_IDS.postup) return 'postup';
  if (priceId === PRICE_IDS.chaptergen) return 'chaptergen';
  if (priceId === PRICE_IDS.threadgen) return 'threadgen';
  if (priceId === PRICE_IDS.resumebuilder) return 'resumebuilder';
  return null;
}

// Check if a tool uses one-time payment
function isOneTimePayment(tool) {
  return ONE_TIME_TOOLS.includes(tool);
}

// Get price ID from tool name
function getPriceIdFromTool(tool) {
  return PRICE_IDS[tool] || null;
}

module.exports = {
  stripe,
  PRICE_IDS,
  FREE_LIMITS,
  ONE_TIME_TOOLS,
  getToolFromPriceId,
  getPriceIdFromTool,
  isOneTimePayment
};
