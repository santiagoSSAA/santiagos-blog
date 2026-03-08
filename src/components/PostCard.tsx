import Link from "next/link";
import { Video } from "lucide-react";
import { type Post } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50 hover:-translate-y-1">
        <div className="relative aspect-video overflow-hidden">
          {post.thumbnail_url ? (
            <img
              src={post.thumbnail_url}
              alt={post.title}
              crossOrigin="anonymous"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800" />
          )}
          {post.video_url && (
            <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-zinc-900/75 text-white backdrop-blur-sm">
              <Video size={14} />
              Video
            </span>
          )}
        </div>

        <div className="p-5">
          <time className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {formatDate(post.created_at)}
          </time>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
            {post.title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
            {post.excerpt}
          </p>
          <span className="inline-block mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:translate-x-1 transition-transform">
            Leer más &rarr;
          </span>
        </div>
      </article>
    </Link>
  );
}
