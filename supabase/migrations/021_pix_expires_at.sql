-- Migration 021: Add PIX expiry timestamp and payment_reported status
-- Orders now have a 1-hour payment window. After expiry without confirmation,
-- they are auto-cancelled by a cron job.

-- 1. Add pix_expires_at column
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ;

-- 2. Backfill existing waiting_payment orders (1hr from created_at)
UPDATE orders
  SET pix_expires_at = created_at + INTERVAL '1 hour'
  WHERE status = 'waiting_payment'
    AND pix_expires_at IS NULL;

-- 3. Index for efficient cron query
CREATE INDEX IF NOT EXISTS orders_status_pix_expires_at_idx
  ON orders (status, pix_expires_at)
  WHERE status = 'waiting_payment';
