# Convenciones del codebase

> El código nuevo debe ser indistinguible del existente.
> Seguir estas convenciones en cada archivo creado o modificado.

---

## Idioma

- **Strings de UI** (placeholders, labels, mensajes de error visibles al usuario): en **español**.
- **Código** (variables, funciones, interfaces, tipos, comentarios técnicos): en **inglés**.
- **Mensajes de error internos** (logs, throw): en inglés.

Ejemplos del codebase actual:

```typescript
// Correcto — UI en español
setError("Solo se permiten archivos de video.");
placeholder="Breve descripción del post..."

// Correcto — código en inglés
function extractStoragePath(publicUrl: string): string | null {}
interface PostRepository {}
```

---

## Nombres de archivos

- **kebab-case** para todos los archivos en `lib/`: `rate-limiter.ts`, `supabase-storage.ts`, `use-video-upload.ts`
- **PascalCase** para componentes React en `components/`: `VideoUploader.tsx`, `PostForm.tsx`
- **camelCase** nunca se usa para nombres de archivo.

---

## Exports

- **Named exports** en todo `lib/`. Nunca `export default` en archivos de lib.
- **`export default`** solo en pages de Next.js (`page.tsx`, `layout.tsx`).
- **Factory functions** para instanciar servicios/repositorios: `createPostRepository()`, `createBrowserStorageService()`.

```typescript
// Correcto — lib/
export function createPostRepository(): PostRepository { ... }
export interface PostRepository { ... }

// Correcto — page
export default function AdminDashboard() { ... }
```

---

## "use client"

Solo en archivos que usan hooks de React (`useState`, `useEffect`, `useRef`, etc.) o APIs del browser.

| Ubicación | "use client" |
|---|---|
| `components/*.tsx` con estado/hooks | Sí |
| `lib/hooks/*.ts` | No (lo hereda del componente que lo importa) |
| `lib/services/*.ts` | No |
| `lib/repositories/*.ts` | No |
| `app/api/*/route.ts` | No (siempre server) |
| `app/**/page.tsx` con hooks | Sí |

---

## Tailwind CSS

- **Siempre** incluir variantes `dark:` en todo elemento visible.
- Patrón de colores: `zinc` como base, `emerald` para éxito, `red` para error, `amber` para warning.
- Bordes: `border-zinc-200 dark:border-zinc-800`
- Fondos: `bg-white dark:bg-zinc-900` para cards, `bg-zinc-50 dark:bg-zinc-950` para fondos de página.
- Texto: `text-zinc-900 dark:text-white` para headings, `text-zinc-500 dark:text-zinc-400` para texto secundario.
- Rounded: `rounded-lg` para inputs/botones, `rounded-xl` para cards/containers.

```typescript
// Patrón de clase recurrente para inputs
const inputClassName =
  "w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400";
```

---

## Error handling

### En componentes/hooks (client-side)

```typescript
try {
  // operación
} catch (err) {
  setError(err instanceof Error ? err.message : "Error desconocido");
  setState("error");
}
```

- Siempre verificar `instanceof Error` antes de acceder a `.message`.
- Fallback genérico en español para UI.

### En API routes (server-side)

```typescript
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

- Retornar siempre `{ error: string }` para errores.
- Retornar datos directamente (sin wrapper) para éxito.
- Status codes: 200 (OK), 201 (created), 400 (validación), 401 (no auth), 404 (not found), 429 (rate limit), 500 (server error).

---

## Supabase clients

### Browser (client-side)

```typescript
import { createClient } from "@/lib/supabase";
const supabase = createClient(); // singleton, se puede llamar múltiples veces
```

- Solo se usa dentro de implementaciones de servicios (`supabase-storage.ts`).
- Después de la refactorización, ningún componente lo importa directamente.

### Server (API routes)

```typescript
import { createServerSupabaseClient } from "@/lib/supabase-server";
const supabase = createServerSupabaseClient(); // nueva instancia por request
```

- Solo se usa dentro de implementaciones de repositorios (`supabase-post-repository.ts`, `supabase-newsletter-repository.ts`) y `createServerStorageService`.
- Después de la refactorización, ninguna API route lo importa directamente.

---

## Validación con Zod

- Los schemas viven en `src/lib/validators.ts`.
- Los API routes validan con `safeParse()`, nunca con `parse()` (no lanzar excepciones).
- Pattern de validación en routes:

```typescript
const parsed = SomeSchema.safeParse(body);
if (!parsed.success) {
  const message = parsed.error.issues.map((e) => e.message).join(", ");
  return NextResponse.json({ error: message }, { status: 400 });
}
// usar parsed.data
```

---

## Servicios y repositorios

### Pattern de factory function

Todos los servicios y repositorios se exponen como factory functions, no como clases:

```typescript
// Correcto
export function createPostRepository(): PostRepository {
  const supabase = createServerSupabaseClient();
  return {
    async findAll() { ... },
    async findById(id) { ... },
  };
}

// Incorrecto — no usar clases
export class SupabasePostRepository implements PostRepository { ... }
```

Razón: el codebase actual no usa clases en ningún lugar. Mantener consistencia.

### Interfaces separadas de implementaciones

- Interface en archivo propio: `post-repository.ts`
- Implementación en archivo propio: `supabase-post-repository.ts`
- Los consumidores solo importan la interface y la factory.

---

## Hooks personalizados

- Prefijo `use` en nombre de archivo y función: `use-video-upload.ts`, `useVideoUpload()`.
- Retornan un objeto (no un array) con propiedades nombradas.
- No incluyen `"use client"` — lo hereda el componente que los importa.
- Gestionan estado interno con `useState` y `useRef`.
- Exponen funciones estables con `useCallback`.

---

## Comentarios

- **NO** añadir comentarios que narren lo que el código hace ("// Importar el módulo", "// Crear el cliente").
- **SÍ** comentar decisiones no obvias, trade-offs o limitaciones.
- Los eslint-disable se mantienen donde ya existen (ej: `@typescript-eslint/no-explicit-any` en ffmpeg).

---

## Iconos

- Librería: `lucide-react`.
- Import individual por componente: `import { Loader2, Check } from "lucide-react"`.
- Tamaño por defecto: `className="h-4 w-4"` para botones, `size={24}` para estados.

---

## Estado de carga

Patrón consistente en toda la app:

```tsx
if (loading) {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}
```

---

## Estructura de API routes

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function METHOD(request: NextRequest) {
  // 1. Validar input
  // 2. Llamar repositorio/servicio
  // 3. Retornar respuesta
}
```

- Nunca lógica de negocio compleja inline.
- Nunca instanciar Supabase directamente (después de refactorización).
- Un solo handler por método HTTP.
