-- Migration 048: Branding settings
--
-- Stores the superadmin-configurable brand identity (logo / inverse logo /
-- favicon / OG image / brand name / image-vs-text mode). Reads happen on
-- every SSR (no cache cross-request) so the superadmin sees changes
-- immediately. Uses the generic app_settings table from migration 040.
--
-- `null` URLs mean "use the code-level fallback" (/logo.svg, etc.) so
-- we can swap the fallback in code without migrating data.

INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'branding',
  jsonb_build_object(
    'mode', 'image',
    'brandName', 'Sementes de Coleção',
    'logoUrl', NULL,
    'logoInverseUrl', NULL,
    'faviconUrl', NULL,
    'ogImageUrl', NULL
  ),
  NOW()
)
ON CONFLICT (key) DO NOTHING;
