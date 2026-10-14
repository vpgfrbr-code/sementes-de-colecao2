-- Migration 044: Capture customer timezone at order time
--
-- Stores the timezone offset reported by the customer's browser at checkout,
-- expressed in MINUTES east of UTC (i.e. -new Date().getTimezoneOffset()).
-- Examples:
--   * São Paulo (BRT): -180
--   * UTC:                0
--   * Tokyo (JST):     +540
--
-- The column is nullable so historical orders and any checkout where the
-- value is missing remain valid; display falls back to America/Sao_Paulo.
-- SMALLINT comfortably covers the valid range [-1440, 1440].

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_tz_offset SMALLINT;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_customer_tz_offset_range_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_customer_tz_offset_range_chk CHECK (
    customer_tz_offset IS NULL
    OR (customer_tz_offset >= -1440 AND customer_tz_offset <= 1440)
  );

COMMENT ON COLUMN orders.customer_tz_offset IS
  'Browser-reported timezone offset in minutes east of UTC at checkout time '
  '(i.e. -new Date().getTimezoneOffset()). NULL when not provided.';
