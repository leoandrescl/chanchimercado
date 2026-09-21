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
