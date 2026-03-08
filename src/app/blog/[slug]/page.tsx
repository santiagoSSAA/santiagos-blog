import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { formatDate } from "@/lib/utils";
import { VideoPlayer } from "@/components/VideoPlayer";
import { NewsletterForm } from "@/components/NewsletterForm";

interface PageProps {
  params: { slug: string };
}

async function getPost(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  return post;
}

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return { title: "Post no encontrado" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PageProps) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="py-20">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm text-neutral-400 transition hover:text-white"
        >
          ← Volver al blog
        </Link>

        <article className="mt-8">
          <header>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <time
              dateTime={post.created_at}
              className="mt-4 block text-sm text-neutral-400"
            >
              {formatDate(post.created_at)}
            </time>
          </header>

          {post.video_url && (
            <div className="mt-10">
              <VideoPlayer src={post.video_url} poster={post.thumbnail_url} />
            </div>
          )}

          <div className="prose-custom mt-10">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        <section className="mt-20 border-t border-neutral-800 pt-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            ¿Te gustó este post?
          </h2>
          <p className="mt-3 text-neutral-400">
            Suscríbete para recibir los próximos directo en tu correo.
          </p>
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </section>
      </div>
    </main>
  );
}
