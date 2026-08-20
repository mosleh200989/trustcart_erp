-- Customer Tagging Tables
-- Adds:
--   - customer_tags
--   - customer_tag_assignments (many-to-many customers <-> tags)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text NULL,
  color varchar(32) NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_tags_name_unique'
  ) THEN
    ALTER TABLE customer_tags
      ADD CONSTRAINT customer_tags_name_unique UNIQUE (name);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  tag_id uuid NOT NULL,
  customer_id integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tag_id, customer_id),
  CONSTRAINT customer_tag_assignments_tag_fk
    FOREIGN KEY (tag_id) REFERENCES customer_tags(id)
    ON DELETE CASCADE,
  CONSTRAINT customer_tag_assignments_customer_fk
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_customer_id
  ON customer_tag_assignments(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag_id
  ON customer_tag_assignments(tag_id);
