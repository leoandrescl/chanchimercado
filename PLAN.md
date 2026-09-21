# ChanchiMercado v2 — Plan de rediseño

Libreta de fiados + catálogo para un comercio de comida. Reemplaza `chanchi-mercado-pos`
(Next.js + Supabase en Vercel) por una app **simple, confiable y ordenada** en Cloudflare.

---

## 1. Objetivo

Que la dueña pueda, desde el celular y sin equivocarse:

1. Buscar/crear un cliente.
2. Agregar una **compra fiada** (carrito o monto libre).
3. Registrar un **abono** y que se descuente del total.
4. Ver la **libreta** (estado de cuenta) y enviarla por WhatsApp.

Manteniendo el **catálogo público** (poco usado) y el inventario.

## 2. Por qué falla la versión actual

- El saldo (`debtors.balance`) es un entero que se actualiza con *leer-modificar-escribir*
  desde la app: `balance = balance + x`. Dos operaciones simultáneas se pisan.
- No hay transacciones ni rollback: se inserta el movimiento y después se actualiza el saldo;
  si el segundo paso falla, quedan descuadres.
- Un **trigger legacy** de Supabase recalculaba el saldo desde `remaining_amount`, pisando el valor de la app.
- `remaining_amount` / `is_paid` quedan obsoletos (no hay asignación FIFO real).
- `Math.max(0, …)` oculta errores.
- Resultado medido hoy: **54 de 194 clientes** con saldo distinto a la suma de sus movimientos
  (diferencia global 140.290 CLP).

## 3. Principio de diseño: libro mayor (ledger)

**El saldo no se guarda: se calcula.**

```
saldo(cliente) = SUM(movimientos.amount)      -- compra = +, abono = −
```

- Cada operación es **un solo INSERT** → atómico, imposible desincronizar.
- Un abono es un movimiento negativo; nunca se "edita" el saldo.
- Validar "no abonar más que la deuda" en una sola sentencia SQL atómica.
- `remaining_amount`, `is_paid`, triggers y saldos flotantes **desaparecen**.

## 4. Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Runtime | **Cloudflare Workers** + Static Assets | Un solo despliegue, barato, rápido |
| API | **Hono** + TypeScript | Minimalista, nativo en Workers |
| Base de datos | **Cloudflare D1** (SQLite) | Gestionada, respaldos, SQL simple |
| Imágenes | **Cloudflare KV** | Almacén de fotos de productos |
| Frontend | **React 19 + Vite + Tailwind v4** | SPA rápida, PWA, sin SSR innecesario |
| Estado/datos | TanStack Query + fetch | Sin estado duplicado |
| Auth | PIN server-side + cookie firmada (HttpOnly) | El PIN deja de ser público |
| Validación | Zod | Contratos claros |
| Deploy | `wrangler deploy` | `chanchimercado.<account>.workers.dev` → luego `chanchimercado.cl` |

> Alternativa descartada: Next.js sobre Cloudflare (OpenNext). Agrega complejidad,
> cold starts y no se necesita SSR.

## 5. Modelo de datos (D1)

```sql
CREATE TABLE clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  note        TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE movements (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('purchase','payment','adjustment')),
  description  TEXT,
  amount       INTEGER NOT NULL,      -- + compra, − abono
  occurred_at  TEXT NOT NULL,         -- fecha del negocio
  created_at   TEXT NOT NULL
);

CREATE TABLE products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price           INTEGER NOT NULL DEFAULT 0,
  category        TEXT,
  image_key       TEXT,               -- objeto en Cloudflare KV
  is_visible      INTEGER NOT NULL DEFAULT 1,
  is_free_amount  INTEGER NOT NULL DEFAULT 0,  -- "Queso"/monto libre
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE orders (               -- catálogo público (opcional)
  id          TEXT PRIMARY KEY,
  client_name TEXT,
  phone       TEXT,
  items_json  TEXT NOT NULL,
  total       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'nuevo',
  created_at  TEXT NOT NULL
);

CREATE TABLE activity_log (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  details_json TEXT,
  created_at  TEXT NOT NULL
);
```

## 6. API (Hono)

```
POST   /api/auth/login           PIN → cookie de sesión
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/clients              lista + saldo calculado
POST   /api/clients
GET    /api/clients/:id          cliente + saldo + movimientos
PATCH  /api/clients/:id
DELETE /api/clients/:id          (cascade)

POST   /api/clients/:id/purchases   compra fiada (items o monto libre)
POST   /api/clients/:id/payments    abono  (valida <= deuda, atómico)
DELETE /api/movements/:id           deshace el efecto (borra el movimiento)

GET    /api/products
POST   /api/products             (+ subir imagen)
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/products/reorder

GET    /api/public/products      catálogo público (solo visibles)
POST   /api/public/orders        pedido del catálogo

GET    /api/export               respaldo JSON completo (paginado, sin límite)
```

## 7. Pantallas

- **Login PIN** (server-side).
- **Libreta / Inicio**: total global, buscador y lista de clientes con saldo.
- **Cliente**: saldo grande, botones **Abonar** y **Agregar fiado**, historial por mes, WhatsApp.
- **POS**: buscador de cliente, grilla de productos, carrito, checkout fiado.
- **Inventario**: CRUD de productos, precio, foto (KV), visibilidad, orden, "monto libre".
- **Catálogo público**: grilla + carrito + pedido por WhatsApp.
- **Ajustes**: respaldo JSON, acceso al catálogo, cerrar sesión.

## 8. Migración de datos

Transformación Supabase → D1 (`migration/generate-seed.mjs`):

1. `debtors` → `clients`.
2. `debts` → `movements` (amount > 0 → `purchase`, amount < 0 → `payment`).
3. `products` → `products`; imágenes → subir a KV y guardar `image_key`.
4. **Reconciliación**: se agrega a cada cliente un movimiento `adjustment` =
   `balance_actual − SUM(movimientos)`. Así el saldo calculado en v2 **coincide exactamente**
   con lo que la dueña ve hoy, sin perder el historial.
5. Verificación: `SUM(amount)` total = 1.582.900 CLP (igual al saldo original).

Fuente: respaldo en `C:\Proyectos\chanchi-backups\2026-09-21\` (10.060 movimientos,
194 clientes, 111 productos, 31 imágenes).

## 9. Seguridad

- PIN como **secreto del Worker**, verificado en servidor; cookie HttpOnly firmada (HMAC).
- Rutas admin protegidas por middleware; el catálogo público es lo único abierto.
- Sin credenciales en el repositorio. Wrangler usa `wrangler secret`.
- Los datos reales de clientes no se versionan.

## 10. Fases

| Fase | Entregable | Estado |
|---|---|---|
| 0 | Respaldo completo | hecho |
| 1 | Scaffold Vite+React+Hono+Tailwind+D1, auth, layout | hecho |
| 2 | Clientes CRUD + movimientos + abono + saldo | hecho |
| 3 | POS + productos/inventario + imágenes KV | hecho |
| 4 | Catálogo público + WhatsApp + respaldo | hecho |
| 5 | Migración y carga de datos reales en D1 | hecho |
| 6 | Deploy a Workers (URL temporal) | en curso |
