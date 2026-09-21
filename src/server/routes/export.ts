import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { requireAuth } from './auth';

const exportRoutes = new Hono<AppEnv>();
exportRoutes.use('*', requireAuth);

async function fetchAll<T>(db: D1Database, sql: string, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { results } = await db.prepare(`${sql} LIMIT ${pageSize} OFFSET ${offset}`).all<T>();
    out.push(...results);
    if (results.length < pageSize) break;
  }
  return out;
}

exportRoutes.get('/', async (c) => {
  const [clients, movements, products] = await Promise.all([
    fetchAll(c.env.DB, `SELECT * FROM clients ORDER BY name COLLATE NOCASE`),
    fetchAll(c.env.DB, `SELECT * FROM movements ORDER BY occurred_at, created_at`),
    fetchAll(c.env.DB, `SELECT * FROM products ORDER BY sort_order, name COLLATE NOCASE`),
  ]);

  return c.json({
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      totalClients: clients.length,
      totalMovements: movements.length,
      totalProducts: products.length,
    },
    clients,
    movements,
    products,
  });
});

export default exportRoutes;
