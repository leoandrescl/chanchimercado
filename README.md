# ChanchiMercado

Libreta de fiados y catálogo público para un comercio de comida.
Versión 2, pensada para ser **simple y confiable**, corriendo 100% en Cloudflare.

**Demo/temporal:** https://chanchimercado.leoandrescl.workers.dev (pendiente de deploy)

## Stack

- **Cloudflare Workers** (runtime + static assets)
- **Hono** (API)
- **Cloudflare D1** (SQLite)
- **Cloudflare R2** (fotos de productos)
- **React 19 + Vite + Tailwind v4** (SPA + PWA)

## Idea central: el saldo se calcula, no se guarda

```
saldo(cliente) = SUM(movements.amount)     // compra = +, abono = −
```

Cada operación es **un solo INSERT atómico**, así que el saldo no puede
desincronizarse. El abono se valida contra la deuda en la misma sentencia SQL.
No existen `balance`, `remaining_amount`, `is_paid` ni triggers.

## Desarrollo

```bash
npm install
cp .dev.vars.example .dev.vars      # APP_PIN y SESSION_SECRET
npm run db:migrate:local            # crea el esquema en D1 local
npm run dev                         # http://localhost:5173
```

Generar datos de ejemplo/migración (opcional, requiere el respaldo):

```bash
npm run seed:generate -- <carpeta-respaldo>
npm run db:seed:local
```

## Deploy

```bash
npx wrangler login
npx wrangler d1 create chanchimercado          # copia el database_id a wrangler.jsonc
npx wrangler r2 bucket create chanchimercado-images
npx wrangler secret put APP_PIN
npx wrangler secret put SESSION_SECRET
npm run db:migrate:remote
npm run deploy
```

## Estructura

```
src/server/     API Hono (auth, clients, movements, products, public, export, images)
src/client/     SPA React (páginas, componentes, api, whatsapp)
src/shared/     Tipos compartidos
migrations/     Esquema D1
migration/      Script de migración desde el respaldo Supabase
```

## Seguridad

- PIN verificado en el servidor (secreto del Worker), sesión en cookie HttpOnly firmada con HMAC.
- El catálogo público es lo único abierto; el resto requiere sesión.
- Los datos reales de clientes **no** se guardan en el repositorio.
