-- LTG Vault Database Schema
-- Per-tool subscription model with lifetime free tier

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    subscription_status VARCHAR(50) DEFAULT 'active',

    -- Per-tool subscriptions (true = subscribed, false = free tier)
    subscribed_postup BOOLEAN DEFAULT false,
    subscribed_chaptergen BOOLEAN DEFAULT false,
    subscribed_threadgen BOOLEAN DEFAULT false,

    -- Stripe subscription IDs for each tool
    postup_subscription_id VARCHAR(255),
    chaptergen_subscription_id VARCHAR(255),
    threadgen_subscription_id VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL,
    key_prefix VARCHAR(10) DEFAULT 'ltgv_',
    last_four VARCHAR(4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

-- Index for faster API key hash lookups
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- Usage table (lifetime usage, no monthly reset)
CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tool VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tool)
);

-- Index for faster usage lookups
CREATE INDEX idx_usage_user_tool ON usage(user_id, tool);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- RLS enabled with NO public policies = blocks all direct client access
-- Service role key (used by our API) bypasses RLS entirely
-- This means: API server can read/write, but no one can access directly
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- NO POLICIES NEEDED - service_role key bypasses RLS
-- If you previously created service_role policies, drop them:
-- DROP POLICY IF EXISTS "Service role can do anything on users" ON users;
-- DROP POLICY IF EXISTS "Service role can do anything on api_keys" ON api_keys;
-- DROP POLICY IF EXISTS "Service role can do anything on usage" ON usage;
