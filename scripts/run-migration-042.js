/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const s = createClient(url, key);

const fullSql = `
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

DROP POLICY IF EXISTS "bundle_components_public_select" ON bundle_components;
CREATE POLICY "bundle_components_public_select"
  ON bundle_components FOR SELECT
  USING (true);

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
`.trim();

(async () => {
  // Try REST SQL endpoint first
  for (const endpoint of ["/pg", "/sql"]) {
    try {
      const res = await fetch(url + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: "Bearer " + key,
        },
        body: JSON.stringify({ query: fullSql }),
      });
      if (res.ok) {
        console.log(`Migration 042 executed via ${endpoint}!`);
        return;
      }
    } catch {}
  }

  // Fallback: RPC
  try {
    const { error } = await s.rpc("_tmp_run_migration", { sql_text: fullSql });
    if (error) {
      if (error.message.includes("Could not find the function")) {
        console.log("\nRPC not available. Run this SQL manually in the Supabase SQL Editor:\n---");
        console.log(fullSql);
        console.log("---");
        return;
      }
      console.log("ERROR:", error.message);
    } else {
      console.log("Migration 042 executed via RPC!");
    }
  } catch (e) {
    console.log("EXCEPTION:", e.message);
    console.log("\nRun this SQL manually in the Supabase SQL Editor:\n---");
    console.log(fullSql);
    console.log("---");
  }
})();
