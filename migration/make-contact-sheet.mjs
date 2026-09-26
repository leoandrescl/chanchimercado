// Genera una hoja de contactos (galeria HTML) con las imagenes candidatas
// para revision visual. Uso: node migration/make-contact-sheet.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'migration', 'img-out');
const candDir = path.join(outDir, 'candidates');
const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'));
const names = JSON.parse(fs.readFileSync(path.join(outDir, 'product-names.json'), 'utf8'));

const files = fs.readdirSync(candDir).filter((f) => /\.(jpe?g|png|webp|avif|gif)$/i.test(f));
const rows = files.map((f) => {
  const id = f.replace(/\.[^.]+$/, '');
  const m = manifest[id] || {};
  const src = m.url || (m.match ? `OFA: ${m.match}` : '');
  const label = names[id] || id.slice(0, 8);
  return `<div class="card" data-id="${id}"><img src="candidates/${f}" loading="lazy"><div class="lbl"><b>${label}</b><span>${src.slice(0, 90)}</span></div></div>`;
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;background:#222;color:#eee;margin:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.card{background:#333;border-radius:8px;overflow:hidden}
.card img{width:100%;height:180px;object-fit:contain;background:#fff;display:block}
.lbl{padding:6px;font-size:11px;line-height:1.3}.lbl b{display:block;font-size:13px}
.lbl span{color:#9ab;word-break:break-all}
</style></head><body><h1>Candidatas: ${files.length}</h1><div class="grid">${rows.join('\n')}</div></body></html>`;

fs.writeFileSync(path.join(outDir, 'contact-sheet.html'), html);
console.log(`${files.length} imagenes -> ${path.join(outDir, 'contact-sheet.html')}`);
