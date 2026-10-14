# Phase 3.1: Database Schema

## Steps

### 1. SQL Migrations

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product translations
CREATE TABLE product_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en', 'es')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  UNIQUE (product_id, locale)
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT,
  guest_email TEXT,
  address JSONB NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_payment'
    CHECK (status IN ('waiting_payment', 'approved', 'shipped', 'delivered', 'cancelled')),
  woovi_charge_id TEXT,
  woovi_correlation_id TEXT UNIQUE,
  pix_qr_code TEXT,
  pix_br_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (clerk_user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0)
);

-- Indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(active) WHERE active = true;
CREATE INDEX idx_product_translations_product_locale ON product_translations(product_id, locale);
CREATE INDEX idx_orders_clerk_user_id ON orders(clerk_user_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
CREATE INDEX idx_orders_woovi_correlation_id ON orders(woovi_correlation_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. RLS Policies

Create `supabase/migrations/002_rls_policies.sql`:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active products"
  ON products FOR SELECT USING (active = true);

CREATE POLICY "Public can read product translations"
  ON product_translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products WHERE products.id = product_translations.product_id AND products.active = true
  ));

CREATE POLICY "Users can read own orders by clerk_id"
  ON orders FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Guests can read own orders by email"
  ON orders FOR SELECT
  USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email');

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
```

### 3. Stock Decrement Function

Create `supabase/migrations/003_decrement_stock.sql`:

```sql
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
```

## Completion Criteria

- [ ] All 4 tables created in Supabase
- [ ] RLS policies active
- [ ] `decrement_stock` function deployed
- [ ] Indexes created for performance
