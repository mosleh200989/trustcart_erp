-- Courier Configuration table
-- Stores API credentials/config per courier company (nullable fields)

CREATE TABLE IF NOT EXISTS courier_configurations (
  id SERIAL PRIMARY KEY,
  companyname VARCHAR(255) NULL,
  username VARCHAR(255) NULL,
  password VARCHAR(255) NULL,
  api_key VARCHAR(255) NULL,
  token TEXT NULL,
  refresh_token TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_courier_configurations_companyname ON courier_configurations (companyname);

-- Keep updated_at in sync (Postgres)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_courier_configurations_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at_courier_configurations()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_courier_configurations_updated_at
    BEFORE UPDATE ON courier_configurations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_courier_configurations();
  END IF;
END $do$;
