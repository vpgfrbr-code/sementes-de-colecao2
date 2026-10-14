-- ============================================================
-- Migration 006: Coupons, Reseller Commissions, Guest Lookup, Admin Support
-- ============================================================

-- 1. Coupons table
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  min_order_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_order_cents >= 0),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  reseller_name TEXT,
  reseller_email TEXT,
  commission_percent NUMERIC(5,2) CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100)),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(active) WHERE active = true;
CREATE INDEX idx_coupons_reseller ON coupons(reseller_name) WHERE reseller_name IS NOT NULL;

-- 2. Order lookup tokens (for guest email verification)
CREATE TABLE order_lookup_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_lookup_tokens_email_token ON order_lookup_tokens(email, token);
CREATE INDEX idx_order_lookup_tokens_expires ON order_lookup_tokens(expires_at);

-- 3. Extend orders table
ALTER TABLE orders ADD COLUMN coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0);
ALTER TABLE orders ADD COLUMN customer_name TEXT;

CREATE INDEX idx_orders_coupon_id ON orders(coupon_id) WHERE coupon_id IS NOT NULL;

-- 4. RLS for new tables
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lookup_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read active, non-expired coupons (for validation)
CREATE POLICY "Active coupons are publicly readable"
  ON coupons FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Lookup tokens: no public access — server uses service role key
-- No policies needed (service role bypasses RLS)

-- 5. Atomically increment coupon used_count
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id
    AND active = true
    AND (max_uses IS NULL OR used_count < max_uses);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon % cannot be used', p_coupon_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Cleanup expired lookup tokens (call periodically or via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_lookup_tokens()
RETURNS VOID AS $$
BEGIN
  DELETE FROM order_lookup_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
