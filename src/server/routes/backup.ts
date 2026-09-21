import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { requireAuth } from './auth';
import { runScheduledBackup } from '../backup';

const backupRoutes = new Hono<AppEnv>();
backupRoutes.use('*', requireAuth);

backupRoutes.post('/run', async (c) => {
  await runScheduledBackup(c.env);
  return c.json({ ok: true, at: new Date().toISOString() });
});

backupRoutes.get('/latest', async (c) => {
  const value = await c.env.BACKUPS.get('latest.json');
  if (!value) return c.json({ error: 'Todavía no hay respaldo' }, 404);
  return c.body(value, 200, { 'Content-Type': 'application/json' });
});

export default backupRoutes;
