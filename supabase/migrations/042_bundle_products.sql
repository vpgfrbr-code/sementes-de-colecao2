-- Migration 042: Bundle product support
--
-- Introduces a "bundle" product type that groups multiple products
-- (components) into a single purchasable unit. Bundle stock is
-- derived on-demand from the minimum component availability.
-- The existing reserve_product_stock / restore_product_stock
-- functions are reused unchanged — the checkout API expands
-- bundle demand into per-component seed quantities.

-- 1. Add product_type to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (product_type IN ('standard', 'bundle'));

-- 2. Bundle components table
CREATE TABLE IF NOT EXISTS bundle_components (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id UUID        NOT NULL REFERENCES products(id),
  seed_count           INTEGER     NOT NULL CHECK (seed_count > 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bundle_product_id, component_product_id)
);

-- 3. RLS for bundle_components
ALTER TABLE bundle_components ENABLE ROW LEVEL SECURITY;

-- Public can read bundle components (needed to display bundle contents)
DROP POLICY IF EXISTS "bundle_components_public_select" ON bundle_components;
CREATE POLICY "bundle_components_public_select"
  ON bundle_components FOR SELECT
  USING (true);

-- Only service role (admin / server) can mutate
DROP POLICY IF EXISTS "bundle_components_service_insert" ON bundle_components;
CREATE POLICY "bundle_components_service_insert"
  ON bundle_components FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "bundle_components_service_update" ON bundle_components;
CREATE POLICY "bundle_components_service_update"
  ON bundle_components FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "bundle_components_service_delete" ON bundle_components;
CREATE POLICY "bundle_components_service_delete"
  ON bundle_components FOR DELETE
  USING (auth.role() = 'service_role');

-- 4. Effective stock function for bundles
--    Returns how many bundle units can be assembled given current component stock.
--    Returns 0 when the bundle has no components.
CREATE OR REPLACE FUNCTION get_bundle_effective_stock(p_bundle_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_effective INTEGER;
BEGIN
  SELECT FLOOR(MIN(p.stock::float / bc.seed_count))::INTEGER
  INTO v_effective
  FROM bundle_components bc
  JOIN products p ON p.id = bc.component_product_id
  WHERE bc.bundle_product_id = p_bundle_id;

  RETURN COALESCE(v_effective, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
