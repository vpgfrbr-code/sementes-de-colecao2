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
