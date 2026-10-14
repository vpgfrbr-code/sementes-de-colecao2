-- Add tracking code and shipping carrier to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;
