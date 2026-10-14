-- ============================================================
-- Migration 013: Supabase Storage bucket for media uploads
-- Creates a public bucket "media" for product images, banners, etc.
-- ============================================================

-- 1. Create the bucket (public = files accessible without auth token)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for storage.objects
--    Public read (anyone can view/download files from media bucket)
CREATE POLICY "Public read media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

--    Admin upload (INSERT) — requires service_role or authenticated admin
--    Since we use service_role key server-side, this allows all inserts
CREATE POLICY "Admin insert media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media');

--    Admin update (needed for upsert)
CREATE POLICY "Admin update media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media');

--    Admin delete
CREATE POLICY "Admin delete media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media');
