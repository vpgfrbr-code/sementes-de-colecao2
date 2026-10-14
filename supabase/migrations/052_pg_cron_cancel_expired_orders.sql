-- Migration 052: Cancel expired PIX orders with pg_cron
--
-- Replaces the Vercel cron that called /api/cron/cancel-expired-orders every
-- 15 minutes (the Vercel Hobby plan only allows daily crons, which blocked
-- deployments). The job now runs entirely inside Postgres: no HTTP call and
-- no CRON_SECRET to store.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Restore seed stock for one order.
--    Mirrors src/lib/restore-order-stock.ts (used by admin cancellation):
--    bundles restore stock to their components; other items restore
--    variant.seed_count * quantity (1 seed per unit when there is no variant).
--    Keep both implementations in sync.
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH items AS (
    SELECT oi.product_id, oi.variant_id, oi.quantity, p.product_type
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  ),
  seeds AS (
    SELECT i.product_id, COALESCE(v.seed_count, 1) * i.quantity AS seeds
    FROM items i
    LEFT JOIN product_variants v ON v.id = i.variant_id
    WHERE i.product_type <> 'bundle'
    UNION ALL
    SELECT bc.component_product_id, bc.seed_count * i.quantity
    FROM items i
    JOIN bundle_components bc ON bc.bundle_product_id = i.product_id
    WHERE i.product_type = 'bundle'
  )
  UPDATE products pr
  SET stock = pr.stock + s.total
  FROM (
    SELECT product_id, SUM(seeds)::INTEGER AS total
    FROM seeds
    GROUP BY product_id
  ) s
  WHERE pr.id = s.product_id;
END;
$$;

-- 2. Cancel waiting_payment orders whose PIX window has passed and restore
--    their stock. Never touches payment_reported (customer said they paid).
--    Each order is cancelled + restocked atomically; a failing order is
--    skipped with a warning and retried on the next run.
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_cancelled INTEGER := 0;
BEGIN
  FOR v_order_id IN
    SELECT id
    FROM orders
    WHERE status = 'waiting_payment'
      AND pix_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE orders SET status = 'cancelled' WHERE id = v_order_id;
      PERFORM public.restore_order_stock(v_order_id);
      v_cancelled := v_cancelled + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[cron] cancel_expired_orders: order % failed: %',
        v_order_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_cancelled;
END;
$$;

-- 3. Internal only: not callable through the PostgREST API.
REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_expired_orders()
  FROM PUBLIC, anon, authenticated;

-- 4. Schedule every 15 minutes (cron.schedule upserts by job name).
SELECT cron.schedule(
  'cancel-expired-orders',
  '*/15 * * * *',
  $$SELECT public.cancel_expired_orders()$$
);
