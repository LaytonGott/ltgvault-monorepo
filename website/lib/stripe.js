import Stripe from 'stripe';

const rawKey = process.env.STRIPE_SECRET_KEY;
const stripeSecretKey = rawKey?.trim();

if (!stripeSecretKey) {
  console.warn('Stripe secret key not configured');
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Price IDs for each tool ($7/month each) - trim to remove any trailing newlines
// Note: Vercel env vars use inconsistent naming, so we check both patterns
const PRICE_IDS = {
  postup: (process.env.STRIPE_POSTUP_PRICE_ID || process.env.STRIPE_POSTUP_PRICE)?.trim(),
  chaptergen: (process.env.STRIPE_CHAPTERGEN_PRICE_ID || process.env.STRIPE_CHAPTERGEN_PRICE)?.trim(),
  threadgen: (process.env.STRIPE_THREADGEN_PRICE_ID || process.env.STRIPE_THREADGEN_PRICE)?.trim()
};

// Free tier limits (lifetime, not monthly)
export const FREE_LIMITS = {
  postup: 3,
  chaptergen: 1,
  threadgen: 3
};

// Get tool name from price ID
export function getToolFromPriceId(priceId) {
  if (priceId === PRICE_IDS.postup) return 'postup';
  if (priceId === PRICE_IDS.chaptergen) return 'chaptergen';
  if (priceId === PRICE_IDS.threadgen) return 'threadgen';
  return null;
}

// Get price ID from tool name
export function getPriceIdFromTool(tool) {
  return PRICE_IDS[tool] || null;
}

export { PRICE_IDS };
