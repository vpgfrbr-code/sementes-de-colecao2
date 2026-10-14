-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: public read for active products
CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  USING (active = true);

-- Product translations: public read for active products
CREATE POLICY "Public can read product translations"
  ON product_translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_translations.product_id
    AND products.active = true
  ));

-- Orders: logged-in users can read their own orders
CREATE POLICY "Users can read own orders by clerk_id"
  ON orders FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Orders: guests can read their own orders by email
CREATE POLICY "Guests can read own orders by email"
  ON orders FOR SELECT
  USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Order items: users can read items from their own orders
CREATE POLICY "Users can read own order items"
  ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      OR orders.guest_email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  ));

-- Note: INSERT/UPDATE operations use the service_role key (server-side only),
-- which bypasses RLS entirely. No INSERT/UPDATE policies needed.
