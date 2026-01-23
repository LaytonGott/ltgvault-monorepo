const Stripe = require('stripe');

const rawKey = process.env.STRIPE_SECRET_KEY;
const stripeSecretKey = rawKey?.trim();

// Debug logging - remove after fixing
console.log('Stripe key exists:', !!stripeSecretKey);
console.log('Stripe key length (raw):', rawKey?.length);
console.log('Stripe key length (trimmed):', stripeSecretKey?.length);
console.log('Stripe key prefix:', stripeSecretKey?.substring(0, 8));

if (!stripeSecretKey) {
  console.warn('Stripe secret key not configured');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Price IDs for each tool ($7/month each) - trim to remove any trailing newlines
const PRICE_IDS = {
  postup: process.env.STRIPE_POSTUP_PRICE_ID?.trim(),
  chaptergen: process.env.STRIPE_CHAPTERGEN_PRICE_ID?.trim(),
  threadgen: process.env.STRIPE_THREADGEN_PRICE_ID?.trim()
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
