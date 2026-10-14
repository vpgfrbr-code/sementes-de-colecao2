-- Migration 049: Strain Science card display toggle
--
-- When enabled (default), the product detail page renders the rich
-- "Ciência do Fenótipo" card with monogram, genetics tree and animated
-- terpene bars. When disabled, the same data is rendered as a plain
-- 2-column label/value table.
--
-- Stored in the generic app_settings table (migration 040).

INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'strain_science_card_enabled',
  jsonb_build_object('enabled', true),
  NOW()
)
ON CONFLICT (key) DO NOTHING;
