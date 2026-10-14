-- 016: Product promotions, featured ordering, and variant-level discounts

-- 1. Product-level promotion & featured columns
ALTER TABLE products
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN featured_order INTEGER DEFAULT 0,
  ADD COLUMN on_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN sale_ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN variant_discounts_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Variant-level discount columns
ALTER TABLE product_variants
  ADD COLUMN on_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN sale_ends_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Partial indexes for fast queries
CREATE INDEX idx_products_featured ON products(featured_order) WHERE is_featured = true;
CREATE INDEX idx_products_on_sale ON products(id) WHERE on_sale = true;
