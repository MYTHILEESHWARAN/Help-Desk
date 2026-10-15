-- Run once when the Postgres container first starts.
-- Creates the read-only role used for natural-language AI queries.
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'helpdesk_readonly') THEN
    CREATE ROLE helpdesk_readonly LOGIN PASSWORD 'readonly_password';
  END IF;
END
$$;

-- Grant read access to existing and future tables
GRANT CONNECT ON DATABASE helpdesk TO helpdesk_readonly;
GRANT USAGE ON SCHEMA public TO helpdesk_readonly;

-- Grant SELECT on all current tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO helpdesk_readonly;

-- Grant SELECT on all future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO helpdesk_readonly;
