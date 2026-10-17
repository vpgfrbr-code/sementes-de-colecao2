const { createClient } = require("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(url, key);

const statements = [
  "ALTER TABLE products ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE products ADD COLUMN featured_order INTEGER DEFAULT 0",
  "ALTER TABLE products ADD COLUMN on_sale BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE products ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed'))",
  "ALTER TABLE products ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0",
  "ALTER TABLE products ADD COLUMN sale_ends_at TIMESTAMPTZ DEFAULT NULL",
  "ALTER TABLE products ADD COLUMN variant_discounts_enabled BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE product_variants ADD COLUMN on_sale BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE product_variants ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed'))",
  "ALTER TABLE product_variants ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0",
  "ALTER TABLE product_variants ADD COLUMN sale_ends_at TIMESTAMPTZ DEFAULT NULL",
  "CREATE INDEX idx_products_featured ON products(featured_order) WHERE is_featured = true",
  "CREATE INDEX idx_products_on_sale ON products(id) WHERE on_sale = true",
];

(async () => {
  // Try the /pg endpoint first
  const fullSql = statements.join(";\n");
  const res = await fetch(url + "/pg", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({ query: fullSql }),
  });

  if (res.ok) {
    console.log("Migration executed via /pg endpoint!");
    return;
  }

  console.log("/pg not available, status:", res.status);
  console.log("Trying individual statements via temporary RPC...");

  // Create a temp function to run arbitrary SQL
  const createFn = `
    CREATE OR REPLACE FUNCTION _tmp_run_migration(sql_text TEXT)
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN EXECUTE sql_text; END; $$;
  `;

  // Try creating the function via RPC... this won't work without SQL access
  // Let's try the REST /sql endpoint
  for (const stmt of statements) {
    try {
      const { error } = await s.rpc("_tmp_run_migration", { sql_text: stmt });
      if (error) {
        if (error.message.includes("already exists")) {
          console.log("SKIP (exists):", stmt.slice(0, 60));
        } else if (error.message.includes("Could not find the function")) {
          console.log("RPC not available. You need to run this SQL in the Supabase Dashboard SQL Editor:");
          console.log("---");
          console.log(fullSql);
          console.log("---");
          return;
        } else {
          console.log("ERROR:", error.message, "|", stmt.slice(0, 60));
        }
      } else {
        console.log("OK:", stmt.slice(0, 60));
      }
    } catch (e) {
      console.log("CATCH:", e.message);
    }
  }

  // Verify
  const { data, error } = await s.from("products").select("is_featured").limit(1);
  if (!error) console.log("\nVerified: is_featured column exists!");
  else console.log("\nVerification failed:", error.message);
})();
