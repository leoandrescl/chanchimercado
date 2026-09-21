import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireAuth } from './auth';
import { logActivity } from '../log';

const products = new Hono<AppEnv>();
products.use('*', requireAuth);

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  image_key: string | null;
  is_visible: number;
  is_free_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const nowIso = () => new Date().toISOString();

function toProduct(row: ProductRow) {
  return { ...row, image_url: row.image_key ? `/api/images/${row.image_key}` : null };
}

const jsonSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  price: z.number().int().nonnegative().optional(),
  category: z.string().trim().max(40).optional().nullable(),
  is_visible: z.boolean().optional(),
  is_free_amount: z.boolean().optional(),
});

async function readBody(c: { req: { header: (k: string) => string | undefined; formData: () => Promise<FormData>; json: () => Promise<unknown> } }) {
  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await c.req.formData();
    return { form, json: null };
  }
  return { form: null, json: await c.req.json().catch(() => null) };
}

function parseBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  return s === '1' || s === 'true' || s === 'on' || s === 'si';
}

function parseInt10(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

async function uploadImage(c: { env: AppEnv['Bindings'] }, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `products/${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), {
    metadata: { contentType: file.type || 'application/octet-stream' },
  });
  return key;
}

products.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM products ORDER BY sort_order ASC, name COLLATE NOCASE ASC`
  ).all<ProductRow>();
  return c.json({ products: results.map(toProduct) });
});

products.post('/', async (c) => {
  const { form, json } = await readBody(c);

  let name: unknown;
  let price: unknown;
  let category: unknown;
  let isVisible: unknown;
  let isFree: unknown;
  let file: File | null = null;

  if (form) {
    name = form.get('name');
    price = form.get('price');
    category = form.get('category');
    isVisible = form.get('is_visible');
    isFree = form.get('is_free_amount');
    const f = form.get('image');
    file = f instanceof File && f.size > 0 ? f : null;
  } else {
    const parsed = jsonSchema.safeParse(json);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, 400);
    name = parsed.data.name;
    price = parsed.data.price;
    category = parsed.data.category;
    isVisible = parsed.data.is_visible;
    isFree = parsed.data.is_free_amount;
  }

  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) return c.json({ error: 'El nombre es obligatorio' }, 400);
  const cleanPrice = parseInt10(price) ?? 0;
  if (cleanPrice < 0) return c.json({ error: 'El precio no puede ser negativo' }, 400);

  const imageKey = file ? await uploadImage(c, file) : null;
  const maxRow = await c.env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM products`).first<{ max: number }>();

  const id = crypto.randomUUID();
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO products (id, name, price, category, image_key, is_visible, is_free_amount, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      cleanName,
      cleanPrice,
      typeof category === 'string' && category.trim() ? category.trim() : null,
      imageKey,
      parseBool(isVisible) === false ? 0 : 1,
      parseBool(isFree) ? 1 : 0,
      (maxRow?.max ?? 0) + 1,
      ts,
      ts
    )
    .run();

  await logActivity(c.env.DB, { type: 'PRODUCT_CREATE', entity: 'products', entityId: id, details: { name: cleanName } });

  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  return c.json({ product: row ? toProduct(row) : null }, 201);
});

products.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  if (!existing) return c.json({ error: 'Producto no encontrado' }, 404);

  const { form, json } = await readBody(c);
  const fields: string[] = [];
  const binds: unknown[] = [];

  const setName = (v: unknown) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (!s) return;
    fields.push('name = ?');
    binds.push(s);
  };
  const setPrice = (v: unknown) => {
    const n = parseInt10(v);
    if (n === undefined) return;
    fields.push('price = ?');
    binds.push(Math.max(0, n));
  };
  const setCategory = (v: unknown) => {
    if (v === undefined) return;
    fields.push('category = ?');
    binds.push(typeof v === 'string' && v.trim() ? v.trim() : null);
  };
  const setVisible = (v: unknown) => {
    const b = parseBool(v);
    if (b === undefined) return;
    fields.push('is_visible = ?');
    binds.push(b ? 1 : 0);
  };
  const setFree = (v: unknown) => {
    const b = parseBool(v);
    if (b === undefined) return;
    fields.push('is_free_amount = ?');
    binds.push(b ? 1 : 0);
  };

  if (form) {
    setName(form.get('name'));
    setPrice(form.get('price'));
    setCategory(form.get('category') ?? undefined);
    setVisible(form.get('is_visible') ?? undefined);
    setFree(form.get('is_free_amount') ?? undefined);
    const f = form.get('image');
    if (f instanceof File && f.size > 0) {
      const key = await uploadImage(c, f);
      fields.push('image_key = ?');
      binds.push(key);
    }
  } else {
    const parsed = jsonSchema.safeParse(json);
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, 400);
    setName(parsed.data.name);
    setPrice(parsed.data.price);
    setCategory(parsed.data.category);
    setVisible(parsed.data.is_visible);
    setFree(parsed.data.is_free_amount);
  }

  if (!fields.length) return c.json({ ok: true });
  fields.push('updated_at = ?');
  binds.push(nowIso(), id);

  await c.env.DB.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  await logActivity(c.env.DB, { type: 'PRODUCT_UPDATE', entity: 'products', entityId: id, details: { id } });
  const row = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  return c.json({ product: row ? toProduct(row) : null });
});

products.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(`SELECT name, image_key FROM products WHERE id = ?`)
    .bind(id)
    .first<{ name: string; image_key: string | null }>();
  if (!existing) return c.json({ error: 'Producto no encontrado' }, 404);

  await c.env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  if (existing.image_key) {
    await c.env.IMAGES.delete(existing.image_key).catch(() => undefined);
  }
  await logActivity(c.env.DB, {
    type: 'PRODUCT_DELETE',
    entity: 'products',
    entityId: id,
    details: { name: existing.name },
  });
  return c.json({ ok: true });
});

products.post('/reorder', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === 'string') : [];
  if (!ids.length) return c.json({ error: 'Lista de ids vacía' }, 400);

  const statements = ids.map((id, index) =>
    c.env.DB.prepare(`UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?`).bind(index, nowIso(), id)
  );
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

export default products;
