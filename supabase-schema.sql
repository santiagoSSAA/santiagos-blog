-- Posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  excerpt VARCHAR(500) DEFAULT '',
  content TEXT DEFAULT '',
  video_url TEXT,
  thumbnail_url TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Auto-update updated_at on row change
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

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);

-- Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read access for published posts only
CREATE POLICY "Public can read published posts"
  ON posts FOR SELECT
  USING (published = true);

-- Authenticated users can do everything with posts
CREATE POLICY "Authenticated users full access to posts"
  ON posts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Anyone can subscribe to newsletter (upsert handles duplicates)
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read/manage subscribers
CREATE POLICY "Authenticated manage subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete subscribers"
  ON newsletter_subscribers FOR DELETE
  USING (auth.role() = 'authenticated');

-- Storage bucket for videos and thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT DO NOTHING;

-- Public read access for videos
CREATE POLICY "Public can read videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Authenticated users can upload videos
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Authenticated users can delete videos
CREATE POLICY "Authenticated users can delete videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
