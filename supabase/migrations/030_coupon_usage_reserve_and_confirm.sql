-- ============================================================
-- Migration 030: Reserve coupon usage at checkout and confirm on approval
-- ============================================================

CREATE TABLE coupon_usage_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_coupon_usage_reservations_order_id
  ON coupon_usage_reservations(order_id);

CREATE INDEX idx_coupon_usage_reservations_coupon_reserved
  ON coupon_usage_reservations(coupon_id, status);

ALTER TABLE coupon_usage_reservations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION reserve_coupon_usage(p_coupon_id UUID, p_order_id UUID)
RETURNS VOID
AS $$
DECLARE
  v_max_uses INTEGER;
  v_used_count INTEGER;
  v_reserved_count INTEGER;
BEGIN
  IF p_coupon_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'coupon_id and order_id are required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM coupon_usage_reservations
    WHERE order_id = p_order_id
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM orders
    WHERE id = p_order_id
      AND coupon_id = p_coupon_id
  ) THEN
    RAISE EXCEPTION 'Order % is not linked to coupon %', p_order_id, p_coupon_id;
  END IF;

  SELECT c.max_uses, c.used_count
  INTO v_max_uses, v_used_count
  FROM coupons c
  WHERE c.id = p_coupon_id
    AND c.active = true
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon % cannot be reserved', p_coupon_id;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_reserved_count
  FROM coupon_usage_reservations r
  WHERE r.coupon_id = p_coupon_id
    AND r.status = 'reserved';

  IF v_max_uses IS NOT NULL AND (v_used_count + v_reserved_count) >= v_max_uses THEN
    RAISE EXCEPTION 'Coupon % reached max uses', p_coupon_id;
  END IF;

  INSERT INTO coupon_usage_reservations (coupon_id, order_id, status)
  VALUES (p_coupon_id, p_order_id, 'reserved')
  ON CONFLICT (order_id) DO NOTHING;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION confirm_coupon_usage(p_order_id UUID)
RETURNS BOOLEAN
AS $$
DECLARE
  v_coupon_id UUID;
  v_reservation_status TEXT;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT o.coupon_id
  INTO v_coupon_id
  FROM orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_coupon_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT r.status
  INTO v_reservation_status
  FROM coupon_usage_reservations r
  WHERE r.order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Legacy orders (created before reservation flow) already incremented usage at checkout.
    RETURN FALSE;
  END IF;

  IF v_reservation_status = 'confirmed' THEN
    RETURN FALSE;
  END IF;

  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = v_coupon_id;

  UPDATE coupon_usage_reservations
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE order_id = p_order_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION release_coupon_usage_reservation(p_order_id UUID)
RETURNS BOOLEAN
AS $$
DECLARE
  v_reservation_status TEXT;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT r.status
  INTO v_reservation_status
  FROM coupon_usage_reservations r
  WHERE r.order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_reservation_status = 'confirmed' THEN
    RETURN FALSE;
  END IF;

  DELETE FROM coupon_usage_reservations
  WHERE order_id = p_order_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
