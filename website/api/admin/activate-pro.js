const { supabase } = require('../../lib/supabase');

// Admin endpoint to manually activate Pro status
// Protected by admin secret
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin secret
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'];

  if (!adminSecret || providedSecret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { email, tool = 'resumebuilder' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !user) {
      return res.status(404).json({ error: 'User not found', email: email });
    }

    // Activate Pro
    const updateData = {
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    };
    updateData[`subscribed_${tool}`] = true;

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user', details: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Activated ${tool} Pro for ${email}`,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Admin activate error:', error);
    return res.status(500).json({ error: error.message });
  }
};
