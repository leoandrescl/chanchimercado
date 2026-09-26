import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from './auth';
import { logActivity } from '../log';

const clients = new Hono<AppEnv>();
clients.use('*', requireAuth);

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
  balance: number | null;
};

type MovementRow = {
  id: string;
  client_id: string;
  type: 'purchase' | 'payment' | 'adjustment';
  description: string | null;
  amount: number;
  occurred_at: string;
  created_at: string;
};

const nowIso = () => new Date().toISOString();

const createSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  phone: z.string().trim().max(30).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
  archived: z.boolean().optional(),
});

const purchaseSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        price: z.number().int().nonnegative(),
      })
    )
    .optional(),
  amount: z.number().int().positive().optional(),
  description: z.string().trim().max(300).optional(),
  occurred_at: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.number().int().positive('El abono debe ser mayor a cero'),
  note: z.string().trim().max(300).optional(),
  occurred_at: z.string().optional(),
});

function buildPurchaseDescription(items: { name: string; quantity: number }[]): string {
  const text = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function normalizeOccurredAt(value?: string): string {
  if (!value) return nowIso();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? nowIso() : d.toISOString();
}

clients.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim();
  const includeArchived = c.req.query('archived') === '1';
  const filters: string[] = [];
  const binds: unknown[] = [];
  if (!includeArchived) filters.push('c.archived = 0');
  if (q) {
    filters.push('(c.name LIKE ? OR c.phone LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.phone, c.note, c.archived, c.created_at, c.updated_at,
            COALESCE(SUM(m.amount), 0) AS balance
       FROM clients c
       LEFT JOIN movements m ON m.client_id = c.id
       ${where}
      GROUP BY c.id
      ORDER BY c.name COLLATE NOCASE`
  )
    .bind(...binds)
    .all<ClientRow>();

  return c.json({ clients: results.map((r) => ({ ...r, balance: r.balance ?? 0 })) });
});

clients.post('/', async (c) => {
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, 400);

  const { name, phone, note } = parsed.data;
  const id = crypto.randomUUID();
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO clients (id, name, phone, note, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  )
    .bind(id, name, phone ?? null, note ?? null, ts, ts)
    .run();

  await logActivity(c.env.DB, { type: 'CLIENT_CREATE', entity: 'clients', entityId: id, details: { name } });
  return c.json({ client: { id, name, phone: phone ?? null, note: note ?? null, archived: 0, balance: 0, created_at: ts, updated_at: ts } }, 201);
});

clients.get('/:id', async (c) => {
  const id = c.req.param('id');
  const client = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.phone, c.note, c.archived, c.created_at, c.updated_at,
            COALESCE(SUM(m.amount), 0) AS balance
       FROM clients c
       LEFT JOIN movements m ON m.client_id = c.id
      WHERE c.id = ?
      GROUP BY c.id`
  )
    .bind(id)
    .first<ClientRow>();
  if (!client) return c.json({ error: 'Cliente no encontrado' }, 404);

  const { results: movements } = await c.env.DB.prepare(
    `SELECT id, client_id, type, description, amount, occurred_at, created_at
       FROM movements WHERE client_id = ?
      ORDER BY occurred_at DESC, created_at DESC`
  )
    .bind(id)
    .all<MovementRow>();

  const totals = movements.reduce(
    (acc, m) => {
      if (m.amount > 0) acc.purchases += m.amount;
      else acc.payments += -m.amount;
      return acc;
    },
    { purchases: 0, payments: 0 }
  );

  return c.json({ client: { ...client, balance: client.balance ?? 0 }, movements, totals });
});

clients.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const parsed = updateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, 400);

  const existing = await c.env.DB.prepare(`SELECT id FROM clients WHERE id = ?`).bind(id).first();
  if (!existing) return c.json({ error: 'Cliente no encontrado' }, 404);

  const fields: string[] = [];
  const binds: unknown[] = [];
  const data = parsed.data;
  if (data.name !== undefined) {
    fields.push('name = ?');
    binds.push(data.name);
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?');
    binds.push(data.phone || null);
  }
  if (data.note !== undefined) {
    fields.push('note = ?');
    binds.push(data.note || null);
  }
  if (data.archived !== undefined) {
    fields.push('archived = ?');
    binds.push(data.archived ? 1 : 0);
  }
  if (!fields.length) return c.json({ ok: true });

  fields.push('updated_at = ?');
  binds.push(nowIso(), id);
  await c.env.DB.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  await logActivity(c.env.DB, { type: 'CLIENT_UPDATE', entity: 'clients', entityId: id, details: data });
  return c.json({ ok: true });
});

clients.delete('/:id/movements', async (c) => {
  const id = c.req.param('id');
  const client = await c.env.DB.prepare(`SELECT name FROM clients WHERE id = ?`).bind(id).first<{ name: string }>();
  if (!client) return c.json({ error: 'Cliente no encontrado' }, 404);

  const stats = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS balance FROM movements WHERE client_id = ?`
  )
    .bind(id)
    .first<{ count: number; balance: number }>();

  const count = stats?.count ?? 0;
  if (count > 0) {
    await c.env.DB.prepare(`DELETE FROM movements WHERE client_id = ?`).bind(id).run();
    await logActivity(c.env.DB, {
      type: 'CLIENT_HISTORY_CLEAR',
      entity: 'movements',
      entityId: id,
      details: { clientId: id, name: client.name, deletedCount: count, erasedBalance: stats?.balance ?? 0 },
    });
  }
  return c.json({ ok: true, deleted: count, balance: 0 });
});

clients.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(`SELECT name FROM clients WHERE id = ?`).bind(id).first<{ name: string }>();
  if (!existing) return c.json({ error: 'Cliente no encontrado' }, 404);

  await c.env.DB.prepare(`DELETE FROM clients WHERE id = ?`).bind(id).run();
  await logActivity(c.env.DB, {
    type: 'CLIENT_DELETE',
    entity: 'clients',
    entityId: id,
    details: { name: existing.name },
  });
  return c.json({ ok: true });
});

clients.post('/:id/purchases', async (c) => {
  const id = c.req.param('id');
  const parsed = purchaseSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, 400);

  const client = await c.env.DB.prepare(`SELECT name FROM clients WHERE id = ?`).bind(id).first();
  if (!client) return c.json({ error: 'Cliente no encontrado' }, 404);

  const { items, amount, description, occurred_at } = parsed.data;
  const total = items?.length ? items.reduce((s, i) => s + i.price * i.quantity, 0) : (amount ?? 0);
  if (total <= 0) return c.json({ error: 'El monto de la compra debe ser mayor a cero' }, 400);

  const desc = items?.length
    ? `Compra: ${buildPurchaseDescription(items)}`
    : `Compra: ${description || 'monto libre'}`;

  const movementId = crypto.randomUUID();
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO movements (id, client_id, type, description, amount, occurred_at, created_at)
     VALUES (?, ?, 'purchase', ?, ?, ?, ?)`
  )
    .bind(movementId, id, desc, total, normalizeOccurredAt(occurred_at), ts)
    .run();

  await logActivity(c.env.DB, {
    type: 'PURCHASE',
    entity: 'movements',
    entityId: movementId,
    details: { clientId: id, total, desc },
  });

  const row = await c.env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) AS balance FROM movements WHERE client_id = ?`)
    .bind(id)
    .first<{ balance: number }>();
  return c.json({ ok: true, balance: row?.balance ?? 0, movementId }, 201);
});

clients.post('/:id/payments', async (c) => {
  const id = c.req.param('id');
  const parsed = paymentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, 400);

  const client = await c.env.DB.prepare(`SELECT name FROM clients WHERE id = ?`).bind(id).first<{ name: string }>();
  if (!client) return c.json({ error: 'Cliente no encontrado' }, 404);

  const { amount, note, occurred_at } = parsed.data;
  const balanceRow = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM movements WHERE client_id = ?`
  )
    .bind(id)
    .first<{ balance: number }>();
  const balance = balanceRow?.balance ?? 0;
  if (balance <= 0) return c.json({ error: 'El cliente no tiene deuda pendiente' }, 400);
  if (amount > balance) {
    return c.json({ error: 'El abono no puede ser mayor que la deuda actual' }, 400);
  }

  const desc = note ? `Abono: ${note}` : 'Abono';
  const movementId = crypto.randomUUID();
  const ts = nowIso();
  // Insercion atomica: solo se inserta si la deuda sigue siendo suficiente.
  const result = await c.env.DB.prepare(
    `INSERT INTO movements (id, client_id, type, description, amount, occurred_at, created_at)
     SELECT ?, ?, 'payment', ?, ?, ?, ?
      WHERE (SELECT COALESCE(SUM(amount), 0) FROM movements WHERE client_id = ?) >= ?`
  )
    .bind(movementId, id, desc, -amount, normalizeOccurredAt(occurred_at), ts, id, amount)
    .run();

  if (!result.meta.changes) {
    return c.json({ error: 'El abono no pudo aplicarse, la deuda cambió. Intenta de nuevo.' }, 409);
  }

  await logActivity(c.env.DB, {
    type: 'PAYMENT',
    entity: 'movements',
    entityId: movementId,
    details: { clientId: id, amount, note: note ?? null },
  });

  return c.json({ ok: true, balance: balance - amount, movementId }, 201);
});

export default clients;
