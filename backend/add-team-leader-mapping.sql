-- Add team_leader_id mapping for Sales Executives (telesales agents)
-- This column will reference another user (usually with role 'Sales Team Leader')

ALTER TABLE users
ADD COLUMN IF NOT EXISTS team_leader_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_team_leader ON users(team_leader_id);

-- Create sales_teams table for grouping telesales agents under a team leader

CREATE TABLE IF NOT EXISTS sales_teams (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	code VARCHAR(50),
	team_leader_id INTEGER REFERENCES users(id),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_teams_leader ON sales_teams(team_leader_id);

-- Link users (telesales agents) to a specific sales team

ALTER TABLE users
ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES sales_teams(id);

CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
