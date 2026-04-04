-- ============================================================
-- ROLLBACK: Remove all Vercel-related tables from production
-- Safe to run: uses IF EXISTS everywhere
-- Neon tables (neon_projects, usage_snapshots, sync_runs) are NOT touched
-- ============================================================

BEGIN;

-- 1. Drop Vercel tables (order matters: dependents first)
DROP TABLE IF EXISTS "vercel_daily_charges";
DROP TABLE IF EXISTS "vercel_invoices";
DROP TABLE IF EXISTS "vercel_usage_snapshots";
DROP TABLE IF EXISTS "vercel_sync_runs";
DROP TABLE IF EXISTS "vercel_projects";

-- 2. Remove Prisma migration record so it won't conflict on dev
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260404174207_add_vercel_tracking';

-- 3. Verify Neon tables are intact
DO $$
DECLARE
  missing TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'neon_projects')   THEN missing := missing || ' neon_projects'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_snapshots') THEN missing := missing || ' usage_snapshots'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_runs')       THEN missing := missing || ' sync_runs'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'ROLLBACK — missing Neon tables:%', missing;
  END IF;

  RAISE NOTICE 'OK: neon_projects, usage_snapshots, sync_runs — all intact';
END $$;

-- 4. Verify Vercel tables are gone
DO $$
DECLARE
  still_exists TEXT := '';
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vercel_projects')       THEN still_exists := still_exists || ' vercel_projects'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vercel_usage_snapshots') THEN still_exists := still_exists || ' vercel_usage_snapshots'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vercel_daily_charges')   THEN still_exists := still_exists || ' vercel_daily_charges'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vercel_invoices')        THEN still_exists := still_exists || ' vercel_invoices'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vercel_sync_runs')       THEN still_exists := still_exists || ' vercel_sync_runs'; END IF;

  IF still_exists <> '' THEN
    RAISE EXCEPTION 'ROLLBACK — these Vercel tables still exist:%', still_exists;
  END IF;

  RAISE NOTICE 'OK: all Vercel tables removed';
END $$;

COMMIT;

-- ============================================================
-- After running this script:
-- 1. Confirm you see "OK: neon_projects..." and "OK: all Vercel tables removed"
-- 2. Update DATABASE_URL in .env to point to your dev DB
-- ============================================================
