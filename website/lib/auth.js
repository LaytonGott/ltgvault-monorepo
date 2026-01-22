const crypto = require('crypto');
const { supabase } = require('./supabase');

// Generate a new API key
function generateApiKey() {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  return `ltgv_${randomBytes}`;
}

// Hash an API key for storage
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Get the last 4 characters of an API key
function getLastFour(apiKey) {
  return apiKey.slice(-4);
}

// Validate an API key and return the user
async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('ltgv_')) {
    return null;
  }

  const keyHash = hashApiKey(apiKey);

  // Look up the key
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (keyError || !keyData || keyData.revoked_at) {
    return null;
  }

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  // Get the user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', keyData.user_id)
    .single();

  if (userError || !user) {
    return null;
  }

  return user;
}

// Create a new API key for a user
async function createApiKeyForUser(userId) {
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const lastFour = getLastFour(apiKey);

  // Revoke any existing keys for this user
  await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  // Create new key
  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: 'ltgv_',
      last_four: lastFour
    });

  if (error) {
    console.error('Error creating API key:', error);
    return null;
  }

  return apiKey;
}

// Middleware to extract and validate API key from request
async function authenticateRequest(req) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return { user: null, error: 'Missing API key. Include x-api-key header.' };
  }

  const user = await validateApiKey(apiKey);

  if (!user) {
    return { user: null, error: 'Invalid or revoked API key.' };
  }

  // Check subscription status
  if (user.subscription_status === 'canceled' || user.subscription_status === 'past_due') {
    return { user: null, error: 'Subscription inactive. Please update your billing.' };
  }

  return { user, error: null };
}

module.exports = {
  generateApiKey,
  hashApiKey,
  getLastFour,
  validateApiKey,
  createApiKeyForUser,
  authenticateRequest
};
