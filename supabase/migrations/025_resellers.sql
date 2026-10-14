-- Migration 025: Reseller management table
-- Tracks qualified resellers independently of coupons.
-- Only resellers with status = 'active' can be assigned to coupons.

CREATE TABLE IF NOT EXISTS resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON resellers
  FOR ALL
  USING (auth.role() = 'service_role');
