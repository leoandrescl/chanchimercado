import { Hono } from 'hono';
import type { AppEnv } from './types';
import auth from './routes/auth';
import clients from './routes/clients';
import movements from './routes/movements';
import products from './routes/products';
import publicRoutes from './routes/public';
import exportRoutes from './routes/export';
import backupRoutes from './routes/backup';
import images from './routes/images';
import { runScheduledBackup } from './backup';

const app = new Hono<AppEnv>();

// Cabeceras de seguridad para todas las respuestas (paginas y API).
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
});

app.onError((err, c) => {
  console.error('Unhandled error', err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

app.get('/api/health', (c) => c.json({ ok: true, name: c.env.APP_NAME ?? 'ChanchiMercado' }));

app.route('/api/auth', auth);
app.route('/api/images', images);
app.route('/api/public', publicRoutes);
app.route('/api/clients', clients);
app.route('/api/movements', movements);
app.route('/api/products', products);
app.route('/api/export', exportRoutes);
app.route('/api/backup', backupRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'No encontrado' }, 404);
  return c.text('Not found', 404);
});

export default {
  fetch: (request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext) => app.fetch(request, env, ctx),
  scheduled: (_event: ScheduledController, env: AppEnv['Bindings'], ctx: ExecutionContext) => {
    ctx.waitUntil(runScheduledBackup(env));
  },
};
