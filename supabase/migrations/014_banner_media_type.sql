-- ============================================================
-- Migration 014: Banner media type + mobile image
-- Adds video support and responsive mobile crop to hero banners
-- ============================================================

ALTER TABLE hero_banners
  ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video')),
  ADD COLUMN image_url_mobile TEXT;
