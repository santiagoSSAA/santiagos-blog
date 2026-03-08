import { z } from "zod";

export const CreatePostSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(200),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  excerpt: z.string().max(500).default(""),
  content: z.string().default(""),
  video_url: z.string().url().nullable().default(null),
  thumbnail_url: z.string().url().nullable().default(null),
  published: z.boolean().default(false),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export const NewsletterSchema = z.object({
  email: z.string().email("Email inválido").max(320),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
