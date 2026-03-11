import type { Post, PostAdmin } from "@/lib/types";
import type { CreatePostInput, UpdatePostInput } from "@/lib/validators";

export interface PostRepository {
  findAll(): Promise<PostAdmin[]>;
  findById(id: string): Promise<Post | null>;
  create(data: CreatePostInput): Promise<Post>;
  update(id: string, data: UpdatePostInput): Promise<Post>;
  delete(id: string): Promise<void>;
  getMediaUrls(id: string): Promise<{ video_url: string | null; thumbnail_url: string | null } | null>;
}
