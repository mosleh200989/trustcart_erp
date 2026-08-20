-- CRM Notifications table
-- Stores per-user in-app notifications for task assignments and follow-up reminders

CREATE TABLE IF NOT EXISTS crm_notifications (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  type          VARCHAR(60) NOT NULL,        -- 'task_assigned' | 'followup_assigned' | 'followup_due'
  title         VARCHAR(255) NOT NULL,
  body          TEXT,
  metadata      JSONB DEFAULT '{}',
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notif_user_unread
  ON crm_notifications (user_id, is_read, created_at DESC);

-- Auto-purge notifications older than 60 days (run via pg_cron or manually)
-- DELETE FROM crm_notifications WHERE created_at < now() - INTERVAL '60 days';
