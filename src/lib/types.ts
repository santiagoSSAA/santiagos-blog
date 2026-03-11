export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  thumbnail_url: string | null;
  video_url: string | null;
  created_at: string;
}

export interface PostAdmin extends PostSummary {
  id: string;
  published: boolean;
}

export interface Post extends PostAdmin {
  content: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}
