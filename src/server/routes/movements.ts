import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { requireAuth } from './auth';
import { logActivity } from '../log';

const movements = new Hono<AppEnv>();
movements.use('*', requireAuth);

movements.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id, client_id, type, amount, description FROM movements WHERE id = ?`
  )
    .bind(id)
    .first<{ id: string; client_id: string; type: string; amount: number; description: string | null }>();

  if (!existing) return c.json({ error: 'Movimiento no encontrado' }, 404);

  await c.env.DB.prepare(`DELETE FROM movements WHERE id = ?`).bind(id).run();

  await logActivity(c.env.DB, {
    type: 'MOVEMENT_DELETE',
    entity: 'movements',
    entityId: id,
    details: existing,
  });

  const row = await c.env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) AS balance FROM movements WHERE client_id = ?`)
    .bind(existing.client_id)
    .first<{ balance: number }>();
  return c.json({ ok: true, balance: row?.balance ?? 0 });
});

export default movements;
