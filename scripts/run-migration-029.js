const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env manually
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

const statements = [
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_path TEXT",
  "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ",
  "INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false) ON CONFLICT (id) DO NOTHING",
];

(async () => {
  const fullSql = statements.join(";\n");

  // Method 1: Try Supabase SQL endpoints
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
        console.log(`Migration 029 executed via ${endpoint}!`);
        return;
      }
    } catch {}
  }

  // Method 2: Try _tmp_run_migration RPC
  console.log("SQL endpoints not available. Trying via RPC...");

  for (const stmt of statements) {
    try {
      const { error } = await s.rpc("_tmp_run_migration", { sql_text: stmt });
      if (error) {
        if (error.message.includes("already exists")) {
          console.log("SKIP (exists):", stmt.slice(0, 60));
        } else if (error.message.includes("Could not find the function")) {
          console.log("\nRPC not available. Run this SQL in the Supabase Dashboard SQL Editor:\n");
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
      console.log("EXCEPTION:", e.message, "|", stmt.slice(0, 60));
    }
  }
})();
