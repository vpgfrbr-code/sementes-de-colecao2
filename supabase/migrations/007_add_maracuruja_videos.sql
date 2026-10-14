-- ============================================================
-- Add video URLs to Maracurujá product gallery
-- ============================================================

UPDATE products
SET images = ARRAY[
  '/images/maracuruja/maracurujav3.png',
  '/images/maracuruja/thailand expedition.png',
  '/videos/maracuruja.mp4',
  'https://res.cloudinary.com/dm5rmvt0g/video/upload/v1775898498/maracuruja2_kc86pj.mp4'
]
WHERE id = 'b2c3d4e5-2222-4000-a000-000000000001';
