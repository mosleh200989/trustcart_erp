ALTER TABLE automatic_order_assignment_settings
  ADD COLUMN IF NOT EXISTS max_daily_orders integer NOT NULL DEFAULT 100;

UPDATE automatic_order_assignment_settings
SET max_daily_orders = COALESCE(NULLIF(max_daily_orders, 0), 100);

CREATE TABLE IF NOT EXISTS automatic_order_assignment_agent_preferences (
  id serial PRIMARY KEY,
  team_leader_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id integer NULL REFERENCES products(id) ON DELETE SET NULL,
  updated_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_auto_assignment_agent_preference UNIQUE (team_leader_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_assignment_agent_preferences_tl
  ON automatic_order_assignment_agent_preferences(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_agent_preferences_product
  ON automatic_order_assignment_agent_preferences(product_id);

ALTER TABLE automatic_order_assignment_agent_preferences
  ADD COLUMN IF NOT EXISTS assignment_order_direction varchar(4) NOT NULL DEFAULT 'asc';

UPDATE automatic_order_assignment_agent_preferences
SET assignment_order_direction = CASE
  WHEN LOWER(COALESCE(assignment_order_direction, 'asc')) = 'desc' THEN 'desc'
  ELSE 'asc'
END;
