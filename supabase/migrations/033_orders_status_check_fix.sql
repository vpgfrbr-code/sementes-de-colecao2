-- Fix orders_status_check to include 'payment_reported' and 'confirmed'
-- The original constraint in 001_initial_schema.sql only allowed:
--   'waiting_payment', 'approved', 'shipped', 'delivered', 'cancelled'
-- But the app code uses 'payment_reported' (set when user uploads proof /
-- confirms payment manually) and 'confirmed' (handled as synonym of 'approved'
-- in several UI branches).

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'waiting_payment',
    'payment_reported',
    'approved',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled'
  ));
