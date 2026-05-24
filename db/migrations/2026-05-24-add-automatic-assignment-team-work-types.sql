CREATE TABLE IF NOT EXISTS automatic_order_assignment_team_work_types (
  id serial PRIMARY KEY,
  team_leader_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id integer NOT NULL REFERENCES sales_teams(id) ON DELETE CASCADE,
  work_type varchar(50) NOT NULL,
  updated_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_auto_assignment_team_work_type UNIQUE (team_leader_id, team_id, work_type)
);

CREATE INDEX IF NOT EXISTS idx_auto_assignment_team_work_types_tl
  ON automatic_order_assignment_team_work_types(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_team_work_types_team
  ON automatic_order_assignment_team_work_types(team_id);

ALTER TABLE automatic_order_assignment_logs
  ALTER COLUMN order_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS record_type varchar(30) NOT NULL DEFAULT 'sales_order',
  ADD COLUMN IF NOT EXISTS incomplete_order_id integer NULL;

CREATE INDEX IF NOT EXISTS idx_auto_assignment_logs_record_type_created
  ON automatic_order_assignment_logs(record_type, created_at DESC);
