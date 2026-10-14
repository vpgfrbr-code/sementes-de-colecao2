-- ============================================================
-- Migration 011: Seed Banks
-- Phase 3 of product page overhaul
-- ============================================================

-- 1. Seed banks table
CREATE TABLE seed_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT DEFAULT '',
  website TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seed_banks_slug ON seed_banks(slug);

-- 2. Seed bank translations
CREATE TABLE seed_bank_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seed_bank_id UUID NOT NULL REFERENCES seed_banks(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en', 'es')),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  UNIQUE (seed_bank_id, locale)
);

CREATE INDEX idx_seed_bank_translations_bank_locale ON seed_bank_translations(seed_bank_id, locale);

-- 3. Add seed_bank_id FK to products
ALTER TABLE products
  ADD COLUMN seed_bank_id UUID REFERENCES seed_banks(id) DEFAULT NULL;

CREATE INDEX idx_products_seed_bank ON products(seed_bank_id);

-- 4. RLS policies
ALTER TABLE seed_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seed_bank_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read seed_banks" ON seed_banks
  FOR SELECT USING (true);

CREATE POLICY "Public read seed_bank_translations" ON seed_bank_translations
  FOR SELECT USING (true);

CREATE POLICY "Admin manage seed_banks" ON seed_banks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage seed_bank_translations" ON seed_bank_translations
  FOR ALL USING (true) WITH CHECK (true);
