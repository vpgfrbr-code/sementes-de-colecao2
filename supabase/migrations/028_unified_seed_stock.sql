-- Migration 028: Unified seed-level stock management
--
-- Changes from per-variant stock to a single product-level stock
-- representing total individual seeds. Stock is reserved at checkout
-- and restored on cancellation.

-- 1. Atomic reserve: deducts seed_quantity from products.stock
CREATE OR REPLACE FUNCTION reserve_product_stock(p_product_id UUID, p_seed_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_seed_quantity
  WHERE id = p_product_id AND stock >= p_seed_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomic restore: adds seed_quantity back to products.stock
CREATE OR REPLACE FUNCTION restore_product_stock(p_product_id UUID, p_seed_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock + p_seed_quantity
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Migrate existing variant stock into product total:
--    product.stock = SUM(variant.stock * variant.seed_count)
--    Only for products that have variants
UPDATE products p
SET stock = sub.total_seeds
FROM (
  SELECT product_id, COALESCE(SUM(stock * seed_count), 0)::integer AS total_seeds
  FROM product_variants
  WHERE active = true
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id
  AND sub.total_seeds > 0;
