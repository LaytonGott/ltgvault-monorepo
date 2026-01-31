import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { supabase } from '@/lib/supabase';
import { createApiKeyForUser } from '@/lib/auth';

// Same secret used for signing
const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'ltgv-access-token-secret';

// Validate and parse access token
function validateAccessToken(token: string): { valid: boolean; error?: string; userId?: string; email?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');

    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [userId, email, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);

    // Check expiration
    if (Date.now() > expires) {
      return { valid: false, error: 'Token has expired' };
    }

    // Verify signature
    const payload = `${userId}:${email}:${expiresStr}`;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    return { valid: true, userId, email };
  } catch (err) {
    return { valid: false, error: 'Failed to parse token' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Validate token
    const tokenResult = validateAccessToken(token);

    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 400 });
    }

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', tokenResult.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify email matches
    if (user.email !== tokenResult.email) {
      return NextResponse.json({ error: 'Token email mismatch' }, { status: 400 });
    }

    // Generate new API key (revokes any existing one)
    const apiKey = await createApiKeyForUser(user.id);

    if (!apiKey) {
      return NextResponse.json({ error: 'Failed to generate access key' }, { status: 500 });
    }

    console.log(`Access activated for ${user.email} via magic link`);

    return NextResponse.json({
      success: true,
      apiKey: apiKey,
      email: user.email
    });

  } catch (error: any) {
    console.error('Activate access error:', error);
    return NextResponse.json({ error: 'Failed to activate access' }, { status: 500 });
  }
}
