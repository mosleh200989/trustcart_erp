-- Migration: Automation suite — Facebook/Instagram comment + Messenger automation.
--
-- Adds a self-contained "Automation" sub-panel: connected channels (pages),
-- raw webhook events, conversations, messages, keyword rules, a retrying
-- outbox, panel settings, and its own audit trail.
--
-- SAFE FOR PRODUCTION: IF NOT EXISTS / ON CONFLICT DO NOTHING everywhere.

-- 1. Settings ---------------------------------------------------------------
-- Flat key -> jsonb store so the panel can add new knobs without a migration.
CREATE TABLE IF NOT EXISTS automation_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_by  INTEGER
);

-- 2. Channels ---------------------------------------------------------------
-- One row per connected Facebook Page / Instagram account.
-- The page access token lives here (not in .env) so a brand can be added from
-- the panel without a deploy. storefront_id links replies to that brand's data.
CREATE TABLE IF NOT EXISTS automation_channels (
    id                          SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    platform                    VARCHAR(20)  NOT NULL DEFAULT 'facebook'
                                 CHECK (platform IN ('facebook', 'instagram')),
    page_id                     VARCHAR(64)  NOT NULL,
    page_access_token           TEXT,
    ig_account_id               VARCHAR(64),
    storefront_id               INTEGER REFERENCES storefronts(id) ON DELETE SET NULL,

    -- off = ignore everything, shadow = decide + store but never send,
    -- live = actually reply on Facebook.
    mode                        VARCHAR(20)  NOT NULL DEFAULT 'off'
                                 CHECK (mode IN ('off', 'shadow', 'live')),

    reply_to_comments           BOOLEAN NOT NULL DEFAULT TRUE,
    reply_to_messages           BOOLEAN NOT NULL DEFAULT TRUE,
    private_reply_to_comments   BOOLEAN NOT NULL DEFAULT FALSE,

    persona                     TEXT,          -- extra system-prompt text for this brand
    greeting                    TEXT,          -- optional first-contact message
    signature                   VARCHAR(255),  -- appended to every reply

    max_replies_per_thread_hour INTEGER NOT NULL DEFAULT 3,
    business_hours              JSONB   NOT NULL DEFAULT '{}'::jsonb,

    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    last_event_at               TIMESTAMP,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_channels_platform_page_idx
    ON automation_channels (platform, page_id);

-- 3. Events -----------------------------------------------------------------
-- Every webhook delivery, stored before anything else happens.
-- meta_event_id is UNIQUE — that index IS the de-duplication, enforced by the
-- database rather than by application code, so Meta's retries are harmless.
CREATE TABLE IF NOT EXISTS automation_events (
    id              SERIAL PRIMARY KEY,
    channel_id      INTEGER REFERENCES automation_channels(id) ON DELETE SET NULL,
    platform        VARCHAR(20)  NOT NULL DEFAULT 'facebook',
    page_id         VARCHAR(64),
    event_type      VARCHAR(40)  NOT NULL DEFAULT 'unknown',
    meta_event_id   VARCHAR(191) NOT NULL,
    signature_valid BOOLEAN      NOT NULL DEFAULT FALSE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received', 'handled', 'skipped', 'failed')),
    skip_reason     VARCHAR(160),
    payload         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    error           TEXT,
    received_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_events_meta_event_idx
    ON automation_events (meta_event_id);
CREATE INDEX IF NOT EXISTS automation_events_received_idx
    ON automation_events (received_at DESC);
CREATE INDEX IF NOT EXISTS automation_events_status_idx
    ON automation_events (status);

-- 4. Conversations ----------------------------------------------------------
-- One thread: a Messenger chat (keyed by PSID) or a post's comment thread.
CREATE TABLE IF NOT EXISTS automation_conversations (
    id                SERIAL PRIMARY KEY,
    channel_id        INTEGER      NOT NULL REFERENCES automation_channels(id) ON DELETE CASCADE,
    thread_type       VARCHAR(20)  NOT NULL CHECK (thread_type IN ('comment', 'message')),
    thread_key        VARCHAR(191) NOT NULL,
    psid              VARCHAR(64),
    post_id           VARCHAR(191),
    customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    display_name      VARCHAR(255),
    status            VARCHAR(20)  NOT NULL DEFAULT 'bot'
                       CHECK (status IN ('bot', 'needs_human', 'human', 'closed')),
    escalation_reason VARCHAR(255),
    assigned_user_id  INTEGER,
    last_inbound_at   TIMESTAMP,
    last_outbound_at  TIMESTAMP,
    message_count     INTEGER      NOT NULL DEFAULT 0,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_conversations_thread_idx
    ON automation_conversations (channel_id, thread_type, thread_key);
CREATE INDEX IF NOT EXISTS automation_conversations_status_idx
    ON automation_conversations (status, updated_at DESC);

-- 5. Messages ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER     NOT NULL REFERENCES automation_conversations(id) ON DELETE CASCADE,
    channel_id      INTEGER     NOT NULL,
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    kind            VARCHAR(20) NOT NULL DEFAULT 'message'
                     CHECK (kind IN ('message', 'comment', 'private_reply', 'post')),
    external_id     VARCHAR(191),
    text            TEXT,
    source          VARCHAR(20),  -- rule | erp | ai | human | greeting
    rule_id         INTEGER,
    confidence      NUMERIC(4, 3),
    shadow          BOOLEAN     NOT NULL DEFAULT FALSE,
    status          VARCHAR(20) NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('pending', 'sent', 'failed', 'held')),
    error           TEXT,
    ai_model        VARCHAR(60),
    ai_usage        JSONB,
    meta            JSONB,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_messages_conversation_idx
    ON automation_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS automation_messages_created_idx
    ON automation_messages (created_at DESC);

-- 6. Rules ------------------------------------------------------------------
-- Keyword replies, editable from the panel with no deploy.
-- channel_id NULL = applies to every channel.
CREATE TABLE IF NOT EXISTS automation_rules (
    id                 SERIAL PRIMARY KEY,
    channel_id         INTEGER REFERENCES automation_channels(id) ON DELETE CASCADE,
    name               VARCHAR(255) NOT NULL,
    match_type         VARCHAR(20)  NOT NULL DEFAULT 'contains'
                        CHECK (match_type IN ('contains', 'equals', 'starts_with', 'regex')),
    patterns           JSONB        NOT NULL DEFAULT '[]'::jsonb,
    applies_to         VARCHAR(20)  NOT NULL DEFAULT 'both'
                        CHECK (applies_to IN ('comment', 'message', 'both')),
    action             VARCHAR(20)  NOT NULL DEFAULT 'reply'
                        CHECK (action IN ('reply', 'escalate', 'ignore', 'ai')),
    reply_text         TEXT,
    private_reply_text TEXT,
    priority           INTEGER      NOT NULL DEFAULT 100,
    stop_on_match      BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    hit_count          INTEGER      NOT NULL DEFAULT 0,
    last_hit_at        TIMESTAMP,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_rules_lookup_idx
    ON automation_rules (is_active, priority);

-- 7. Outbox -----------------------------------------------------------------
-- Every outgoing Graph API action. Attempted immediately; failures are retried
-- by the cron sweep with backoff (same shape as MetaCapiService's retry sweep).
CREATE TABLE IF NOT EXISTS automation_outbox (
    id              SERIAL PRIMARY KEY,
    channel_id      INTEGER     NOT NULL,
    conversation_id INTEGER,
    message_id      INTEGER,
    action          VARCHAR(30) NOT NULL,
    payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts        INTEGER     NOT NULL DEFAULT 0,
    max_attempts    INTEGER     NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    last_error      TEXT,
    external_id     VARCHAR(191),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS automation_outbox_due_idx
    ON automation_outbox (status, next_attempt_at);

-- 8. Panel audit trail ------------------------------------------------------
-- Self-contained history of every change made inside the Automation panel.
CREATE TABLE IF NOT EXISTS automation_audit (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    user_email VARCHAR(255),
    action     VARCHAR(80) NOT NULL,
    entity     VARCHAR(60),
    entity_id  VARCHAR(60),
    before     JSONB,
    after      JSONB,
    ip         VARCHAR(64),
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_audit_created_idx
    ON automation_audit (created_at DESC);

-- 9. Permissions ------------------------------------------------------------
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Automation',            'view-automation',            'automation', 'read',   'See the Automation button and open the automation panel'),
('Manage Automation',          'manage-automation',          'automation', 'update', 'Change automation channels, rules and settings'),
('Reply Automation Inbox',     'reply-automation-inbox',     'automation', 'update', 'Send manual replies from the automation inbox'),
('Manage Automation Security', 'manage-automation-security', 'automation', 'manage', 'Set or reset the automation panel password')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
AND p.slug IN ('view-automation', 'manage-automation', 'reply-automation-inbox', 'manage-automation-security')
ON CONFLICT DO NOTHING;

-- 10. Default settings ------------------------------------------------------
INSERT INTO automation_settings (key, value) VALUES
('global', '{
    "enabled": false,
    "kill_switch": false,
    "default_mode": "shadow",
    "verify_signature": true,
    "log_retention_days": 90,
    "typing_indicator": true,
    "mark_seen": true,
    "fallback_action": "escalate"
}'::jsonb),
('ai', '{
    "enabled": false,
    "model": "claude-opus-5",
    "effort": "low",
    "max_tokens": 1024,
    "min_confidence": 0.6,
    "history_turns": 8,
    "system_prompt": "You are a polite customer-support assistant for an online shop in Bangladesh. Reply in the same language the customer used (Bangla, Banglish or English). Keep replies under 3 short sentences. Never invent prices, stock levels, discounts or delivery dates — use only the facts given to you. If you are unsure, or the customer asks about a specific order, a refund, or a complaint, escalate to a human instead of guessing."
}'::jsonb),
('escalation', '{
    "keywords": ["refund", "complain", "complaint", "fraud", "police", "lawyer", "manager", "taka ferot", "ferot dibo", "return korbo", "vul product", "kharap"],
    "escalate_on_order_number": true,
    "escalate_on_phone_number": true,
    "create_support_ticket": true
}'::jsonb),
('gate', '{
    "password_hash": null,
    "session_minutes": 30,
    "max_attempts": 5,
    "lockout_minutes": 15,
    "failed_attempts": 0,
    "locked_until": null
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
