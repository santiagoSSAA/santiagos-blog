"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateSlug } from "@/lib/utils";
import { createBrowserStorageService } from "@/lib/services/supabase-storage-browser";
import { VideoUploader } from "@/components/VideoUploader";
import { ThumbnailUploader } from "@/components/ThumbnailUploader";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Post } from "@/lib/types";

type PostFormProps =
  | { mode: "create" }
  | { mode: "edit"; initialData: Post };

export function PostForm(props: PostFormProps) {
  const { mode } = props;
  const initialData = mode === "edit" ? props.initialData : undefined;
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSlug(initialData.slug);
      setExcerpt(initialData.excerpt || "");
      setContent(initialData.content);
      setVideoUrl(initialData.video_url || "");
      setThumbnailUrl(initialData.thumbnail_url || "");
      setPublished(initialData.published);
    }
  }, [initialData]);

  const deleteFromStorage = async (url: string) => {
    const storage = createBrowserStorageService();
    const path = storage.extractPath(url);
    if (!path) return;
    await storage.remove([path]);
  };

  const handleRemoveVideo = async () => {
    if (videoUrl) await deleteFromStorage(videoUrl);
    setVideoUrl("");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (mode === "create" || !initialData) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const url =
      mode === "create" ? "/api/posts" : `/api/posts/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content,
          video_url: videoUrl || null,
          thumbnail_url: thumbnailUrl || null,
          published,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Error al ${mode === "create" ? "crear" : "actualizar"} el post`);
      }

      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Error al ${mode === "create" ? "crear" : "actualizar"} el post`
      );
      setSubmitting(false);
    }
  };

  const inputClassName =
    "w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400";
  const labelClassName =
    "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {mode === "create" ? "Nuevo post" : "Editar post"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className={labelClassName}>
            Título
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="Mi nuevo artículo"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="slug" className={labelClassName}>
            Slug
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            placeholder="mi-nuevo-articulo"
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Se genera automáticamente desde el título
          </p>
        </div>

        <div>
          <label htmlFor="excerpt" className={labelClassName}>
            Extracto
          </label>
          <textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="Breve descripción del post..."
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="content" className={labelClassName}>
            Contenido (Markdown)
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            required
            placeholder="Escribe el contenido en Markdown..."
            className={`${inputClassName} font-mono text-sm`}
          />
        </div>

        <div>
          <label className={labelClassName}>Video</label>
          {videoUrl && (
            <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Video actual:{" "}
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {videoUrl.split("/").pop()}
                </span>
              </p>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="mt-1 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Eliminar video
              </button>
            </div>
          )}
          <VideoUploader
            onUpload={(url) => {
              setVideoUrl(url);
              if (!thumbnailUrl) setThumbnailUrl(url);
            }}
          />
        </div>

        <div>
          <label className={labelClassName}>Miniatura</label>
          <ThumbnailUploader value={thumbnailUrl} onChange={setThumbnailUrl} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={published}
            onClick={() => setPublished(!published)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              published ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                published ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <label
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
            onClick={() => setPublished(!published)}
          >
            {published ? "Publicado" : "Borrador"}
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting
              ? mode === "create"
                ? "Creando..."
                : "Guardando..."
              : mode === "create"
                ? "Crear post"
                : "Guardar cambios"}
          </button>
          <Link
            href="/admin"
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
