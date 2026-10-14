-- Migration 050: per-coupon cookie persistence window
--
-- Each coupon now carries its own cookie persistence window, in days. When a
-- coupon is written to the `affiliate_coupon` cookie (via ?ref= link, welcome
-- strip, exit-intent modal, affiliate capture or flash sale), the cookie's
-- max-age reflects this value. Previously the duration was hardcoded to
-- 30 days everywhere; 30 is now the default, preserving existing behavior.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS persistence_days INTEGER NOT NULL DEFAULT 30
    CHECK (persistence_days >= 1 AND persistence_days <= 365);
