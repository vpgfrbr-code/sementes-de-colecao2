-- Migration 045: Admin-managed USD→BRL exchange rate config
--
-- Stores how the storefront converts USD prices into BRL for both display
-- and checkout. A single row in app_settings keyed by 'exchange_rate_config'
-- holds:
--   * mode            'fixed' | 'dynamic'
--   * fixed_rate      number  (BRL per 1 USD; also used as fallback in dynamic mode)
--   * markup_percent  number  (added on top of the live rate when mode='dynamic')
--
-- Rationale: previously two separate code paths (PriceDisplay client API +
-- checkout server API) each fetched the live rate independently and fell
-- back to a hard-coded 5.5, allowing the displayed price to drift from the
-- amount actually charged. With a single source of truth (read by
-- getEffectiveBrlRate) display and checkout always agree.

INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'exchange_rate_config',
  jsonb_build_object(
    'mode', 'dynamic',
    'fixed_rate', 5.5,
    'markup_percent', 10
  ),
  NOW()
)
ON CONFLICT (key) DO NOTHING;
