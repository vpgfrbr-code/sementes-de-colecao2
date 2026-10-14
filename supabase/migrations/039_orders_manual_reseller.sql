-- Migration 039: Manual reseller attribution on orders (superadmin only)
--
-- Allows a superadmin to attribute any order to a reseller for commission
-- reporting purposes — independently from the coupon applied at checkout.
-- Does NOT affect buyer totals; attribution is a commission-only tag.
--
-- Both manual_reseller_user_id and manual_commission_percent must be set
-- together (or both NULL). Percent is frozen per-order so future changes
-- to reseller configuration never rewrite history.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS manual_reseller_user_id TEXT,
  ADD COLUMN IF NOT EXISTS manual_commission_percent NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS manual_reseller_assigned_by TEXT,
  ADD COLUMN IF NOT EXISTS manual_reseller_assigned_at TIMESTAMPTZ;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_manual_reseller_pair_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_manual_reseller_pair_chk CHECK (
    (manual_reseller_user_id IS NULL AND manual_commission_percent IS NULL)
    OR (manual_reseller_user_id IS NOT NULL AND manual_commission_percent IS NOT NULL)
  );

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_manual_commission_range_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_manual_commission_range_chk CHECK (
    manual_commission_percent IS NULL
    OR (manual_commission_percent >= 0 AND manual_commission_percent <= 100)
  );

CREATE INDEX IF NOT EXISTS orders_manual_reseller_user_id_idx
  ON orders (manual_reseller_user_id)
  WHERE manual_reseller_user_id IS NOT NULL;
