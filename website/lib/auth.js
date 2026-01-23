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
  console.log('=== API KEY VALIDATION DEBUG ===');
  console.log('Raw key received:', apiKey);
  console.log('Key length:', apiKey?.length);
  console.log('Key starts with ltgv_:', apiKey?.startsWith('ltgv_'));
  console.log('Key last 4 chars:', apiKey?.slice(-4));
  console.log('Key has whitespace:', apiKey !== apiKey?.trim());

  if (!apiKey || !apiKey.startsWith('ltgv_')) {
    console.log('REJECTED: Key missing or wrong prefix');
    return null;
  }

  // Trim just in case
  const cleanKey = apiKey.trim();
  const keyHash = hashApiKey(cleanKey);

  console.log('Clean key length:', cleanKey.length);
  console.log('Generated hash:', keyHash);
  console.log('Hash length:', keyHash.length);

  // First, let's see ALL keys in the database to compare
  const { data: allKeys, error: allKeysError } = await supabase
    .from('api_keys')
    .select('key_hash, last_four, revoked_at')
    .is('revoked_at', null)
    .limit(5);

  console.log('All active keys in DB:');
  if (allKeys) {
    allKeys.forEach((k, i) => {
      console.log(`  Key ${i + 1}: hash=${k.key_hash}, last4=${k.last_four}`);
      console.log(`    Hash match: ${k.key_hash === keyHash}`);
    });
  }
  console.log('DB query error:', allKeysError);

  // Look up the key
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, revoked_at, key_hash')
    .eq('key_hash', keyHash)
    .single();

  console.log('Lookup result - keyData:', keyData);
  console.log('Lookup result - keyError:', keyError);

  if (keyError || !keyData || keyData.revoked_at) {
    console.log('REJECTED: Key not found or revoked');
    console.log('=== END VALIDATION DEBUG ===');
    return null;
  }

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  console.log('Key validated successfully, fetching user...');

  // Get the user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', keyData.user_id)
    .single();

  if (userError || !user) {
    console.log('REJECTED: User not found for key');
    console.log('=== END VALIDATION DEBUG ===');
    return null;
  }

  console.log('SUCCESS: User found:', user.email);
  console.log('User subscribed_postup:', user.subscribed_postup);
  console.log('=== END VALIDATION DEBUG ===');
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
