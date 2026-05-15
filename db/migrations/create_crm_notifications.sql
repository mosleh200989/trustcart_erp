-- Create CRM notifications table used by /api/crm/notifications.
-- Run: psql -U postgres -d trustcart_erp -f db/migrations/create_crm_notifications.sql

CREATE TABLE IF NOT EXISTS crm_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_user_read
  ON crm_notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_created_at
  ON crm_notifications (created_at DESC);
