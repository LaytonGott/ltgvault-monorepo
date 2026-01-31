const Stripe = require('stripe');

const rawKey = process.env.STRIPE_SECRET_KEY;
const stripeSecretKey = rawKey ? rawKey.trim() : null;

if (!stripeSecretKey) {
  console.warn('Stripe secret key not configured');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Price IDs for each tool ($7/month each) - trim to remove any trailing newlines
// Note: Vercel env vars use inconsistent naming, so we check both patterns
const PRICE_IDS = {
  postup: (process.env.STRIPE_POSTUP_PRICE_ID || process.env.STRIPE_POSTUP_PRICE || '').trim() || undefined,
  chaptergen: (process.env.STRIPE_CHAPTERGEN_PRICE_ID || process.env.STRIPE_CHAPTERGEN_PRICE || '').trim() || undefined,
  threadgen: (process.env.STRIPE_THREADGEN_PRICE_ID || process.env.STRIPE_THREADGEN_PRICE || '').trim() || undefined
};

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
  return null;
}

// Get price ID from tool name
function getPriceIdFromTool(tool) {
  return PRICE_IDS[tool] || null;
}

module.exports = {
  stripe,
  PRICE_IDS,
  FREE_LIMITS,
  getToolFromPriceId,
  getPriceIdFromTool
};
