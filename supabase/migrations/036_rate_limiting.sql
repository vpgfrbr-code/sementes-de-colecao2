-- ═══════════════════════════════════════════════════════════════════════
-- 036 — Rate limiting (fixed-window, Postgres-backed)
--
-- Simple, infra-free rate limiting: one row per (key, window_start),
-- atomic INSERT ON CONFLICT DO UPDATE RETURNING the new count. Callers
-- pass an opaque key (e.g. "checkout:203.0.113.5" or "coupon:203.0.113.5")
-- and the window size + max allowed. Function returns TRUE if the caller
-- is within the limit, FALSE if it must be rejected.
--
-- The table is intentionally not a high-throughput structure — we use it
-- for dozens/hundreds of req/min across the whole site. If traffic grows
-- enough to matter we swap to Vercel KV or Upstash without changing
-- callers.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key           TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Cleanup of old windows — called opportunistically from the function.
CREATE INDEX IF NOT EXISTS rate_limit_counters_window_idx
  ON rate_limit_counters (window_start);

-- Atomically increment and return whether the request is allowed.
-- p_window_seconds is the window size in seconds; p_max is the max count
-- allowed inside that window for the given key.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key            TEXT,
  p_max            INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_new_count    INTEGER;
BEGIN
  -- Truncate "now" to the start of the current window. Using date_bin
  -- (Postgres 14+) gives us aligned fixed windows.
  v_window_start := date_bin(
    make_interval(secs => p_window_seconds),
    now(),
    'epoch'::timestamptz
  );

  INSERT INTO rate_limit_counters (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limit_counters.count + 1
  RETURNING count INTO v_new_count;

  -- Opportunistic cleanup: 0.1% chance per call, delete windows older
  -- than 1 hour. Cheap and keeps the table bounded.
  IF random() < 0.001 THEN
    DELETE FROM rate_limit_counters
    WHERE window_start < now() - interval '1 hour';
  END IF;

  RETURN v_new_count <= p_max;
END;
$$;

-- RLS: deny everything to anon/authenticated; service role bypasses.
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
