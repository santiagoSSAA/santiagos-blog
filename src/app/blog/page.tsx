import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PostCard } from "@/components/PostCard";

export const metadata: Metadata = {
  title: "Blog",
};

export default async function BlogPage() {
  const supabase = createServerSupabaseClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <main className="py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>

        {posts && posts.length > 0 ? (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-neutral-400">
            Aún no hay posts. ¡Pronto habrá contenido!
          </p>
        )}
      </div>
    </main>
  );
}
