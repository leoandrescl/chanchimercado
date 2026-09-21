import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { requireAuth } from './auth';
import { collectBackup } from '../backup';

const exportRoutes = new Hono<AppEnv>();
exportRoutes.use('*', requireAuth);

exportRoutes.get('/', async (c) => {
  const data = await collectBackup(c.env);
  return c.json(data);
});

export default exportRoutes;
