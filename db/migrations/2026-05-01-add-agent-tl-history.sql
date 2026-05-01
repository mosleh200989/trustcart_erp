-- Migration: agent_tl_history
-- Purpose: Track which team leader each agent belonged to at each point in time.
-- This ensures commission attribution is based on the TL assignment that was
-- active WHEN the order was placed, not the current TL assignment.
-- Without this, transferring an agent re-attributes all their historical orders
-- to the new TL, zeroing out the old TL's commission.

CREATE TABLE IF NOT EXISTS agent_tl_history (
  id            SERIAL       PRIMARY KEY,
  agent_id      INT          NOT NULL,
  team_leader_id INT         NOT NULL,
  valid_from    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  valid_until   TIMESTAMPTZ  NULL,          -- NULL = still current
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ath_agent    ON agent_tl_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_ath_tl       ON agent_tl_history(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_ath_dates    ON agent_tl_history(valid_from, valid_until);

-- Backfill: treat current TL assignments as having been in place since the
-- beginning of time so that all pre-existing historical orders are correctly
-- attributed to the TL those agents are currently under.
INSERT INTO agent_tl_history (agent_id, team_leader_id, valid_from, valid_until)
SELECT id, team_leader_id, '2020-01-01'::timestamptz, NULL
FROM users
WHERE team_leader_id IS NOT NULL;
