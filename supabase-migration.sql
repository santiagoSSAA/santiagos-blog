-- Migration: Align DB with SOLID refactoring
-- Run this in Supabase SQL Editor

-- 1. Add length constraints to posts
ALTER TABLE posts
  ALTER COLUMN title TYPE VARCHAR(200),
  ALTER COLUMN slug TYPE VARCHAR(200),
  ALTER COLUMN excerpt TYPE VARCHAR(500);

-- 2. Add length constraint to newsletter email
ALTER TABLE newsletter_subscribers
  ALTER COLUMN email TYPE VARCHAR(320);

-- 3. Create auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. Drop insecure public read policy on newsletter
DROP POLICY IF EXISTS "Public can read subscribers" ON newsletter_subscribers;

-- 5. Add secure policies for newsletter (authenticated only)
CREATE POLICY "Authenticated manage subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete subscribers"
  ON newsletter_subscribers FOR DELETE
  USING (auth.role() = 'authenticated');
