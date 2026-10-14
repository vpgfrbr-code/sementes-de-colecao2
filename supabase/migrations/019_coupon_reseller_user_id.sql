-- ============================================================
-- Migration 019: Link coupons to Clerk reseller account
-- ============================================================

ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS reseller_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_coupons_reseller_user_id
ON coupons(reseller_user_id)
WHERE reseller_user_id IS NOT NULL;
