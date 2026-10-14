-- ============================================================
-- Migration 038: Drop Cloudinary URLs from products
-- Context: Cloudinary account is no longer used (returned 401
-- for all public URLs). We now serve all product media from
-- Supabase Storage (bucket `media`) or local `/public`.
-- This migration strips any remaining `res.cloudinary.com`
-- references from the `products` table. Historical data in
-- migration 007 (Maracurujá) becomes orphaned as a result —
-- that migration is retained only for audit purposes.
-- ============================================================

-- 1. Remove Cloudinary URLs from the images[] arrays
UPDATE products
SET images = ARRAY(
  SELECT x
  FROM unnest(images) AS x
  WHERE x NOT LIKE '%res.cloudinary.com%'
)
WHERE images::text LIKE '%res.cloudinary.com%';

-- 2. Null out hero_video_url if it points to Cloudinary
UPDATE products
SET hero_video_url = NULL
WHERE hero_video_url LIKE '%res.cloudinary.com%';

-- 3. Null out hero_poster_url if it points to Cloudinary
UPDATE products
SET hero_poster_url = NULL
WHERE hero_poster_url LIKE '%res.cloudinary.com%';
