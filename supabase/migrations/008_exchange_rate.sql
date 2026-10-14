-- ============================================================
-- Add exchange rate tracking columns to orders
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS exchange_rate_used numeric(10,4),
  ADD COLUMN IF NOT EXISTS total_brl_cents integer;
