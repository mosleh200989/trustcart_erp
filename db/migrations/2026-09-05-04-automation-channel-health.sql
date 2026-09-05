-- Migration: connection health for each automation channel.
--
-- The Kasri page stopped receiving webhooks on 3 September and nobody knew for
-- two days. Nothing was broken on this side: the endpoint answered, the secret
-- was configured, the events table was simply empty — and an empty events table
-- looks exactly like a quiet day.
--
-- The cause was App ID 1045665091632294 having its API access blocked by
-- Facebook. A single Graph call would have surfaced that immediately, and so
-- would noticing that a page which normally hears from customers had gone
-- silent for a day.
--
-- SAFE FOR PRODUCTION: additive columns only, all nullable.

ALTER TABLE automation_channels
    ADD COLUMN IF NOT EXISTS health_status     VARCHAR(20),
    ADD COLUMN IF NOT EXISTS health_detail     TEXT,
    ADD COLUMN IF NOT EXISTS health_checked_at TIMESTAMP;

COMMENT ON COLUMN automation_channels.health_status IS
    'ok | warning | error | unknown — last result of the connection check';
COMMENT ON COLUMN automation_channels.health_detail IS
    'Human-readable reason, shown in the panel. Never contains the access token.';
