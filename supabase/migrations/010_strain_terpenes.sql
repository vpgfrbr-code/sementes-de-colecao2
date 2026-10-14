-- ============================================================
-- Migration 010: Strain info, terpenes, seed type, flowering
-- Phase 2 of product page overhaul
-- ============================================================

-- 1. Terpenes table (master list)
CREATE TABLE terpenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  aroma TEXT DEFAULT '',
  color TEXT DEFAULT '#22c55e',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_terpenes_slug ON terpenes(slug);

-- 2. Product ↔ Terpene many-to-many
CREATE TABLE product_terpenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  terpene_id UUID NOT NULL REFERENCES terpenes(id) ON DELETE CASCADE,
  percentage NUMERIC(4,1) DEFAULT NULL,
  UNIQUE (product_id, terpene_id)
);

CREATE INDEX idx_product_terpenes_product ON product_terpenes(product_id);
CREATE INDEX idx_product_terpenes_terpene ON product_terpenes(terpene_id);

-- 3. Add strain fields directly to products
ALTER TABLE products
  ADD COLUMN seed_type TEXT CHECK (seed_type IN ('feminized', 'regular', 'autoflower')) DEFAULT NULL,
  ADD COLUMN flowering_weeks_min INTEGER CHECK (flowering_weeks_min > 0) DEFAULT NULL,
  ADD COLUMN flowering_weeks_max INTEGER CHECK (flowering_weeks_max > 0) DEFAULT NULL,
  ADD COLUMN thc_min NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN thc_max NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN cbd_min NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN cbd_max NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN genetics TEXT DEFAULT NULL;

-- genetics stores lineage as text, e.g. "Purple Punch x Gelato"

-- 4. RLS policies for new tables
ALTER TABLE terpenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_terpenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read terpenes" ON terpenes
  FOR SELECT USING (true);

CREATE POLICY "Public read product_terpenes" ON product_terpenes
  FOR SELECT USING (true);

CREATE POLICY "Admin manage terpenes" ON terpenes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage product_terpenes" ON product_terpenes
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed some common terpenes
INSERT INTO terpenes (slug, name, aroma, color) VALUES
  ('myrcene', 'Myrcene', 'Earthy, musky, herbal', '#22c55e'),
  ('limonene', 'Limonene', 'Citrus, lemon, orange', '#eab308'),
  ('caryophyllene', 'Caryophyllene', 'Spicy, peppery, woody', '#f97316'),
  ('linalool', 'Linalool', 'Floral, lavender', '#a855f7'),
  ('pinene', 'Pinene', 'Pine, fresh, earthy', '#16a34a'),
  ('terpinolene', 'Terpinolene', 'Fruity, floral, piney', '#ec4899'),
  ('humulene', 'Humulene', 'Hoppy, earthy, woody', '#78716c'),
  ('ocimene', 'Ocimene', 'Sweet, herbal, woody', '#06b6d4'),
  ('bisabolol', 'Bisabolol', 'Floral, sweet, chamomile', '#f472b6'),
  ('valencene', 'Valencene', 'Citrus, sweet orange', '#fb923c')
ON CONFLICT (slug) DO NOTHING;
