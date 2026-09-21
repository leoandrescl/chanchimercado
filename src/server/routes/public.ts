import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';

const publicRoutes = new Hono<AppEnv>();

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  image_key: string | null;
  is_free_amount: number;
};

publicRoutes.get('/products', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, price, category, image_key, is_free_amount
       FROM products
      WHERE is_visible = 1 AND is_free_amount = 0
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC`
  ).all<ProductRow>();
  return c.json({
    products: results.map((row) => ({
      ...row,
      image_url: row.image_key ? `/api/images/${row.image_key}` : null,
    })),
  });
});

const orderSchema = z.object({
  client_name: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        price: z.number().int().nonnegative(),
      })
    )
    .min(1),
  total: z.number().int().nonnegative(),
});

publicRoutes.post('/orders', async (c) => {
  const parsed = orderSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Pedido inválido' }, 400);

  const { client_name, phone, items, total } = parsed.data;
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO orders (id, client_name, phone, items_json, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'nuevo', ?)`
  )
    .bind(id, client_name ?? null, phone ?? null, JSON.stringify(items), total, new Date().toISOString())
    .run();

  return c.json({ ok: true, orderId: id }, 201);
});

export default publicRoutes;
