-- ============================================================
-- Migration 012: Hero Banners
-- Admin-managed rotating hero banners for the storefront
-- ============================================================

-- 1. Hero banners table
CREATE TABLE hero_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  link TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hero_banners_active_sort ON hero_banners(active, sort_order);

-- 2. Hero banner translations
CREATE TABLE hero_banner_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banner_id UUID NOT NULL REFERENCES hero_banners(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('pt', 'en', 'es')),
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  UNIQUE (banner_id, locale)
);

CREATE INDEX idx_hero_banner_translations_banner_locale ON hero_banner_translations(banner_id, locale);

-- 3. RLS policies
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_banner_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hero_banners" ON hero_banners
  FOR SELECT USING (true);

CREATE POLICY "Public read hero_banner_translations" ON hero_banner_translations
  FOR SELECT USING (true);

CREATE POLICY "Admin manage hero_banners" ON hero_banners
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage hero_banner_translations" ON hero_banner_translations
  FOR ALL USING (true) WITH CHECK (true);
