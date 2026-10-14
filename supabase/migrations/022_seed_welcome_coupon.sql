-- Migration 022: Seed welcome coupon BEMVINDO10
-- 10% discount for first-time buyers, one use per user.

INSERT INTO coupons (code, type, value, min_order_cents, max_uses_per_user, active)
VALUES ('BEMVINDO10', 'percentage', 10, 0, 1, true)
ON CONFLICT (code) DO NOTHING;
