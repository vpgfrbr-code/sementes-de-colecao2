-- Migration 041: Allow zero-discount coupons
--
-- Use case: "paid traffic" coupons that give 0% discount to the customer
-- but carry a commission % for attribution (e.g. Meta Ads / Google Ads).
-- Relaxes the original "value > 0" CHECK to "value >= 0".

ALTER TABLE coupons
  DROP CONSTRAINT IF EXISTS coupons_value_check;

ALTER TABLE coupons
  ADD CONSTRAINT coupons_value_check CHECK (value >= 0);
