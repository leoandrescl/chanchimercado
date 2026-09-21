// Exporta los datos vivos de Supabase (clientes, movimientos, productos e imagenes)
// a una carpeta lista para `generate-seed.mjs`.
//
// Uso (PowerShell):
//   $env:SUPABASE_URL="https://xxxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
//   node migration/export-supabase.mjs migration/out
//
// No guardes las credenciales en el repositorio.

import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const outDir = process.argv[2] || path.join(import.meta.dirname, 'out');
const imagesDir = path.join(outDir, 'images');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}
fs.mkdirSync(imagesDir, { recursive: true });

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function fetchAll(table) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const tables = ['debtors', 'debts', 'products'];
for (const table of tables) {
  const rows = await fetchAll(table);
  fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify({ table, rowCount: rows.length, rows }, null, 2), 'utf8');
  console.log(`${table}: ${rows.length} filas`);
}

// Imagenes de productos
const products = JSON.parse(fs.readFileSync(path.join(outDir, 'products.json'), 'utf8')).rows;
let downloaded = 0;
for (const p of products) {
  if (!p.image) continue;
  try {
    if (p.image.startsWith('data:')) {
      const match = /^data:([^;]+);base64,(.*)$/s.exec(p.image);
      if (!match) continue;
      const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
      fs.writeFileSync(path.join(imagesDir, `${p.id}.${ext}`), Buffer.from(match[2], 'base64'));
      downloaded++;
    } else if (p.image.startsWith('http')) {
      const base = decodeURIComponent(p.image.split('/').pop().split('?')[0]);
      const res = await fetch(p.image);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(path.join(imagesDir, base), Buffer.from(await res.arrayBuffer()));
      downloaded++;
    }
  } catch (err) {
    console.warn(`  imagen de "${p.name}" no descargada: ${err.message}`);
  }
}
console.log(`imagenes descargadas: ${downloaded}`);
console.log(`\nListo. Siguiente: node migration/generate-seed.mjs ${outDir}`);
