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

const statements = [
  "ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_value_check",
  "ALTER TABLE coupons ADD CONSTRAINT coupons_value_check CHECK (value >= 0)",
];

(async () => {
  const fullSql = statements.join(";\n") + ";";

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
        console.log(`Migration 041 executed via ${endpoint}!`);
        return;
      }
    } catch {}
  }

  for (const stmt of statements) {
    try {
      const { error } = await s.rpc("_tmp_run_migration", { sql_text: stmt });
      if (error) {
        if (error.message.includes("Could not find the function")) {
          console.log("\nRPC not available. Run this SQL in Supabase SQL Editor:\n---");
          console.log(fullSql);
          console.log("---");
          return;
        }
        console.log("ERROR:", error.message, "|", stmt.slice(0, 60));
      } else {
        console.log("OK:", stmt.slice(0, 60));
      }
    } catch (e) {
      console.log("EXCEPTION:", e.message, "|", stmt.slice(0, 60));
    }
  }
})();
