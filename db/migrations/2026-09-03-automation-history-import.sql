-- Migration: Messenger conversation history import.
--
-- Stores past conversations so the bot can learn HOW the team writes, never
-- WHAT is true. Every number is masked before it is written, so a price quoted
-- in 2024 cannot be copied into a reply sent today — the stale figure is not
-- merely unused, it is never stored.
--
-- Kept in separate tables from automation_conversations / automation_messages
-- so imported history never appears in the live inbox or feeds the per-thread
-- reply context.
--
-- SAFE FOR PRODUCTION: IF NOT EXISTS everywhere.

-- 1. Import runs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_import_runs (
    id                 SERIAL PRIMARY KEY,
    channel_id         INTEGER      NOT NULL REFERENCES automation_channels(id) ON DELETE CASCADE,
    status             VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    -- Only import conversations touched on or after this date.
    since              TIMESTAMP,
    -- Opaque Graph API pagination cursor, so a long run can resume where it stopped.
    cursor             TEXT,
    threads_imported   INTEGER      NOT NULL DEFAULT 0,
    messages_imported  INTEGER      NOT NULL DEFAULT 0,
    pages_fetched      INTEGER      NOT NULL DEFAULT 0,
    error              TEXT,
    requested_by       INTEGER,
    started_at         TIMESTAMP,
    finished_at        TIMESTAMP,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_import_runs_channel_idx
    ON automation_import_runs (channel_id, created_at DESC);

-- 2. Historical threads -----------------------------------------------------
-- participant_ref is a salted hash of the PSID, never the PSID itself: threads
-- stay distinguishable from one another without holding an identifier that
-- points back at a person.
CREATE TABLE IF NOT EXISTS automation_history_threads (
    id                 SERIAL PRIMARY KEY,
    channel_id         INTEGER      NOT NULL REFERENCES automation_channels(id) ON DELETE CASCADE,
    run_id             INTEGER REFERENCES automation_import_runs(id) ON DELETE SET NULL,
    external_thread_id VARCHAR(191) NOT NULL,
    participant_ref    VARCHAR(64),
    message_count      INTEGER      NOT NULL DEFAULT 0,
    first_message_at   TIMESTAMP,
    last_message_at    TIMESTAMP,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_history_threads_external_idx
    ON automation_history_threads (channel_id, external_thread_id);
CREATE INDEX IF NOT EXISTS automation_history_threads_last_msg_idx
    ON automation_history_threads (last_message_at DESC);

-- 3. Historical messages ----------------------------------------------------
-- `text` holds the MASKED body only. The original is never written to disk.
CREATE TABLE IF NOT EXISTS automation_history_messages (
    id            SERIAL PRIMARY KEY,
    thread_id     INTEGER      NOT NULL REFERENCES automation_history_threads(id) ON DELETE CASCADE,
    channel_id    INTEGER      NOT NULL,
    external_id   VARCHAR(191) NOT NULL,
    -- inbound = the customer wrote it, outbound = the page/agent wrote it.
    -- Outbound messages are the ones worth learning tone from.
    direction     VARCHAR(10)  NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    text          TEXT,
    -- What the masker replaced, e.g. {"PRICE": 2, "PHONE": 1}. Useful for
    -- spotting messages that were mostly numbers and are poor style examples.
    masked_counts JSONB        NOT NULL DEFAULT '{}'::jsonb,
    -- Set by a human while picking examples for the AI system prompt.
    is_example    BOOLEAN      NOT NULL DEFAULT FALSE,
    sent_at       TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_history_messages_external_idx
    ON automation_history_messages (external_id);
CREATE INDEX IF NOT EXISTS automation_history_messages_thread_idx
    ON automation_history_messages (thread_id, sent_at);
CREATE INDEX IF NOT EXISTS automation_history_messages_example_idx
    ON automation_history_messages (is_example) WHERE is_example = TRUE;

-- 4. Permission -------------------------------------------------------------
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Import Automation History', 'import-automation-history', 'automation', 'update',
 'Import past Messenger conversations and pick style examples')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
AND p.slug = 'import-automation-history'
ON CONFLICT DO NOTHING;
