// Sube las imagenes aprobadas a Cloudflare KV (bulk put) y genera
// seed/images-missing-update.sql con los UPDATE de image_key.
//
// Uso: node migration/upload-missing-images.mjs
// Lee migration/img-out/approved.json: {"<productId>": "<archivo en candidates/>"}
// y migration/img-out/reuse.json:      {"<productId>": "<image_key existente a copiar>"}

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'migration', 'img-out');
const candDir = path.join(outDir, 'candidates');
const namespaceId = process.env.KV_NAMESPACE_ID || '55df952af1a5410dbad4dad436f550c2';
const remoteFlag = process.argv.includes('--local') ? '--local' : '--remote';

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
};

const approved = JSON.parse(fs.readFileSync(path.join(outDir, 'approved.json'), 'utf8'));
const reuse = JSON.parse(fs.readFileSync(path.join(outDir, 'reuse.json'), 'utf8'));

const kvEntries = [];
const updates = [];
const now = new Date().toISOString();

for (const [id, file] of Object.entries(approved)) {
  const local = path.join(candDir, file);
  const bytes = fs.readFileSync(local);
  const ext = (file.split('.').pop() || 'jpg').toLowerCase();
  const key = `products/${id}.${ext}`;
  kvEntries.push({ key, value: bytes.toString('base64'), base64: true, metadata: { contentType: MIME[ext] || 'application/octet-stream' } });
  updates.push(`UPDATE products SET image_key = '${key}', updated_at = '${now}' WHERE id = '${id}';`);
  console.log(`[kv] ${id} -> ${key} (${(bytes.length / 1024).toFixed(0)} KB)`);
}
for (const [id, existingKey] of Object.entries(reuse)) {
  updates.push(`UPDATE products SET image_key = '${existingKey}', updated_at = '${now}' WHERE id = '${id}';`);
  console.log(`[reuse] ${id} -> ${existingKey}`);
}

if (kvEntries.length) {
  const bulkFile = path.join(outDir, 'kv-bulk.json');
  fs.writeFileSync(bulkFile, JSON.stringify(kvEntries));
  execFileSync('npx', ['wrangler', 'kv', 'bulk', 'put', bulkFile, `--namespace-id=${namespaceId}`, remoteFlag],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
}

const sqlFile = path.join(root, 'seed', 'images-missing-update.sql');
fs.writeFileSync(sqlFile, updates.join('\n') + '\n', 'utf8');
console.log(`\n${updates.length} productos listos. SQL: ${sqlFile}`);
console.log(`Aplicar con: npx wrangler d1 execute chanchimercado ${remoteFlag} --file=./seed/images-missing-update.sql`);
