"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PostForm } from "@/components/PostForm";
import type { Post } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("No se pudo cargar el post");
      } else {
        setPost(data as Post);
      }
      setLoading(false);
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">{error || "Post no encontrado"}</p>
      </div>
    );
  }

  return <PostForm mode="edit" initialData={post} />;
}
