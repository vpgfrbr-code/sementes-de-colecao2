-- ═══════════════════════════════════════════════════════════════════════
-- 034 — Product reviews
--
-- Public-facing reviews tied to real orders. A review can only be submitted
-- by a customer who actually bought the product (validated via order_id).
-- Admin must approve each review before it becomes public.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Author (from the order — either clerk user or guest)
  clerk_user_id TEXT,
  guest_email   TEXT,
  author_name   TEXT NOT NULL,

  -- Content
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,

  -- Moderation
  approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at   TIMESTAMPTZ,
  approved_by   TEXT, -- clerk user id of admin
  rejected_reason TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate reviews: one per (order, product)
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved
  ON product_reviews (product_id, approved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_pending
  ON product_reviews (approved, created_at DESC)
  WHERE approved = FALSE;

CREATE INDEX IF NOT EXISTS idx_product_reviews_order
  ON product_reviews (order_id);

-- Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS product_reviews_updated_at ON product_reviews;
CREATE TRIGGER product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read only approved reviews
DROP POLICY IF EXISTS "Public can read approved reviews" ON product_reviews;
CREATE POLICY "Public can read approved reviews"
  ON product_reviews FOR SELECT
  USING (approved = TRUE);

-- Author can read their own reviews (approved or not)
DROP POLICY IF EXISTS "Authors can read own reviews by clerk_id" ON product_reviews;
CREATE POLICY "Authors can read own reviews by clerk_id"
  ON product_reviews FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Authors can read own reviews by email" ON product_reviews;
CREATE POLICY "Authors can read own reviews by email"
  ON product_reviews FOR SELECT
  USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Note: INSERT/UPDATE from API routes use the service_role key, bypassing RLS.
-- Admin moderation is enforced in the API layer via requireAdmin().

-- ── Review invite tracking on orders ────────────────────────────────
-- Prevents sending the invite email more than once per order.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS review_invite_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_shipped_no_invite
  ON orders (status, review_invite_sent_at)
  WHERE status IN ('shipped', 'delivered') AND review_invite_sent_at IS NULL;
