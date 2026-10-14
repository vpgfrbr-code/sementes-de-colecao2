-- Migration 040: Generic key/value settings table
--
-- Stores superadmin-configurable settings. Currently used for the
-- "default reseller attribution" feature (no-coupon orders → reseller).

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON app_settings;
CREATE POLICY "service_role_all" ON app_settings
  FOR ALL
  USING (auth.role() = 'service_role');
