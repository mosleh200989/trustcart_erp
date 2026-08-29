-- 2026-08-30-01-issues-module.sql
--
-- Internal "Issues" module: staff report software problems to the development
-- team, with a reporter-verification workflow and an append-only event history.
--
-- Scope boundary (also in docs/modules/issues.md): staff -> development team,
-- about the software itself. Customer problems belong in Support; HR matters
-- in HRM Complaints.
--
-- Idempotent throughout; safe to re-run.

-- ============================================================ issues

CREATE TABLE IF NOT EXISTS issues (
  id           SERIAL PRIMARY KEY,
  title        varchar(300) NOT NULL,
  description  text NOT NULL DEFAULT '',
  category     varchar(30) NOT NULL DEFAULT 'bug',       -- bug | feature | data-issue | other
  priority     varchar(20) NOT NULL DEFAULT 'normal',    -- low | normal | high | urgent
  status       varchar(20) NOT NULL DEFAULT 'open',      -- open | in_progress | resolved | in_review | closed
  reporter_id  integer NOT NULL REFERENCES users(id),
  assignee_id  integer REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_status   ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues (reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_assignee ON issues (assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_updated  ON issues (updated_at DESC);

-- ============================================================ comments
--
-- Comments are never destroyed. An edit inserts a new row pointing at the one
-- it supersedes; a delete only stamps deleted_at/deleted_by. The timeline can
-- always show what was said, by whom, and what it was changed to.

CREATE TABLE IF NOT EXISTS issue_comments (
  id            SERIAL PRIMARY KEY,
  issue_id      integer NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
  author_id     integer NOT NULL REFERENCES users(id),
  body          text NOT NULL,
  supersedes_id integer REFERENCES issue_comments(id),
  deleted_at    timestamptz,
  deleted_by    integer REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments (issue_id);

-- ============================================================ attachments

CREATE TABLE IF NOT EXISTS issue_attachments (
  id            SERIAL PRIMARY KEY,
  issue_id      integer NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
  comment_id    integer REFERENCES issue_comments(id),
  kind          varchar(10) NOT NULL,                    -- image | voice
  url           text NOT NULL,
  original_name varchar(255),
  mime          varchar(100) NOT NULL,
  size_bytes    integer NOT NULL,
  duration_secs integer,
  uploaded_by   integer NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue ON issue_attachments (issue_id);

-- ============================================================ events
--
-- One row per mutation: status changes, edits, soft-deletes, assignment.
-- This table is the accountability record the module exists for, so it is
-- append-only at the database level — even a buggy service call cannot
-- rewrite history.

CREATE TABLE IF NOT EXISTS issue_events (
  id          SERIAL PRIMARY KEY,
  issue_id    integer NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
  actor_id    integer NOT NULL REFERENCES users(id),
  action      varchar(40) NOT NULL,
  from_status varchar(20),
  to_status   varchar(20),
  payload     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_events_issue ON issue_events (issue_id);

CREATE OR REPLACE FUNCTION issue_events_block_mutation() RETURNS trigger AS $fn$
BEGIN
  RAISE EXCEPTION 'issue_events is append-only; % is not permitted', TG_OP;
END
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_events_append_only ON issue_events;
CREATE TRIGGER trg_issue_events_append_only
  BEFORE UPDATE OR DELETE ON issue_events
  FOR EACH ROW EXECUTE FUNCTION issue_events_block_mutation();

-- ============================================================ RBAC

INSERT INTO permissions (name, slug, module, action, description) VALUES
  ('View Issues',   'view-issues',   'issues', 'read',   'See reported issues, their timelines and history'),
  ('Create Issues', 'create-issues', 'issues', 'create', 'Report issues, comment, attach screenshots and voice notes'),
  ('Manage Issues', 'manage-issues', 'issues', 'update', 'Development team: take, resolve and manage reported issues')
ON CONFLICT (slug) DO NOTHING;

-- The development team role. Assign members via the existing Roles UI.
INSERT INTO roles (name, slug, description, is_active)
VALUES ('Developer', 'developer', 'Development team — works issues reported by staff', true)
ON CONFLICT (slug) DO NOTHING;

-- Everyone on staff can see and report; customer accounts cannot.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug <> 'customer-account'
  AND p.slug IN ('view-issues', 'create-issues')
ON CONFLICT DO NOTHING;

-- Only the development team (and admins) work the issues.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('developer', 'admin', 'super-admin')
  AND p.slug = 'manage-issues'
ON CONFLICT DO NOTHING;
