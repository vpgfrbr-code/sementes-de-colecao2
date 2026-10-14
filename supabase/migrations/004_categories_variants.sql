-- ============================================================
-- Migration 004: Categories, Product Variants, USD Pricing
-- ============================================================

-- 1. Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE category_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en', 'es')),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  UNIQUE (category_id, locale)
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_category_translations_cat_locale ON category_translations(category_id, locale);

-- 2. Add category FK to products
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
CREATE INDEX idx_products_category ON products(category_id);

-- 3. Product Variants (purchasable units with USD pricing)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  seed_count INTEGER NOT NULL CHECK (seed_count > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),       -- USD cents
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0), -- USD cents
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, slug)
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_active ON product_variants(active) WHERE active = true;

-- 4. Add variant_id to order_items
ALTER TABLE order_items ADD COLUMN variant_id UUID REFERENCES product_variants(id);

-- 5. Atomic stock decrement for variants
CREATE OR REPLACE FUNCTION decrement_variant_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock = stock - p_quantity
  WHERE id = p_variant_id AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. RLS for new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Category translations are publicly readable"
  ON category_translations FOR SELECT USING (true);

CREATE POLICY "Active variants are publicly readable"
  ON product_variants FOR SELECT USING (active = true);
