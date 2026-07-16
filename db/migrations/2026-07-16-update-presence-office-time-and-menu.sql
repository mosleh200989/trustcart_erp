-- Presence module refinements: office-time controls and menu naming.

ALTER TABLE user_office_times
  ADD COLUMN IF NOT EXISTS caution_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lunch_break_start_time varchar(5) NULL,
  ADD COLUMN IF NOT EXISTS lunch_break_end_time varchar(5) NULL;

ALTER TABLE user_office_times
  DROP COLUMN IF EXISTS telegram_chat_id;

ALTER TABLE presence_settings
  DROP COLUMN IF EXISTS telegram_reminders_enabled,
  DROP COLUMN IF EXISTS telegram_reminder_lead_minutes,
  DROP COLUMN IF EXISTS telegram_offline_reminder_message,
  DROP COLUMN IF EXISTS telegram_online_thank_you_message;

DROP TABLE IF EXISTS presence_telegram_notifications;

UPDATE admin_menu_items
SET title = 'Presence',
    updated_at = NOW()
WHERE title = 'Check In/Out'
  AND path IS NULL;

UPDATE admin_menu_items
SET title = 'Check In/Out',
    updated_at = NOW()
WHERE path = '/admin/presence'
  AND title IN ('Dashboard', 'Presence Dashboard');
