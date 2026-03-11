import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { PostRepository } from "./post-repository";

export function createPostRepository(): PostRepository {
  const supabase = createServerSupabaseClient();

  return {
    async findAll() {
      const { data, error } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, thumbnail_url, video_url, created_at, published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async findById(id) {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      return data;
    },

    async create(input) {
      const { data, error } = await supabase
        .from("posts")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id, input) {
      const { data, error } = await supabase
        .from("posts")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    async getMediaUrls(id) {
      const { data, error } = await supabase
        .from("posts")
        .select("video_url, thumbnail_url")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      return data;
    },
  };
}
