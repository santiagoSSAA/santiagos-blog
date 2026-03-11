import { NextRequest, NextResponse } from "next/server";
import { createPostRepository } from "@/lib/repositories/supabase-post-repository";
import { CreatePostSchema } from "@/lib/validators";

export async function GET() {
  try {
    const repo = createPostRepository();
    const posts = await repo.findAll();
    return NextResponse.json(posts);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreatePostSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const repo = createPostRepository();
    const data = await repo.create(parsed.data);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
