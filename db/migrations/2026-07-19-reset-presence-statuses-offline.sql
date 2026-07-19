-- One-time Presence reset: start everyone from checked-out/offline state.
-- Only users who were online get an offline event, so history is not polluted
-- with checkout events for users who were already offline.

WITH online_users AS (
  SELECT user_id
  FROM user_presence_statuses
  WHERE state = 'online'
),
ensured_statuses AS (
  INSERT INTO user_presence_statuses (
    user_id,
    state,
    last_changed_at,
    last_seen_at,
    source,
    created_at,
    updated_at
  )
  SELECT
    u.id,
    'offline',
    NOW(),
    NOW(),
    'system-reset',
    NOW(),
    NOW()
  FROM users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  ON CONFLICT (user_id) DO NOTHING
),
offline_events AS (
  INSERT INTO user_presence_events (
    user_id,
    state,
    source,
    occurred_at,
    created_at
  )
  SELECT
    user_id,
    'offline',
    'system-reset',
    NOW(),
    NOW()
  FROM online_users
  RETURNING user_id
)
UPDATE user_presence_statuses
SET state = 'offline',
    source = 'system-reset',
    last_changed_at = NOW(),
    last_seen_at = NOW(),
    updated_at = NOW()
WHERE state <> 'offline'
   OR source <> 'system-reset';
