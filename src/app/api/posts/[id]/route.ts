import { NextRequest, NextResponse } from "next/server";
import { createPostRepository } from "@/lib/repositories/supabase-post-repository";
import { createServerStorageService } from "@/lib/services/supabase-storage-server";
import { UpdatePostSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repo = createPostRepository();
    const post = await repo.findById(params.id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const parsed = UpdatePostSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const repo = createPostRepository();
    const data = await repo.update(params.id, parsed.data);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repo = createPostRepository();
    const storage = createServerStorageService();

    const media = await repo.getMediaUrls(params.id);
    if (media) {
      const paths: string[] = [];
      if (media.video_url) {
        const p = storage.extractPath(media.video_url);
        if (p) paths.push(p);
      }
      if (media.thumbnail_url) {
        const p = storage.extractPath(media.thumbnail_url);
        if (p) paths.push(p);
      }
      if (paths.length > 0) await storage.remove(paths);
    }

    await repo.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
