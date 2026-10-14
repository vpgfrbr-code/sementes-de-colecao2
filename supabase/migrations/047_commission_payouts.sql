-- Migration 047: Commission payouts
--
-- Tracks payments of reseller commissions. Each payout aggregates one or
-- more orders that had their commission paid in a single transaction (PIX,
-- transfer, etc.). Order-level fields snapshot the commission value at the
-- moment of payout so future changes to coupon.commission_percent or
-- orders.manual_commission_percent never rewrite history.
--
-- A payout is keyed by EITHER reseller_user_id (Clerk) when available OR
-- coupon_id (legacy coupons that only have reseller_name/email). Reversal
-- is supported by deleting the payout — orders fall back to "pending".

CREATE TABLE IF NOT EXISTS commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_user_id TEXT,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  reseller_name TEXT NOT NULL DEFAULT '',
  reseller_email TEXT NOT NULL DEFAULT '',
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  method TEXT NOT NULL CHECK (method IN ('pix', 'transferencia', 'dinheiro', 'outro')),
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  paid_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commission_payouts_target_chk CHECK (
    reseller_user_id IS NOT NULL OR coupon_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS commission_payouts_reseller_idx
  ON commission_payouts (reseller_user_id)
  WHERE reseller_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS commission_payouts_coupon_idx
  ON commission_payouts (coupon_id)
  WHERE coupon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS commission_payouts_paid_at_idx
  ON commission_payouts (paid_at DESC);

ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON commission_payouts;
CREATE POLICY "service_role_all" ON commission_payouts
  FOR ALL
  USING (auth.role() = 'service_role');

-- Per-order snapshot of commission paid + link to payout header.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS commission_payout_id UUID
    REFERENCES commission_payouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_paid_cents INTEGER;

CREATE INDEX IF NOT EXISTS orders_commission_payout_id_idx
  ON orders (commission_payout_id)
  WHERE commission_payout_id IS NOT NULL;
