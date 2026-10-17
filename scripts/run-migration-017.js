const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hero_video_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_poster_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_frame_count INTEGER;

UPDATE products
SET hero_video_url   = '/images/maracuruja/frames/frame_',
    hero_poster_url  = '/images/maracuruja/maracurujav3.png',
    hero_frame_count = 97
WHERE slug = 'maracuruja-coruja-seeds';
`;

async function run() {
  // Try /pg endpoint (Supabase SQL over HTTP)
  const res = await fetch(url + "/pg", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log("Migration 017 applied successfully via /pg endpoint!");
    return;
  }

  console.log("/pg returned status:", res.status);

  // Try the SQL REST API endpoint
  const res2 = await fetch(url + "/rest/v1/rpc/exec_sql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({ sql_text: sql }),
  });

  if (res2.ok) {
    console.log("Migration 017 applied successfully via exec_sql RPC!");
    return;
  }

  console.log("Could not run migration automatically.");
  console.log("Please run this SQL in the Supabase Dashboard SQL Editor:");
  console.log("---");
  console.log(sql);
}

run();
