-- Atomic stock decrement function
-- Uses SECURITY DEFINER to bypass RLS (called from server-side only)
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
