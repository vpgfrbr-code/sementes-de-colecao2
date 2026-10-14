-- Migration 053: Lock down store SECURITY DEFINER functions
--
-- Supabase grants EXECUTE on every new function in `public` to anon and
-- authenticated, so these functions were callable by anyone with the public
-- anon key via /rest/v1/rpc/<name> — bypassing RLS to change stock and
-- coupon usage without signing in. They are only meant to be called from
-- the Next.js API routes, which use the service_role key (explicit grant,
-- unaffected by this revoke), or internally by other functions.

-- 1. Internal only: not callable through the PostgREST API.
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_product_stock(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_product_stock(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_bundle_effective_stock(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_coupon_usage(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_coupon_usage(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_coupon_usage_reservation(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_lookup_tokens()
  FROM PUBLIC, anon, authenticated;

-- 2. Pin search_path on the SECURITY DEFINER functions that lacked it, so
--    they can't be hijacked by objects in another schema.
ALTER FUNCTION public.decrement_stock(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.reserve_product_stock(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.restore_product_stock(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_bundle_effective_stock(UUID) SET search_path = public;
ALTER FUNCTION public.increment_coupon_usage(UUID) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_lookup_tokens() SET search_path = public;
