// Genera seed/seed.sql a partir del respaldo JSON de Supabase.
// Uso: node migration/generate-seed.mjs [carpeta-del-respaldo]
//
// Regla: el saldo se recalcula con SUM(movements.amount). Para que el saldo
// mostrado coincida EXACTO con el que la dueña ve hoy, se agrega un movimiento
// 'adjustment' con la diferencia (balance_original - suma de movimientos).

import fs from 'node:fs';
import path from 'node:path';

const inputDir = process.argv[2] || 'C:\\Proyectos\\chanchi-backups\\2026-09-21\\db';
const outDir = path.resolve(import.meta.dirname, '..', 'seed');
fs.mkdirSync(outDir, { recursive: true });

const read = (name) => JSON.parse(fs.readFileSync(path.join(inputDir, `${name}.json`), 'utf8')).rows;

const debtors = read('debtors');
const debts = read('debts');
const products = read('products');

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? 'NULL' : String(Math.trunc(Number(v))));

const lines = [];
lines.push('-- Datos migrados desde Supabase (respaldo 2026-09-21)');
lines.push(`-- Clientes: ${debtors.length} | Movimientos: ${debts.length} | Productos: ${products.length}`);
lines.push('PRAGMA foreign_keys = OFF;');
lines.push('BEGIN TRANSACTION;');

// 1. Clientes
for (const d of debtors) {
  lines.push(
    `INSERT INTO clients (id, name, phone, note, archived, created_at, updated_at) VALUES (` +
      `${q(d.id)}, ${q(d.name)}, ${q(d.phone)}, NULL, 0, ${q(d.created_at)}, ${q(d.updated_at || d.created_at)});`
  );
}

// 2. Movimientos originales + reconciliacion por cliente
const sumByClient = new Map();
for (const d of debts) {
  sumByClient.set(d.debtor_id, (sumByClient.get(d.debtor_id) || 0) + (d.amount || 0));
}

let adjustments = 0;
let adjustmentsTotal = 0;
for (const d of debtors) {
  const computed = sumByClient.get(d.id) || 0;
  const balance = d.balance || 0;
  const delta = balance - computed;
  if (delta !== 0) {
    adjustments++;
    adjustmentsTotal += delta;
    const id = `adj-${d.id}`;
    lines.push(
      `INSERT INTO movements (id, client_id, type, description, amount, occurred_at, created_at) VALUES (` +
        `${q(id)}, ${q(d.id)}, 'adjustment', 'Saldo inicial migrado', ${n(delta)}, ${q(d.created_at)}, ${q(d.created_at)});`
    );
  }
}

for (const d of debts) {
  if (!d.amount) continue;
  const type = d.amount > 0 ? 'purchase' : 'payment';
  lines.push(
    `INSERT INTO movements (id, client_id, type, description, amount, occurred_at, created_at) VALUES (` +
      `${q(d.id)}, ${q(d.debtor_id)}, ${q(type)}, ${q(d.description)}, ${n(d.amount)}, ${q(d.date)}, ${q(d.created_at || d.date)});`
  );
}

// 3. Productos (imagenes se suben aparte a R2)
let order = 0;
for (const p of products) {
  order += 10;
  const category = p.category ?? null;
  lines.push(
    `INSERT INTO products (id, name, price, category, image_key, is_visible, is_free_amount, sort_order, created_at, updated_at) VALUES (` +
      `${q(p.id)}, ${q(p.name)}, ${n(p.price)}, ${q(category)}, NULL, ${n(p.is_visible === false ? 0 : 1)}, 0, ${n(order)}, ${q(p.created_at)}, ${q(p.updated_at || p.created_at)});`
  );
}

lines.push('COMMIT;');
lines.push('PRAGMA foreign_keys = ON;');

fs.writeFileSync(path.join(outDir, 'seed.sql'), lines.join('\n'), 'utf8');

// Manifiesto de imagenes para subir a R2
const images = products
  .filter((p) => p.image)
  .map((p) => ({
    product_id: p.id,
    name: p.name,
    kind: p.image.startsWith('data:') ? 'base64' : p.image.startsWith('http') ? 'url' : 'other',
    value: p.image,
  }));
fs.writeFileSync(path.join(outDir, 'product-images.json'), JSON.stringify(images, null, 2), 'utf8');

console.log('seed.sql generado');
console.log('  clientes:', debtors.length);
console.log('  movimientos:', debts.length, '+ ajustes:', adjustments, `(total ajustes ${adjustmentsTotal} CLP)`);
console.log('  productos:', products.length);
console.log('  imagenes:', images.length);
