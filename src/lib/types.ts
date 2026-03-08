export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  video_url: string | null;
  thumbnail_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}
