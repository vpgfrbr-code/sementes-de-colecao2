-- ============================================================
-- Seed Data: Thailand Expedition category + Maracurujá product
-- ============================================================

-- 1. Category
INSERT INTO categories (id, slug) VALUES
  ('a1b2c3d4-1111-4000-a000-000000000001', 'thailand-expedition');

INSERT INTO category_translations (category_id, locale, name, description) VALUES
  ('a1b2c3d4-1111-4000-a000-000000000001', 'pt', 'Expedição Tailândia', 'Sementes coletadas em expedição na Tailândia'),
  ('a1b2c3d4-1111-4000-a000-000000000001', 'en', 'Thailand Expedition', 'Seeds collected during Thailand expedition'),
  ('a1b2c3d4-1111-4000-a000-000000000001', 'es', 'Expedición Tailandia', 'Semillas recolectadas en expedición en Tailandia');

-- 2. Product
INSERT INTO products (id, slug, price_cents, stock, images, active, category_id) VALUES
  (
    'b2c3d4e5-2222-4000-a000-000000000001',
    'maracuruja-coruja-seeds-fotoperiodica',
    4000, -- display price = min variant (USD cents = $40)
    100,  -- total stock across variants
    ARRAY['/images/maracuruja/maracurujav3.png', '/images/maracuruja/thailand expedition.png'],
    true,
    'a1b2c3d4-1111-4000-a000-000000000001'
  );

INSERT INTO product_translations (product_id, locale, name, description) VALUES
  ('b2c3d4e5-2222-4000-a000-000000000001', 'pt', 'Maracurujá - Coruja Seeds (Fotoperiódica)', 'Sementes fotoperiódicas raras de Maracurujá, coletadas em expedição na Tailândia. Coruja Seeds.'),
  ('b2c3d4e5-2222-4000-a000-000000000001', 'en', 'Maracurujá - Coruja Seeds (Photoperiodic)', 'Rare photoperiodic Maracurujá seeds, collected during Thailand expedition. Coruja Seeds.'),
  ('b2c3d4e5-2222-4000-a000-000000000001', 'es', 'Maracurujá - Coruja Seeds (Fotoperiódica)', 'Semillas fotoperiódicas raras de Maracurujá, recolectadas en expedición en Tailandia. Coruja Seeds.');

-- 3. Variants
INSERT INTO product_variants (id, product_id, slug, seed_count, price_cents, shipping_cents, stock) VALUES
  (
    'c3d4e5f6-3333-4000-a000-000000000001',
    'b2c3d4e5-2222-4000-a000-000000000001',
    '3-seeds',
    3,
    4000,  -- $40.00 USD
    2000,  -- $20.00 USD shipping
    50
  ),
  (
    'c3d4e5f6-3333-4000-a000-000000000002',
    'b2c3d4e5-2222-4000-a000-000000000001',
    '10-seeds',
    10,
    10000, -- $100.00 USD
    2000,  -- $20.00 USD shipping
    50
  );
