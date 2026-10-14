-- ============================================================
-- Move shipping_cents from product_variants to products table
-- Shipping is fixed per product, not per variant
-- ============================================================

-- 1. Add shipping_cents to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shipping_cents INTEGER NOT NULL DEFAULT 0
  CHECK (shipping_cents >= 0);

-- 2. Migrate existing data: take MAX shipping from variants
UPDATE products p
SET shipping_cents = COALESCE(
  (SELECT MAX(pv.shipping_cents) FROM product_variants pv WHERE pv.product_id = p.id),
  0
);

-- 3. Zero out shipping_cents on variants (keep column for backwards compat)
UPDATE product_variants SET shipping_cents = 0;
