-- Coupon balance groups: distribute sales evenly across reseller coupons
-- with the same discount type/value.

-- 1. Balance groups table
CREATE TABLE IF NOT EXISTS coupon_balance_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coupon_balance_groups ENABLE ROW LEVEL SECURITY;

-- 2. Many-to-many junction table (a coupon can be in multiple groups)
CREATE TABLE IF NOT EXISTS coupon_balance_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES coupon_balance_groups(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, coupon_id)
);

ALTER TABLE coupon_balance_group_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cbgm_group_id ON coupon_balance_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_cbgm_coupon_id ON coupon_balance_group_members(coupon_id);

-- 3. Migrate data from old balance_group_id FK to junction table (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'balance_group_id'
  ) THEN
    INSERT INTO coupon_balance_group_members (group_id, coupon_id)
    SELECT balance_group_id, id FROM coupons
    WHERE balance_group_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    ALTER TABLE coupons DROP COLUMN balance_group_id;
  END IF;
END $$;

-- 4. Drop old index if it exists
DROP INDEX IF EXISTS idx_coupons_balance_group;

-- 5. Audit trail: store original coupon code when a swap occurs
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS original_coupon_code TEXT;
