# Análisis SOLID — Estado actual

> Este documento registra las violaciones SOLID detectadas en el codebase.
> Cada entrada incluye archivo, líneas, principio violado y severidad.
> Usar como referencia antes de modificar cualquier archivo.

## Escala de severidad

- **CUMPLE**: No requiere cambios.
- **MENOR**: Mejorable pero no bloquea.
- **MODERADA**: Causa problemas reales de mantenibilidad.
- **SEVERA**: Acoplamiento fuerte o múltiples responsabilidades mezcladas.

---

## S — Single Responsibility Principle

> "Cada módulo debe tener una sola razón para cambiar."

### `src/components/VideoUploader.tsx` — SEVERA

5 responsabilidades en 380 líneas:

| Responsabilidad | Líneas |
|---|---|
| Validación de archivo (tipo, tamaño) | 78-101 |
| Compresión FFmpeg (parámetros de codec) | 107-135 |
| Upload a Supabase Storage | 144-158 |
| Gestión de estado de UI (7 estados) | 36-47 |
| Renderizado condicional (6 vistas) | 229-377 |

Razones de cambio: cambiar storage, cambiar codec, cambiar validación, cambiar UI.

### `src/components/ThumbnailUploader.tsx` — SEVERA

Mismo patrón que VideoUploader. Además tiene `compressImage()` (líneas 29-58) embebida como función local — lógica pura de procesamiento de imágenes dentro de un componente de UI.

### `src/components/PostForm.tsx` — MODERADA

3 responsabilidades mezcladas:

| Responsabilidad | Líneas |
|---|---|
| Gestión de formulario (7 campos de estado) | 19-28 |
| Comunicación con API (fetch POST/PUT) | 61-98 |
| Eliminación de archivos de Storage | 42-47 |

`deleteFromStorage` instancia `createClient()` directamente. Un formulario no debería saber cómo eliminar archivos de Supabase Storage.

### `src/app/api/newsletter/route.ts` — MODERADA

Rate limiting (líneas 5-20) embebido junto con lógica de negocio (suscripción). La función `isRateLimited()` y el `Map` no son reutilizables por otras routes.

### `src/app/admin/layout.tsx` — MODERADA

3 responsabilidades: auth guard (28-52), precarga de FFmpeg (54-59), layout visual (83-156). La precarga de FFmpeg no es responsabilidad de un layout.

### Archivos que CUMPLEN SRP

| Archivo | Razón |
|---|---|
| `src/lib/ffmpeg-engine.ts` | Solo ciclo de vida de FFmpeg (singleton + observer) |
| `src/lib/validators.ts` | Solo schemas de validación |
| `src/lib/types.ts` | Solo interfaces |
| `src/lib/supabase.ts` | Solo cliente browser singleton |
| `src/lib/supabase-server.ts` | Solo cliente server |
| `src/components/PostCard.tsx` | Solo renderiza card |
| `src/components/NewsletterForm.tsx` | Solo UI de formulario |
| `src/components/Footer.tsx` | Solo renderiza footer |
| `src/middleware.ts` | Solo autenticación de rutas |
| `src/app/api/media/route.ts` | Solo proxy de media |

---

## O — Open/Closed Principle

> "Abierto a extensión, cerrado a modificación."

### `src/components/VideoUploader.tsx` — SEVERA

Parámetros de compresión hardcodeados en líneas 119-129:

```
-vf scale=-2:720
-c:v libx264
-crf 28
-preset fast
-c:a aac
-b:a 128k
```

Para cambiar resolución, codec, calidad o destino de upload hay que abrir y editar este archivo.

### `src/components/ThumbnailUploader.tsx` — MODERADA

`compressImage` tiene `maxWidth = 800` y `quality = 0.6` hardcodeados. Para cambiar formato de salida (WebP → AVIF) hay que modificar la función.

### `src/app/api/newsletter/route.ts` — MODERADA

Rate limiting con ventana de 60s y máximo 5 requests hardcodeados. Implementación in-memory sin posibilidad de sustituir por Redis sin reescribir.

### Archivos que CUMPLEN OCP

| Archivo | Razón |
|---|---|
| `src/lib/validators.ts` | Schemas Zod composables (`CreatePostSchema.partial()`) |
| `src/components/PostCard.tsx` | Extensible vía props |

---

## L — Liskov Substitution Principle

> "Los subtipos deben ser sustituibles por sus tipos base."

### `src/components/PostForm.tsx` — MENOR

`PostFormProps` permite `mode: "edit"` sin `initialData`, lo cual produce comportamiento incorrecto (formulario vacío en modo edición). TypeScript no lo detecta porque `initialData` es opcional siempre.

```typescript
// Actual (permite estado inválido)
interface PostFormProps {
  mode: "create" | "edit";
  initialData?: Post;
}

// Correcto (discriminated union)
type PostFormProps =
  | { mode: "create" }
  | { mode: "edit"; initialData: Post };
```

### Resto del proyecto — CUMPLE

No hay herencia ni polimorfismo. Los clientes Supabase (browser vs server) no pretenden ser intercambiables.

---

## I — Interface Segregation Principle

> "Ningún cliente debe depender de interfaces que no usa."

### `src/lib/types.ts` — MODERADA

La interfaz `Post` (11 campos) se usa completa en todos los consumidores, pero cada uno necesita un subconjunto diferente:

| Consumidor | Campos que realmente usa |
|---|---|
| `PostCard.tsx` | slug, title, excerpt, thumbnail_url, video_url, created_at |
| `admin/page.tsx` | id, title, slug, published, created_at |
| `PostForm.tsx` | todos |
| `DELETE handler` | video_url, thumbnail_url |

### Props de componentes — CUMPLE

`VideoUploaderProps`, `ThumbnailUploaderProps`, `PostCardProps` son interfaces mínimas.

---

## D — Dependency Inversion Principle

> "Los módulos de alto nivel no deben depender de módulos de bajo nivel. Ambos deben depender de abstracciones."

**Este es el principio más violado del proyecto.**

### `src/components/VideoUploader.tsx` — SEVERA

Importa directamente:
- `createClient` de `@/lib/supabase` (Supabase concreto)
- `getFFmpegInstance`, `getFetchFile` de `@/lib/ffmpeg-engine` (FFmpeg concreto)

Sabe que el bucket se llama `"videos"`, que el path es `videos/${Date.now()}-${file.name}`. Si cambias cualquier decisión de infraestructura, este componente se rompe.

### `src/components/ThumbnailUploader.tsx` — SEVERA

Importa `createClient` y `extractStoragePath` directamente. Instancia Supabase para upload y para delete.

### `src/components/PostForm.tsx` — MODERADA

Importa `createClient` para eliminar archivos de storage. Un formulario no debería conocer al proveedor de storage.

### Todas las API routes — MODERADA

`api/posts/route.ts`, `api/posts/[id]/route.ts` y `api/newsletter/route.ts` dependen directamente de `createServerSupabaseClient()`. No hay repository pattern ni service layer.

### `src/app/admin/layout.tsx` — MODERADA

Importa directamente `createClient` (Supabase Auth) y `preloadFFmpeg`/`onFFmpegStateChange` (FFmpeg engine).

---

## Resumen de calificaciones

| Principio | Nota | Problema principal |
|---|---|---|
| S — Single Responsibility | 4/10 | Uploaders mezclan UI + compresión + storage + validación |
| O — Open/Closed | 5/10 | Parámetros de compresión y storage hardcodeados |
| L — Liskov Substitution | 8/10 | Solo falta discriminated union en PostForm |
| I — Interface Segregation | 6/10 | Interfaz Post monolítica |
| D — Dependency Inversion | 3/10 | Acoplamiento directo a Supabase y FFmpeg en todos lados |
