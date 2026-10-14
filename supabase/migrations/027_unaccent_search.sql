-- Migration 027: Accent-insensitive product search
-- Enables the unaccent extension and adds a generated column to product_translations
-- so that searching "maracuruja" finds "Maracurujá" (and vice-versa).

-- 1. Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Immutable wrapper around unaccent() so it can be used in a generated column
--    (unaccent is STABLE by default; generated columns require IMMUTABLE expressions)
CREATE OR REPLACE FUNCTION unaccent_immutable(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT unaccent($1); $$;

-- 3. Add generated column: lower-cased, accent-stripped version of name
ALTER TABLE product_translations
  ADD COLUMN IF NOT EXISTS name_unaccented TEXT
    GENERATED ALWAYS AS (unaccent_immutable(lower(name))) STORED;

-- 3. B-tree index for fast LIKE '%query%' scans on the normalised column
CREATE INDEX IF NOT EXISTS idx_product_translations_name_unaccented
  ON product_translations (name_unaccented);
