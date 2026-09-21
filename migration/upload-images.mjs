// Sube las imagenes de productos a Cloudflare KV y genera seed/images-update.sql
// Requiere: wrangler autenticado y el namespace KV creado.
//
// Uso:
//   node migration/upload-images.mjs [json-imagenes] [carpeta-respaldo] [--local|--remote]
//
// Por defecto lee seed/product-images.json (generado por generate-seed.mjs)
// y la carpeta del respaldo con los archivos de imagen.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const imagesJson = process.argv[2] || path.join(root, 'seed', 'product-images.json');
const backupDir = process.argv[3] || 'C:\\Proyectos\\chanchi-backups\\2026-09-21\\storage\\product-images';
const namespaceId = process.env.KV_NAMESPACE_ID || '55df952af1a5410dbad4dad436f550c2';
const remoteFlag = process.argv.includes('--local') ? '--local' : '--remote';

const images = JSON.parse(fs.readFileSync(imagesJson, 'utf8'));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chanchi-img-'));
const updates = [];

function extFromMime(mime) {
  if (!mime) return 'bin';
  return mime.split('/')[1].replace('jpeg', 'jpg');
}

for (const img of images) {
  let bytes;
  let ext = 'jpg';
  if (img.kind === 'url') {
    const base = decodeURIComponent(img.value.split('/').pop().split('?')[0]);
    const local = path.join(backupDir, base);
    if (!fs.existsSync(local)) {
      console.warn(`  [skip] no esta en el respaldo: ${base}`);
      continue;
    }
    bytes = fs.readFileSync(local);
    ext = (base.split('.').pop() || 'jpg').toLowerCase();
  } else if (img.kind === 'base64') {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(img.value);
    if (!match) continue;
    ext = extFromMime(match[1]);
    bytes = Buffer.from(match[2], 'base64');
  } else {
    continue;
  }

  const key = `products/${img.product_id}.${ext}`;
  const tmpFile = path.join(tmpDir, `${img.product_id}.${ext}`);
  fs.writeFileSync(tmpFile, bytes);

  try {
    execFileSync(
      'npx',
      ['wrangler', 'kv', 'key', 'put', key, `--path=${tmpFile}`, `--namespace-id=${namespaceId}`, remoteFlag],
      { cwd: root, stdio: 'pipe', shell: process.platform === 'win32' }
    );
    updates.push(`UPDATE products SET image_key = '${key}', updated_at = '${new Date().toISOString()}' WHERE id = '${img.product_id}';`);
    console.log(`  [ok] ${img.name} -> ${key}`);
  } catch (err) {
    console.error(`  [fail] ${img.name}: ${err.message}`);
  }
}

const sqlFile = path.join(root, 'seed', 'images-update.sql');
fs.writeFileSync(sqlFile, updates.join('\n') + '\n', 'utf8');
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${updates.length} imagenes subidas. SQL: ${sqlFile}`);
console.log(`Aplica los image_key con: npx wrangler d1 execute chanchimercado ${remoteFlag} --file=./seed/images-update.sql`);
