ALTER TABLE user_office_times
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar(80) NULL;

ALTER TABLE presence_settings
  ADD COLUMN IF NOT EXISTS telegram_reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_reminder_lead_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS telegram_offline_reminder_message text NOT NULL DEFAULT 'Hi {name}, your office time starts at {startTime}. Please come online if you are starting work.',
  ADD COLUMN IF NOT EXISTS telegram_online_thank_you_message text NOT NULL DEFAULT 'Thank you {name}. You are online on time for your {startTime} office start.';

CREATE TABLE IF NOT EXISTS presence_telegram_notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  date_key varchar(10) NOT NULL,
  kind varchar(30) NOT NULL,
  telegram_chat_id varchar(80) NOT NULL,
  message text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pending',
  error_message text NULL,
  sent_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_presence_telegram_notifications_user_date_kind UNIQUE (user_id, date_key, kind)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_telegram_notifications_unique
  ON presence_telegram_notifications(user_id, date_key, kind);

CREATE INDEX IF NOT EXISTS idx_presence_telegram_notifications_date_kind
  ON presence_telegram_notifications(date_key, kind);
