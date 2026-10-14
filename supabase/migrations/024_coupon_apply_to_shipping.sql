-- Migration 024: Add apply_to_shipping flag to coupons
-- When false (default), coupon discount is applied to product subtotal only.
-- When true, discount is also applied to shipping cost.

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS apply_to_shipping BOOLEAN NOT NULL DEFAULT FALSE;
