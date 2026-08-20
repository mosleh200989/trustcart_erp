-- Admin Sidebar Menu (Manage Modules)
-- Run in pgAdmin Query Tool

BEGIN;

CREATE TABLE IF NOT EXISTS admin_menu_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  icon VARCHAR(80) NULL,
  path VARCHAR(255) NULL,
  parent_id INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  required_permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_menu_items_parent_fk FOREIGN KEY (parent_id)
    REFERENCES admin_menu_items(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_menu_items_parent_sort
  ON admin_menu_items(parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_admin_menu_items_active
  ON admin_menu_items(is_active);

COMMIT;
