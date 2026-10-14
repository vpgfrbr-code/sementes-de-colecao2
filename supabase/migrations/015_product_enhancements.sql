-- ============================================================
-- Migration 015: Product enhancements
-- Genetics parents, real photos, terpene dominant, simplify THC/CBD
-- ============================================================

-- 1. Add parent strain fields + real photos to products
ALTER TABLE products
  ADD COLUMN parent_mother TEXT,
  ADD COLUMN parent_father TEXT,
  ADD COLUMN real_photos TEXT[] DEFAULT '{}',
  ADD COLUMN show_real_photos BOOLEAN DEFAULT false;

-- 2. Evolve product_terpenes: add dominant flag, drop percentage
ALTER TABLE product_terpenes
  ADD COLUMN is_dominant BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE product_terpenes
  DROP COLUMN percentage;
