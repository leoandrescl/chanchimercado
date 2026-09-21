# Pasar a producción (chanchimercado.cl)

La app ya está desplegada y funcionando en:
`https://chanchimercado.leoandrescl.workers.dev`

Falta hacer el **último traspaso de datos** el día del cambio y luego apuntar el dominio.

> ⚠️ **Lo más importante:** mientras la dueña siga usando Supabase, se crean movimientos
> nuevos que NO están en D1. Antes de cambiar los DNS hay que **re-sincronizar** (paso 1)
> o se perderían los fiados/abonos de esos días.

---

## 1. Re-sincronizar datos (el día del cambio)

Requiere las credenciales de Supabase (no se guardan en el repositorio):

```powershell
$env:SUPABASE_URL="https://<proyecto>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# 1. Exportar los datos vivos
node migration/export-supabase.mjs migration/out

# 2. Generar el SQL (clientes, movimientos con reconciliación, productos)
node migration/generate-seed.mjs migration/out

# 3. Borrar y recargar la base en D1
npx wrangler d1 execute chanchimercado --remote --command "DELETE FROM movements; DELETE FROM clients; DELETE FROM products;"
npx wrangler d1 execute chanchimercado --remote --file=./seed/seed.sql

# 4. Imágenes (solo si cambiaron)
node migration/upload-images.mjs seed/product-images.json migration/out/images
npx wrangler d1 execute chanchimercado --remote --file=./seed/images-update.sql
```

## 2. Verificar

```powershell
npx wrangler d1 execute chanchimercado --remote --json --command "SELECT (SELECT COUNT(*) FROM clients) c, (SELECT COUNT(*) FROM movements) m, (SELECT SUM(amount) FROM movements) total;"
```

- `total` debe coincidir con la suma de saldos de Supabase.
- Entrar a la URL, pedir el PIN y revisar 2-3 clientes.

## 3. Apuntar el dominio

1. En **nic.cl**: cambiar los DNS a los *nameservers* que da Cloudflare al agregar el sitio
   (ej. `xxx.ns.cloudflare.com`).
2. En el dashboard de Cloudflare → **Workers & Pages → chanchimercado → Settings → Domains & Routes**
   → **Add custom domain** → `chanchimercado.cl` (y `www.chanchimercado.cl`).
3. Esperar propagación. Cloudflare emite el certificado automáticamente.

## 4. Después del cambio

- Verificar en el celular: login, libreta, un abono y un fiado de prueba (crear y borrar).
- Mantener Supabase intacto unos días como respaldo.
- El respaldo automático diario queda en KV (`chanchimercado-backups`) + D1 Time Travel (7 días).

## Notas de seguridad

- El PIN (`APP_PIN`) y `SESSION_SECRET` son secretos del Worker:
  `npx wrangler secret put APP_PIN`.
- Login limitado a 10 intentos por minuto por ubicación (rate limiting).
- La sesión es una cookie HttpOnly firmada; expira a los 30 días.
