-- Migration 046: Welcome coupon promo setting
--
-- Controls the welcome coupon UI surfaces (bottom strip + exit-intent modal).
-- When `enabled` is false, neither component renders. The coupon row in the
-- `coupons` table is unaffected — buyers can still type the code at checkout.

INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'welcome_coupon_promo',
  '{"enabled": false, "coupon_code": "BEMVINDO10", "discount_percent": 10}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;
