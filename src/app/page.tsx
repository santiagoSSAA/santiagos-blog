import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PostCard } from "@/components/PostCard";
import { NewsletterForm } from "@/components/NewsletterForm";

export default async function HomePage() {
  const supabase = createServerSupabaseClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <main>
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Hola, soy{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Santiago
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400">
            Solo founder compartiendo mi camino. Historias, aprendizajes y
            videos sobre construir algo desde cero.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              href="/blog"
              className="rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-neutral-200"
            >
              Leer el blog
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-neutral-700 px-6 py-3 font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
            >
              Sobre mí
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold tracking-tight">Últimos posts</h2>
          {posts && posts.length > 0 ? (
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-neutral-400">
              Aún no hay posts. ¡Pronto habrá contenido!
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-neutral-800 py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            No te pierdas nada
          </h2>
          <p className="mt-3 text-neutral-400">
            Suscríbete y recibe cada nuevo post directo en tu correo.
          </p>
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  );
}
