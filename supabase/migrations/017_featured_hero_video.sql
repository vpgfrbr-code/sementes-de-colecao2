-- Migration 017: Add hero video fields for featured product landing pages
-- When a product is_featured AND has hero_video_url + hero_frame_count,
-- the product page renders an immersive scrollytelling landing.
-- hero_video_url stores the frame path prefix (e.g. "/images/maracuruja/frames/frame_")
-- hero_frame_count stores total number of extracted frames
-- hero_poster_url stores a static poster image shown during frame loading

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hero_video_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_poster_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_frame_count INTEGER;

-- Seed Maracurujá with the existing local hero frames
UPDATE products
SET hero_video_url   = '/images/maracuruja/frames/frame_',
    hero_poster_url  = '/images/maracuruja/maracurujav3.png',
    hero_frame_count = 97
WHERE slug = 'maracuruja-coruja-seeds';
