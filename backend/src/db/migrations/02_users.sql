-- ============================================================
-- KitchenPulse — Users & Authentication Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255),
    name           VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url     TEXT,
    auth_provider  VARCHAR(50) NOT NULL DEFAULT 'email', -- 'email' | 'google'
    google_id      VARCHAR(255) UNIQUE,
    role           VARCHAR(50) NOT NULL DEFAULT 'Executive Chef',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
