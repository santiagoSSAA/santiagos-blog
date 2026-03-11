# Docker y smoke tests

## Requisitos

- Docker y Docker Compose v2
- `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (copiar desde `.env.example`)

## Producción local (imagen optimizada)

```bash
docker compose build app
docker compose up app
```

App en `http://localhost:3000`.

## Desarrollo local (hot reload)

Monta el código en un contenedor Node; `node_modules` en volumen para no pisar el del host.

```bash
npm run docker:dev
```

O:

```bash
docker compose -f docker-compose.dev.yml up
```

## Smoke tests

Con la app ya levantada (host o contenedor):

```bash
npm run smoke
```

Contra el contenedor `app` en la red de Compose:

```bash
docker compose up -d app
docker compose --profile smoke run --rm smoke
```

O en un solo flujo (sube app y ejecuta smoke; app queda en background):

```bash
docker compose up -d app && sleep 15 && docker compose --profile smoke run --rm smoke
```

Variables opcionales:

- `BASE_URL` — URL base (default `http://127.0.0.1:3000`)
- `SMOKE_ATTEMPTS` — reintentos antes de timeout (default 30)
- `SMOKE_SLEEP` — segundos entre intentos (default 2)

## Qué comprueba el smoke

- `GET /` → 200
- `GET /blog` → 200
- `GET /about` → 200
- `GET /admin/login` → 200
- `POST /api/newsletter` con `{}` → 400

## Build standalone

`next.config.js` usa `output: "standalone"` para que el `Dockerfile` copie solo `.next/standalone` y `.next/static`.
