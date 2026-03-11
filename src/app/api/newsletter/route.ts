import { NextRequest, NextResponse } from "next/server";
import { NEWSLETTER_RATE_LIMIT } from "@/lib/config/rate-limit";
import { createInMemoryRateLimiter } from "@/lib/services/rate-limiter";
import { createNewsletterRepository } from "@/lib/repositories/supabase-newsletter-repository";
import { NewsletterSchema } from "@/lib/validators";

const rateLimiter = createInMemoryRateLimiter(
  NEWSLETTER_RATE_LIMIT.windowMs,
  NEWSLETTER_RATE_LIMIT.maxRequests
);

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  if (rateLimiter.isLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un minuto." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = NewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const repo = createNewsletterRepository();
    const result = await repo.subscribe(email);

    if (result.alreadyExists) {
      return NextResponse.json({ message: "Ya estás suscrito" }, { status: 200 });
    }

    return NextResponse.json({ message: "¡Suscripción exitosa!" }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
