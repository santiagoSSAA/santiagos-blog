# Santiago's Blog

Blog personal de un solo founder. Publicación de posts con video comprimido, newsletter y panel de administración.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Estilos**: Tailwind CSS 3 + dark mode
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Video**: FFmpeg WASM — compresión client-side a 720p
- **Imágenes**: Compresión a WebP client-side
- **Analytics**: Vercel Analytics
- **Validación**: Zod
- **Deploy**: Vercel

## Funcionalidades

- Blog público con Markdown (react-markdown + remark-gfm)
- Subida de video con compresión automática a 720p (FFmpeg WASM precargado)
- Subida de miniaturas con compresión a WebP
- Panel de administración protegido (`/admin`)
- Newsletter con suscripción y protección contra duplicados
- Eliminación física de archivos en Supabase Storage al borrar posts
- Dark/light mode con persistencia
- SEO con Open Graph metadata
- Middleware de autenticación centralizado
- Rate limiting en newsletter API

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── newsletter/route.ts    # POST newsletter signup
│   │   └── posts/
│   │       ├── route.ts           # GET list, POST create
│   │       └── [id]/route.ts      # GET, PUT, DELETE + storage cleanup
│   ├── admin/                     # Panel protegido
│   │   ├── layout.tsx             # Sidebar + auth guard
│   │   ├── login/page.tsx
│   │   ├── page.tsx               # Dashboard
│   │   ├── new/page.tsx
│   │   └── edit/[id]/page.tsx
│   ├── blog/
│   │   ├── page.tsx               # Listado
│   │   └── [slug]/page.tsx        # Post individual
│   ├── about/page.tsx
│   ├── page.tsx                   # Home
│   └── layout.tsx                 # Root layout
├── components/
│   ├── PostForm.tsx               # Formulario compartido (create/edit)
│   ├── VideoUploader.tsx          # Upload + compresión FFmpeg
│   ├── ThumbnailUploader.tsx      # Upload + compresión WebP
│   ├── NewsletterForm.tsx
│   ├── PostCard.tsx
│   ├── VideoPlayer.tsx
│   ├── Header.tsx / Footer.tsx
│   └── ThemeProvider.tsx / ThemeToggle.tsx
├── lib/
│   ├── supabase.ts                # Cliente browser (singleton)
│   ├── supabase-server.ts         # Cliente server
│   ├── types.ts                   # Interfaces Post, NewsletterSubscriber
│   ├── utils.ts                   # cn, formatDate, generateSlug, extractStoragePath
│   └── validators.ts              # Zod schemas
└── middleware.ts                   # Auth middleware para /admin y /api/posts
```

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd santiagos-blog
npm install
```

### 2. Configurar Supabase

Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta el schema:

```bash
# Copia el contenido de supabase-schema.sql en el SQL Editor de Supabase
```

Crea un usuario de autenticación en Supabase Dashboard > Authentication > Users.

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Panel admin en [http://localhost:3000/admin](http://localhost:3000/admin).

## Deploy en Vercel

1. Conecta el repo en [vercel.com](https://vercel.com)
2. Agrega las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Deploy automático en cada push

## Compresión de video

El componente `VideoUploader` usa FFmpeg WASM para comprimir videos en el navegador:

- Pre-carga FFmpeg al montar el componente (singleton, ~30MB solo la primera vez)
- Comprime a 720p con H.264, CRF 28
- Requiere `SharedArrayBuffer` (Chrome/Firefox con headers COEP/COOP)
- Los headers están configurados solo para `/admin/*` en `next.config.js`
- No permite subir videos sin comprimir

## Notas

- **Rate limiting**: El rate limiting del newsletter es in-memory. En Vercel serverless se resetea por cold start. Para producción considerar Upstash Redis.
- **Storage**: Videos y miniaturas se almacenan en un solo bucket de Supabase (`videos`) con subcarpetas `videos/` y `thumbnails/`.
- **RLS**: Row Level Security habilitado. Posts públicos solo si `published = true`. Storage público para lectura, escritura solo autenticados.

## Licencia

Uso personal.
