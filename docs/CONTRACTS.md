# Contratos — Interfaces y tipos

> Este documento contiene las interfaces EXACTAS que deben implementarse.
> No inventar firmas distintas. Copiar tal cual al crear cada archivo.
> Cualquier cambio a un contrato debe actualizarse aquí primero.

---

## Tipos segregados (`src/lib/types.ts`)

```typescript
export interface PostSummary {
  slug: string;
  title: string;
  excerpt: string;
  thumbnail_url: string | null;
  video_url: string | null;
  created_at: string;
}

export interface PostAdmin extends PostSummary {
  id: string;
  published: boolean;
}

export interface Post extends PostAdmin {
  content: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}
```

### Quién usa qué tipo

| Tipo | Consumidores |
|---|---|
| `PostSummary` | `PostCard.tsx` |
| `PostAdmin` | `admin/page.tsx` (dashboard) |
| `Post` | `PostForm.tsx`, `edit/[id]/page.tsx`, API route GET by id |
| `NewsletterSubscriber` | Solo lectura en admin (futuro) |

---

## StorageService (`src/lib/services/storage.ts`)

```typescript
export interface UploadResult {
  publicUrl: string;
  path: string;
}

export interface StorageService {
  upload(file: Blob, fileName: string, contentType: string): Promise<UploadResult>;
  remove(paths: string[]): Promise<void>;
  getPublicUrl(path: string): string;
  extractPath(publicUrl: string): string | null;
}
```

### Notas de implementación

- `upload()` recibe el blob ya comprimido, el nombre de archivo (con subcarpeta incluida, ej: `videos/1234-video.mp4`), y el content type.
- `remove()` acepta array de paths relativos al bucket. Ignora paths vacíos o null.
- `getPublicUrl()` construye la URL pública dado un path relativo.
- `extractPath()` reemplaza la función `extractStoragePath` actual de `utils.ts`. Extrae el path relativo de una URL pública de Supabase Storage.

### Implementación: browser y server (split obligatorio)

- **Browser:** `src/lib/services/supabase-storage-browser.ts` — `createBrowserStorageService()` — solo lo importan hooks/components client.
- **Server:** `src/lib/services/supabase-storage-server.ts` — `createServerStorageService()` — solo API routes / server.

Ejemplo browser (misma firma `StorageService`):

```typescript
import { createClient } from "@/lib/supabase";
import type { StorageService, UploadResult } from "./storage";

const BUCKET = "videos";

export function createBrowserStorageService(): StorageService {
  const supabase = createClient();

  return {
    async upload(file, fileName, contentType) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, { contentType });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path);

      return { publicUrl: urlData.publicUrl, path: data.path };
    },

    async remove(paths) {
      const valid = paths.filter(Boolean);
      if (valid.length === 0) return;
      await supabase.storage.from(BUCKET).remove(valid);
    },

    getPublicUrl(path) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    },

    extractPath(publicUrl) {
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      const idx = publicUrl.indexOf(marker);
      if (idx === -1) return null;
      return publicUrl.substring(idx + marker.length);
    },
  };
}
```

> También se necesita una versión server (`createServerStorageService`) para las
> API routes de DELETE. Usa `createServerSupabaseClient()` en lugar de `createClient()`.

---

## VideoCompressor (`src/lib/services/compression.ts`)

```typescript
export interface VideoCompressionConfig {
  resolution: number;
  codec: string;
  crf: number;
  preset: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow";
  audioBitrate: string;
}

export interface VideoCompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

export interface VideoCompressor {
  compress(
    file: File,
    config: VideoCompressionConfig,
    onProgress?: (percent: number) => void
  ): Promise<VideoCompressionResult>;
  isAvailable(): boolean;
}
```

### Runtime (precarga / estado) — `src/lib/services/video-compression-runtime.ts`

Único punto aparte de `ffmpeg-compressor` que importa `@/lib/ffmpeg-engine`. Los hooks usan este facade:

- `preloadCompressionRuntime(): Promise<boolean>`
- `onCompressionRuntimeStateChange(fn): () => void`
- `getCompressionRuntimeState()` — snapshot `{ state, detail? }`

Estados: `"idle" | "loading" | "ready" | "error"`.

### Implementación: `src/lib/services/ffmpeg-compressor.ts`

- Importa de `@/lib/ffmpeg-engine` (getFFmpegInstance, getFetchFile).
- `compress()` construye los args de ffmpeg dinámicamente desde `config`.
- `isAvailable()` retorna `true` si `getFFmpegInstance()` no es null.
- NO gestiona UI. NO gestiona estados. Solo comprime y retorna el blob.

---

## ImageCompressor (`src/lib/services/compression.ts`)

```typescript
export interface ImageCompressionConfig {
  maxWidth: number;
  quality: number;
  format: "webp" | "avif" | "jpeg";
}

export interface ImageCompressor {
  compress(file: File, config: ImageCompressionConfig): Promise<Blob>;
}
```

### Implementación: `src/lib/services/canvas-image-compressor.ts`

- Extrae la función `compressImage` actual de `ThumbnailUploader.tsx` (líneas 29-58).
- Recibe `config` en vez de tener `maxWidth=800` y `quality=0.6` hardcodeados.
- Soporta formato configurable (`image/webp`, `image/avif`, `image/jpeg`).

---

## RateLimiter (`src/lib/services/rate-limiter.ts`)

```typescript
export interface RateLimiter {
  isLimited(key: string): boolean;
}

export function createInMemoryRateLimiter(
  windowMs: number,
  maxRequests: number
): RateLimiter;
```

### Implementación

Extrae la lógica del `Map` actual de `newsletter/route.ts` (líneas 5-20). La firma `isLimited(key)` reemplaza `isRateLimited(ip)`.

---

## PostRepository (`src/lib/repositories/post-repository.ts`)

```typescript
import type { Post, PostAdmin, CreatePostInput, UpdatePostInput } from "@/lib/types";

export interface PostRepository {
  findAll(): Promise<PostAdmin[]>;
  findById(id: string): Promise<Post | null>;
  create(data: CreatePostInput): Promise<Post>;
  update(id: string, data: UpdatePostInput): Promise<Post>;
  delete(id: string): Promise<void>;
  getMediaUrls(id: string): Promise<{ video_url: string | null; thumbnail_url: string | null } | null>;
}
```

### Notas de implementación

- `findAll()` retorna `PostAdmin[]` (no incluye `content` ni `updated_at`). Esto optimiza el query del dashboard.
- `getMediaUrls()` existe separado de `delete()` para que la route pueda limpiar storage antes de borrar el registro. Es un SELECT solo de `video_url, thumbnail_url`.
- `delete()` solo borra el registro de la DB. La limpieza de storage la hace la route llamando a `StorageService.remove()`.

### Implementación: `src/lib/repositories/supabase-post-repository.ts`

```typescript
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { PostRepository } from "./post-repository";

export function createPostRepository(): PostRepository {
  const supabase = createServerSupabaseClient();

  return {
    async findAll() {
      const { data, error } = await supabase
        .from("posts")
        .select("id, slug, title, excerpt, thumbnail_url, video_url, created_at, published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    // ... demás métodos siguen el mismo patrón
  };
}
```

---

## NewsletterRepository (`src/lib/repositories/newsletter-repository.ts`)

```typescript
export interface SubscribeResult {
  alreadyExists: boolean;
}

export interface NewsletterRepository {
  subscribe(email: string): Promise<SubscribeResult>;
}
```

### Implementación: `src/lib/repositories/supabase-newsletter-repository.ts`

- `subscribe()` hace INSERT y detecta código `23505` (unique violation) para retornar `{ alreadyExists: true }`.
- La route ya no necesita saber qué código de error significa "duplicado".

---

## Hooks

### `useVideoUpload` (`src/lib/hooks/use-video-upload.ts`)

```typescript
type UploadState = "idle" | "compressing" | "uploading" | "done" | "error" | "cancelled";
type FFmpegStatus = "loading" | "ready" | "unavailable";

interface FileInfo {
  name: string;
  originalSize: number;
  compressedSize?: number;
}

interface UseVideoUploadReturn {
  state: UploadState;
  ffmpegStatus: FFmpegStatus;
  ffmpegDetail: string;
  progress: number;
  error: string;
  fileInfo: FileInfo | null;
  processFile: (file: File) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useVideoUpload(onUpload: (url: string) => void): UseVideoUploadReturn;
```

Este hook:
- Suscribe a `onCompressionRuntimeStateChange` en mount (facade; no importar `ffmpeg-engine` en hooks).
- Llama `preloadCompressionRuntime()` en mount.
- `processFile()` valida → comprime vía `VideoCompressor` → sube vía `StorageService` → llama `onUpload(url)`.
- Gestiona cancelación con `cancelledRef`.
- Lee config de `lib/config/compression.ts`.

### `useThumbnailUpload` (`src/lib/hooks/use-thumbnail-upload.ts`)

```typescript
interface ThumbnailFileInfo {
  original: number;
  compressed: number;
}

interface UseThumbnailUploadReturn {
  state: UploadState;
  errorMsg: string;
  fileInfo: ThumbnailFileInfo | null;
  localPreview: string | null;
  handleFile: (file: File) => Promise<void>;
  handleCancel: () => void;
  reset: () => void;
}

export function useThumbnailUpload(onChange: (url: string) => void): UseThumbnailUploadReturn;
```

---

## Configs (`src/lib/config/`)

### `compression.ts`

```typescript
import type { VideoCompressionConfig, ImageCompressionConfig } from "@/lib/services/compression";

export const VIDEO_DEFAULTS: VideoCompressionConfig = {
  resolution: 720,
  codec: "libx264",
  crf: 28,
  preset: "fast",
  audioBitrate: "128k",
};

export const IMAGE_DEFAULTS: ImageCompressionConfig = {
  maxWidth: 800,
  quality: 0.6,
  format: "webp",
};

export const VIDEO_MAX_SIZE = 500 * 1024 * 1024; // 500MB
export const IMAGE_MAX_SIZE = 20 * 1024 * 1024;  // 20MB

export const VIDEO_STORAGE_PREFIX = "videos";

export function buildVideoObjectKey(file: File): string {
  return `${VIDEO_STORAGE_PREFIX}/${Date.now()}-${file.name}`;
}
```

### `rate-limit.ts`

```typescript
export const NEWSLETTER_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 5,
};
```

---

## PostFormProps (discriminated union)

```typescript
type PostFormProps =
  | { mode: "create" }
  | { mode: "edit"; initialData: Post };
```

Reemplaza la interfaz actual donde `initialData` es siempre opcional.

---

## Checklist de contratos

Usar para verificar que todas las interfaces están implementadas:

- [ ] `StorageService` → `supabase-storage-browser.ts` + `supabase-storage-server.ts`
- [ ] `VideoCompressor` → `createFFmpegCompressor()`
- [ ] `ImageCompressor` → `createCanvasImageCompressor()`
- [ ] `RateLimiter` → `createInMemoryRateLimiter()`
- [ ] `PostRepository` → `createPostRepository()`
- [ ] `NewsletterRepository` → `createNewsletterRepository()`
- [ ] `useVideoUpload` hook
- [ ] `useThumbnailUpload` hook
- [ ] Tipos segregados: `PostSummary`, `PostAdmin`, `Post`
- [ ] Configs: `VIDEO_DEFAULTS`, `IMAGE_DEFAULTS`, `NEWSLETTER_RATE_LIMIT`
- [ ] `PostFormProps` discriminated union
