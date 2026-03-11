import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { StorageService } from "./storage";

const BUCKET = "videos";

function extractPathFromUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

export function createServerStorageService(): StorageService {
  const supabase = createServerSupabaseClient();

  return {
    async upload(file, fileName, contentType) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, { contentType });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path);

      return { publicUrl: urlData.publicUrl, path: data.path };
    },

    async remove(paths) {
      const valid = paths.filter(Boolean);
      if (valid.length === 0) return;
      await supabase.storage.from(BUCKET).remove(valid);
    },

    getPublicUrl(path) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    },

    extractPath: extractPathFromUrl,
  };
}
