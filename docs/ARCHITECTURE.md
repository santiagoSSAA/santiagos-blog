# Arquitectura destino

> Este documento define la arquitectura final después de la refactorización.
> Es la referencia principal para decidir dónde vive cada pieza de código
> y qué puede importar de qué.

---

## Estructura de carpetas

```
src/
├── app/
│   ├── api/
│   │   ├── newsletter/route.ts        # Usa RateLimiter + NewsletterRepository
│   │   ├── media/route.ts             # Sin cambios (proxy)
│   │   └── posts/
│   │       ├── route.ts               # Usa PostRepository
│   │       └── [id]/route.ts          # Usa PostRepository + StorageService
│   └── admin/
│       ├── layout.tsx                 # Usa FFmpegProvider context
│       ├── page.tsx                   # Usa tipo PostAdmin
│       ├── new/page.tsx               # Sin cambios
│       ├── login/page.tsx             # Sin cambios
│       └── edit/[id]/page.tsx         # Sin cambios
├── components/
│   ├── PostForm.tsx                   # Discriminated union, sin imports de Supabase
│   ├── VideoUploader.tsx              # Solo UI, usa useVideoUpload
│   ├── ThumbnailUploader.tsx          # Solo UI, usa useThumbnailUpload
│   ├── PostCard.tsx                   # Usa tipo PostSummary
│   ├── NewsletterForm.tsx             # Sin cambios
│   ├── Footer.tsx                     # Sin cambios
│   ├── Header.tsx                     # Sin cambios
│   ├── ThemeProvider.tsx              # Sin cambios
│   ├── ThemeToggle.tsx                # Sin cambios
│   └── VideoPlayer.tsx               # Sin cambios
├── lib/
│   ├── config/
│   │   ├── compression.ts            # Defaults de video e imagen
│   │   └── rate-limit.ts             # Defaults de rate limiting
│   ├── hooks/
│   │   ├── use-video-upload.ts        # Orquesta VideoCompressor + StorageService
│   │   └── use-thumbnail-upload.ts    # Orquesta ImageCompressor + StorageService
│   ├── repositories/
│   │   ├── post-repository.ts         # Interface PostRepository
│   │   ├── supabase-post-repository.ts
│   │   ├── newsletter-repository.ts   # Interface NewsletterRepository
│   │   └── supabase-newsletter-repository.ts
│   ├── services/
│   │   ├── storage.ts                 # Interface StorageService
│   │   ├── supabase-storage-browser.ts / supabase-storage-server.ts
│   │   ├── video-compression-runtime.ts  # Facade preload/subscribe (solo ffmpeg-engine aquí + ffmpeg-compressor)
│   │   ├── compression.ts            # Interfaces VideoCompressor + ImageCompressor
│   │   ├── ffmpeg-compressor.ts       # Implementación FFmpeg
│   │   ├── canvas-image-compressor.ts # Implementación Canvas→WebP
│   │   └── rate-limiter.ts            # Interface + implementación in-memory
│   ├── types.ts                       # Post, PostAdmin, PostSummary, NewsletterSubscriber
│   ├── validators.ts                  # Sin cambios
│   ├── utils.ts                       # Sin cambios
│   ├── supabase.ts                    # Sin cambios (solo lo importan implementations)
│   ├── supabase-server.ts             # Sin cambios (solo lo importan implementations)
│   └── ffmpeg-engine.ts               # Sin cambios (solo lo importa ffmpeg-compressor)
└── middleware.ts                       # Sin cambios
```

---

## Capas y regla de dependencia

El proyecto tiene 5 capas. Las dependencias fluyen **solo hacia abajo** (nunca hacia arriba ni lateralmente entre capas del mismo nivel).

```
┌─────────────────────────────────────────────────┐
│  CAPA 1 — Pages & Routes                       │
│  app/api/*, app/admin/*                         │
│  Puede importar: capas 2, 3, 4, 5              │
├─────────────────────────────────────────────────┤
│  CAPA 2 — Components                           │
│  components/*                                   │
│  Puede importar: capas 3, 4, 5                  │
├─────────────────────────────────────────────────┤
│  CAPA 3 — Hooks                                │
│  lib/hooks/*                                    │
│  Puede importar: capas 4, 5                     │
├─────────────────────────────────────────────────┤
│  CAPA 4 — Servicios & Repositorios             │
│  lib/services/*, lib/repositories/*             │
│  Puede importar: capa 5                         │
├─────────────────────────────────────────────────┤
│  CAPA 5 — Core                                 │
│  lib/types.ts, lib/validators.ts, lib/utils.ts  │
│  lib/config/*, lib/supabase.ts,                 │
│  lib/supabase-server.ts, lib/ffmpeg-engine.ts   │
│  No importa de ninguna otra capa                │
└─────────────────────────────────────────────────┘
```

---

## Reglas de importación (CRÍTICAS)

### Prohibiciones absolutas

Estos imports **nunca** deben existir después de la refactorización:

| Desde | No puede importar |
|---|---|
| `components/*` | `@/lib/supabase`, `@/lib/supabase-server`, `@/lib/ffmpeg-engine` |
| `app/api/*` | `@/lib/supabase`, `@/lib/supabase-server` directamente |
| `lib/hooks/*` | `@/lib/supabase`, `@/lib/supabase-server`, `@/lib/ffmpeg-engine` (usar `video-compression-runtime` en su lugar) |

### Quién importa las implementaciones concretas

Solo estos archivos pueden importar módulos de infraestructura:

| Módulo de infraestructura | Quién lo importa |
|---|---|
| `@/lib/supabase` | `supabase-storage.ts` (browser) |
| `@/lib/supabase-server` | `supabase-post-repository.ts`, `supabase-newsletter-repository.ts` |
| `@/lib/ffmpeg-engine` | `ffmpeg-compressor.ts`, `video-compression-runtime.ts` |

### Dónde se instancian las implementaciones

Las implementaciones concretas se instancian en el **punto de entrada** (route handler o page), no dentro de hooks ni componentes.

**API routes**: instancian repositorios y servicios directamente.

```typescript
// api/posts/route.ts
import { createSupabasePostRepository } from "@/lib/repositories/supabase-post-repository";

export async function GET() {
  const repo = createSupabasePostRepository();
  const posts = await repo.findAll();
  return NextResponse.json(posts);
}
```

**Hooks**: reciben servicios como parámetros o los instancian internamente usando factory functions que devuelven la interfaz.

```typescript
// lib/hooks/use-video-upload.ts
import { createFFmpegCompressor } from "@/lib/services/ffmpeg-compressor";
import { createBrowserStorageService } from "@/lib/services/supabase-storage-browser";
import { preloadCompressionRuntime, onCompressionRuntimeStateChange } from "@/lib/services/video-compression-runtime";
import type { VideoCompressor } from "@/lib/services/compression";
import type { StorageService } from "@/lib/services/storage";
```

> Nota: En los hooks, la instanciación de implementaciones concretas es aceptable
> porque los hooks son el "composition root" del lado client. Lo importante es que
> los componentes de UI nunca ven las implementaciones.

---

## Flujo de datos — Crear post con video

```
Usuario arrastra video
        │
        ▼
VideoUploader.tsx (UI)
  └─ llama useVideoUpload().processFile(file)
        │
        ▼
use-video-upload.ts (Hook)
  ├─ precarga/suscribe vía video-compression-runtime → ffmpeg-engine
  ├─ llama VideoCompressor.compress(file)
  │       │
  │       ▼
  │   ffmpeg-compressor.ts → ffmpeg-engine.ts (WASM)
  │       │
  │       ▼ blob comprimido
  │
  ├─ llama StorageService.upload(blob, fileName)
  │       │
  │       ▼
  │   supabase-storage-browser.ts → supabase.ts (browser client)
  │       │
  │       ▼ publicUrl
  │
  └─ retorna publicUrl al componente vía estado del hook
        │
        ▼
PostForm.tsx recibe URL, la incluye en el body del POST
        │
        ▼
api/posts/route.ts
  └─ PostRepository.create(data)
        │
        ▼
supabase-post-repository.ts → supabase-server.ts
```

---

## Flujo de datos — Eliminar post

```
Admin hace clic en "Eliminar"
        │
        ▼
admin/page.tsx
  └─ fetch DELETE /api/posts/{id}
        │
        ▼
api/posts/[id]/route.ts
  ├─ PostRepository.getMediaUrls(id)
  │       │ → { video_url, thumbnail_url }
  │
  ├─ StorageService.remove([videoPath, thumbPath])
  │       │
  │       ▼
  │   supabase-storage.ts → elimina de bucket
  │
  └─ PostRepository.delete(id)
        │
        ▼
supabase-post-repository.ts → DELETE FROM posts
```
