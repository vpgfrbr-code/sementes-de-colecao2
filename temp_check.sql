-- Check if translations table exists too
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hero_banner_translations') THEN
    RAISE NOTICE 'hero_banner_translations missing, needs creation';
  ELSE
    RAISE NOTICE 'both tables already exist';
  END IF;
END
$$;
