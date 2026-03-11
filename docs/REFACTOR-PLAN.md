# Plan de refactorización SOLID

> Plan de 6 fases secuenciales. Cada fase construye sobre la anterior.
> Marcar checkboxes conforme se completa cada paso.
> Si se interrumpe la sesión, leer este documento para saber dónde retomar.

---

## Fase 0 — Preparación

**Objetivo**: Punto de partida seguro.

- [x] Verificar que `npm run build` compila sin errores
- [x] Crear branch `refactor/solid`
- [x] Commit del estado actual

**Criterio de avance**: Build limpio, branch creado.

---

## Fase 1 — Tipos e interfaces (ISP + LSP)

**Objetivo**: Segregar la interfaz `Post` monolítica y corregir `PostFormProps`.

**Principios que mejora**: ISP, LSP.

**Referencia**: `docs/CONTRACTS.md` → sección "Tipos segregados".

### Pasos

- [x] **1.1** Modificar `src/lib/types.ts`: definir `PostSummary`, `PostAdmin`, `Post` (jerárquicos)
- [x] **1.2** Actualizar `src/components/PostCard.tsx`: cambiar tipo de props de `Post` a `PostSummary`
- [x] **1.3** Actualizar `src/app/admin/page.tsx`: cambiar tipo de state de `Post[]` a `PostAdmin[]`
- [x] **1.4** Aplicar discriminated union en `src/components/PostForm.tsx` para `PostFormProps`
- [x] **1.5** Ajustar `src/app/admin/edit/[id]/page.tsx` para que pase props compatibles con el nuevo tipo
- [x] **1.6** Verificar build: `npm run build`

**Archivos modificados**: `types.ts`, `PostCard.tsx`, `admin/page.tsx`, `PostForm.tsx`, `edit/[id]/page.tsx`

**Criterio de avance**: Build compila. No existe `Post` donde debería ser `PostSummary` o `PostAdmin`.

---

## Fase 2 — Abstracciones de servicios (DIP)

**Objetivo**: Crear interfaces y sus implementaciones concretas. Ningún consumidor se modifica todavía.

**Principio que mejora**: DIP.

**Referencia**: `docs/CONTRACTS.md` → secciones StorageService, VideoCompressor, ImageCompressor, RateLimiter.

### Pasos

- [ ] **2.1** Crear `src/lib/services/storage.ts` (interface `StorageService`)
- [ ] **2.2** Crear `src/lib/services/supabase-storage.ts` (`createBrowserStorageService` + `createServerStorageService`)
- [ ] **2.3** Crear `src/lib/services/compression.ts` (interfaces `VideoCompressor`, `ImageCompressor` + tipos de config)
- [ ] **2.4** Crear `src/lib/services/ffmpeg-compressor.ts` (`createFFmpegCompressor`)
- [ ] **2.5** Crear `src/lib/services/canvas-image-compressor.ts` (`createCanvasImageCompressor`)
- [ ] **2.6** Crear `src/lib/services/rate-limiter.ts` (interface `RateLimiter` + `createInMemoryRateLimiter`)
- [ ] **2.7** Verificar build: `npm run build`

**Archivos creados**: 6 archivos nuevos en `src/lib/services/`

**Archivos modificados**: ninguno

**Criterio de avance**: Todos los archivos de `services/` existen y exportan correctamente. Build compila. Ningún consumidor los usa todavía.

---

## Fase 3 — Repository pattern (DIP + SRP)

**Objetivo**: Capa de acceso a datos que desacopla las API routes de Supabase.

**Principios que mejora**: DIP, SRP.

**Referencia**: `docs/CONTRACTS.md` → secciones PostRepository, NewsletterRepository.

### Pasos

- [ ] **3.1** Crear `src/lib/repositories/post-repository.ts` (interface `PostRepository`)
- [ ] **3.2** Crear `src/lib/repositories/supabase-post-repository.ts` (`createPostRepository`)
- [ ] **3.3** Crear `src/lib/repositories/newsletter-repository.ts` (interface `NewsletterRepository`)
- [ ] **3.4** Crear `src/lib/repositories/supabase-newsletter-repository.ts` (`createNewsletterRepository`)
- [ ] **3.5** Verificar build: `npm run build`

**Archivos creados**: 4 archivos nuevos en `src/lib/repositories/`

**Archivos modificados**: ninguno

**Criterio de avance**: Repositorios creados y exportando. Build compila. Ningún consumidor los usa todavía.

---

## Fase 4 — Hooks de upload (SRP)

**Objetivo**: Hooks que orquestan compresión + upload. Los componentes de UI solo se preocuparán por renderizar.

**Principio que mejora**: SRP.

**Referencia**: `docs/CONTRACTS.md` → sección Hooks.

### Pasos

- [ ] **4.1** Crear `src/lib/config/compression.ts` (VIDEO_DEFAULTS, IMAGE_DEFAULTS, MAX_SIZES)
- [ ] **4.2** Crear `src/lib/config/rate-limit.ts` (NEWSLETTER_RATE_LIMIT)
- [ ] **4.3** Crear `src/lib/hooks/use-video-upload.ts`
- [ ] **4.4** Crear `src/lib/hooks/use-thumbnail-upload.ts`
- [ ] **4.5** Verificar build: `npm run build`

**Archivos creados**: 4 archivos nuevos

**Archivos modificados**: ninguno

**Criterio de avance**: Hooks creados y exportando. Build compila. Ningún componente los usa todavía.

---

## Fase 5 — Reconectar consumidores (SRP + DIP)

**Objetivo**: Reemplazar dependencias directas en componentes y routes por las abstracciones.

**Principios que mejora**: SRP, DIP.

**Referencia**: `docs/ARCHITECTURE.md` → sección "Reglas de importación".

### Pasos

- [ ] **5.1** Refactorizar `src/components/VideoUploader.tsx`: eliminar imports de supabase y ffmpeg-engine, usar `useVideoUpload`. Solo UI.
- [ ] **5.2** Refactorizar `src/components/ThumbnailUploader.tsx`: eliminar `compressImage` embebida, eliminar imports de supabase, usar `useThumbnailUpload`. Solo UI.
- [ ] **5.3** Refactorizar `src/components/PostForm.tsx`: eliminar `deleteFromStorage` y import de `createClient`. Mover eliminación de storage a una callback prop o al hook.
- [ ] **5.4** Refactorizar `src/app/api/posts/route.ts`: usar `createPostRepository()` en vez de Supabase directo.
- [ ] **5.5** Refactorizar `src/app/api/posts/[id]/route.ts`: usar `createPostRepository()` + `createServerStorageService()`.
- [ ] **5.6** Refactorizar `src/app/api/newsletter/route.ts`: usar `createInMemoryRateLimiter()` + `createNewsletterRepository()`.
- [ ] **5.7** Refactorizar `src/app/admin/layout.tsx`: extraer precarga de FFmpeg a un pattern más limpio (el hook ya gestiona la precarga).
- [ ] **5.8** Limpiar `src/lib/utils.ts`: eliminar `extractStoragePath` (ahora vive en `StorageService.extractPath`). Mantener `proxyUrl` si aún se usa.
- [ ] **5.9** Verificar build: `npm run build`
- [ ] **5.10** Verificar reglas de importación: ningún archivo en `components/` importa de `@/lib/supabase` ni `@/lib/ffmpeg-engine`.

**Archivos modificados**: 8 archivos

**Archivos creados**: ninguno

**Criterio de avance**: Build compila. Ningún componente importa Supabase ni FFmpeg directamente. Las API routes usan repositorios.

---

## Fase 6 — Verificación final

**Objetivo**: Confirmar que la arquitectura es correcta y todo funciona.

- [ ] **6.1** Verificar build limpio: `npm run build`
- [ ] **6.2** Verificar reglas de importación (grep por imports prohibidos):
  - `grep -r "from.*@/lib/supabase" src/components/` → debe retornar vacío
  - `grep -r "from.*@/lib/ffmpeg-engine" src/components/` → debe retornar vacío
  - `grep -r "from.*@/lib/supabase" src/app/api/` → debe retornar vacío (solo los repos lo usan)
- [ ] **6.3** Verificar que la app funciona en dev: `npm run dev`
- [ ] **6.4** Commit final en branch `refactor/solid`

**Criterio de avance**: Build limpio, imports correctos, app funcional.

---

## Resumen de archivos

### Archivos nuevos (14)

| Archivo | Fase |
|---|---|
| `src/lib/services/storage.ts` | 2 |
| `src/lib/services/supabase-storage.ts` | 2 |
| `src/lib/services/compression.ts` | 2 |
| `src/lib/services/ffmpeg-compressor.ts` | 2 |
| `src/lib/services/canvas-image-compressor.ts` | 2 |
| `src/lib/services/rate-limiter.ts` | 2 |
| `src/lib/repositories/post-repository.ts` | 3 |
| `src/lib/repositories/supabase-post-repository.ts` | 3 |
| `src/lib/repositories/newsletter-repository.ts` | 3 |
| `src/lib/repositories/supabase-newsletter-repository.ts` | 3 |
| `src/lib/config/compression.ts` | 4 |
| `src/lib/config/rate-limit.ts` | 4 |
| `src/lib/hooks/use-video-upload.ts` | 4 |
| `src/lib/hooks/use-thumbnail-upload.ts` | 4 |

### Archivos modificados (8)

| Archivo | Fase | Cambio |
|---|---|---|
| `src/lib/types.ts` | 1 | Segregar en PostSummary/PostAdmin/Post |
| `src/components/PostCard.tsx` | 1 | Tipo → PostSummary |
| `src/app/admin/page.tsx` | 1 | Tipo → PostAdmin |
| `src/components/PostForm.tsx` | 1, 5 | Discriminated union + eliminar Supabase |
| `src/components/VideoUploader.tsx` | 5 | Reescribir como UI pura con useVideoUpload |
| `src/components/ThumbnailUploader.tsx` | 5 | Reescribir como UI pura con useThumbnailUpload |
| `src/app/api/posts/route.ts` | 5 | Usar PostRepository |
| `src/app/api/posts/[id]/route.ts` | 5 | Usar PostRepository + StorageService |
| `src/app/api/newsletter/route.ts` | 5 | Usar RateLimiter + NewsletterRepository |
| `src/app/admin/layout.tsx` | 5 | Simplificar FFmpeg preload |
| `src/lib/utils.ts` | 5 | Eliminar extractStoragePath |

### Archivos que NO se tocan

| Archivo | Razón |
|---|---|
| `src/lib/supabase.ts` | Ya cumple SRP, solo lo importan implementations |
| `src/lib/supabase-server.ts` | Ya cumple SRP, solo lo importan implementations |
| `src/lib/ffmpeg-engine.ts` | Ya cumple SRP, solo lo importa ffmpeg-compressor |
| `src/lib/validators.ts` | Ya cumple todos los principios |
| `src/components/NewsletterForm.tsx` | Solo UI, ya cumple SRP |
| `src/components/Footer.tsx` | Solo renderiza |
| `src/middleware.ts` | Ya cumple SRP |
| `src/app/api/media/route.ts` | Ya cumple todos los principios |
| `src/app/admin/new/page.tsx` | Wrapper simple |
