-- Migration 026: Flash Sale system
-- Admin-managed promotional flash sales displayed on the homepage.
-- Each flash sale can link to a coupon and target specific products or categories.
-- Only one flash sale should be active at a time.

-- 1. Main flash_sales table
CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active BOOLEAN NOT NULL DEFAULT false,
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON flash_sales
  FOR ALL USING (auth.role() = 'service_role');

-- 2. Translations (title, subtitle, button text per locale)
CREATE TABLE IF NOT EXISTS flash_sale_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en', 'es')),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT '',
  UNIQUE (flash_sale_id, locale)
);

ALTER TABLE flash_sale_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON flash_sale_translations
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Participating items (products or categories)
CREATE TABLE IF NOT EXISTS flash_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL)
  )
);

-- Prevent duplicate items
CREATE UNIQUE INDEX idx_flash_sale_product ON flash_sale_items(flash_sale_id, product_id)
  WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX idx_flash_sale_category ON flash_sale_items(flash_sale_id, category_id)
  WHERE category_id IS NOT NULL;

ALTER TABLE flash_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON flash_sale_items
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Indexes
CREATE INDEX idx_flash_sales_active ON flash_sales(active) WHERE active = true;

-- 5. Seed: 420 Day Flash Sale
-- Insert coupon first
INSERT INTO coupons (code, type, value, min_order_cents, max_uses, max_uses_per_user, active, expires_at)
VALUES ('420DAY', 'percentage', 20, 0, NULL, 1, true, '2026-04-21T03:01:00Z')
ON CONFLICT (code) DO NOTHING;

-- Insert the flash sale
DO $$
DECLARE
  v_flash_sale_id UUID;
  v_coupon_id UUID;
  v_category_id UUID;
BEGIN
  SELECT id INTO v_coupon_id FROM coupons WHERE code = '420DAY';
  SELECT id INTO v_category_id FROM categories WHERE slug = 'edicao-especial';

  INSERT INTO flash_sales (active, coupon_id, discount_type, discount_value, ends_at)
  VALUES (true, v_coupon_id, 'percentage', 20, '2026-04-21T03:01:00Z')
  RETURNING id INTO v_flash_sale_id;

  -- Translations
  INSERT INTO flash_sale_translations (flash_sale_id, locale, title, subtitle, button_text) VALUES
    (v_flash_sale_id, 'pt', 'Flash Sale 420! 20% OFF!', 'Celebre o 420 com desconto exclusivo em sementes Edição Especial', 'Ver sementes em promoção'),
    (v_flash_sale_id, 'en', 'Flash Sale 420! 20% OFF!', 'Celebrate 420 with an exclusive discount on Special Edition seeds', 'Shop sale seeds'),
    (v_flash_sale_id, 'es', '¡Flash Sale 420! 20% OFF!', 'Celebra el 420 con descuento exclusivo en semillas Edición Especial', 'Ver semillas en oferta');

  -- Add the edicao-especial category as participating item
  IF v_category_id IS NOT NULL THEN
    INSERT INTO flash_sale_items (flash_sale_id, category_id)
    VALUES (v_flash_sale_id, v_category_id);
  END IF;

  -- Set on_sale on all products in the category
  UPDATE products
  SET on_sale = true,
      discount_type = 'percentage',
      discount_value = 20,
      sale_ends_at = '2026-04-21T03:01:00Z'
  WHERE category_id = v_category_id AND active = true;
END $$;
