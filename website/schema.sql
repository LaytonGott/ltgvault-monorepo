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

-- ============================================================================
-- RESUME BUILDER TABLES
-- ============================================================================

-- Main resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'My Resume',
    template VARCHAR(50) DEFAULT 'clean',
    color_theme VARCHAR(50) DEFAULT 'default',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add color_theme column if table already exists
-- ALTER TABLE resumes ADD COLUMN IF NOT EXISTS color_theme VARCHAR(50) DEFAULT 'default';

CREATE INDEX idx_resumes_user ON resumes(user_id);

-- Personal information
CREATE TABLE resume_personal_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    website_url VARCHAR(500),
    summary TEXT,
    photo_url TEXT,  -- Base64 encoded profile photo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add photo_url column if table already exists
-- ALTER TABLE resume_personal_info ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX idx_resume_personal_resume ON resume_personal_info(resume_id);

-- Education entries
CREATE TABLE resume_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    start_date VARCHAR(20),
    end_date VARCHAR(20),
    is_current BOOLEAN DEFAULT false,
    gpa VARCHAR(10),
    achievements TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_education_resume ON resume_education(resume_id);

-- Work experience (jobs, internships, volunteering)
CREATE TABLE resume_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date VARCHAR(20),
    end_date VARCHAR(20),
    is_current BOOLEAN DEFAULT false,
    experience_type VARCHAR(50) DEFAULT 'job',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_experience_resume ON resume_experience(resume_id);

-- Skills
CREATE TABLE resume_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_skills_resume ON resume_skills(resume_id);

-- Projects & Activities (important for teens with no work experience)
CREATE TABLE resume_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(50) DEFAULT 'project',
    organization VARCHAR(255),
    role VARCHAR(255),
    start_date VARCHAR(20),
    end_date VARCHAR(20),
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    project_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_projects_resume ON resume_projects(resume_id);

-- Certifications & Awards
CREATE TABLE resume_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    cert_name VARCHAR(255) NOT NULL,
    cert_type VARCHAR(50) DEFAULT 'certification',
    issuing_org VARCHAR(255),
    issue_date VARCHAR(20),
    expiry_date VARCHAR(20),
    credential_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resume_certifications_resume ON resume_certifications(resume_id);

-- Enable RLS on all resume tables
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_certifications ENABLE ROW LEVEL SECURITY;

-- Add resume builder subscription to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscribed_resumebuilder BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resumebuilder_subscription_id VARCHAR(255);

-- ============================================================================
-- AI USAGE TRACKING
-- ============================================================================

-- Track every AI generation request
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tool VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    model VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_user_tool ON ai_usage(user_id, tool);
CREATE INDEX idx_ai_usage_created ON ai_usage(created_at);
-- Index for rate limiting queries (user + recent time window)
CREATE INDEX idx_ai_usage_rate_limit ON ai_usage(user_id, created_at DESC);

-- Monthly usage summary (for faster limit checks)
CREATE TABLE ai_usage_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tool VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tool, month)
);

CREATE INDEX idx_ai_usage_monthly_lookup ON ai_usage_monthly(user_id, tool, month);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_monthly ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR RESUME BUILDER (Browser Access)
-- These allow authenticated browser clients to access their own data
-- ============================================================================

-- Allow users to read/write their own resumes
CREATE POLICY "Users can manage own resumes" ON resumes
  FOR ALL USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can manage own personal info" ON resume_personal_info
  FOR ALL USING (resume_id IN (SELECT id FROM resumes WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can manage own education" ON resume_education
  FOR ALL USING (resume_id IN (SELECT id FROM resumes WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can manage own experience" ON resume_experience
  FOR ALL USING (resume_id IN (SELECT id FROM resumes WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can manage own skills" ON resume_skills
  FOR ALL USING (resume_id IN (SELECT id FROM resumes WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can manage own projects" ON resume_projects
  FOR ALL USING (resume_id IN (SELECT id FROM resumes WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Users can manage own certifications" ON resume_certifications
  FOR ALL USING (resume_id IN (SELECT id FROM resumes WHERE user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'));
