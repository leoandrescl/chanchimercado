// Busca y descarga imagenes para los productos sin image_key.
// Fuente 1: Open Food Facts (fotos de producto con fondo blanco, licencia abierta).
// Fuente 2: busqueda de imagenes DuckDuckGo (para items no alimentarios).
// Guarda candidatos en migration/img-out/candidates/ y un manifest.json.
//
// Uso: node migration/fetch-missing-images.mjs
// Reanudable: salta productos que ya tienen archivo descargado (ok o revisado).

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'migration', 'img-out');
const candDir = path.join(outDir, 'candidates');
fs.mkdirSync(candDir, { recursive: true });

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// name: nombre en la BD | query: termino de busqueda | ofa: intentar Open Food Facts
// reuse: copiar image_key de otro producto (no descarga nada)
const PRODUCTS = [
  { id: '241f4427-f8af-484c-9fde-bd4ba3f98d0c', name: 'Twisto', query: 'twisto ambrosoli', ofa: true },
  { id: '47a77352-dbad-40a7-a1d7-8e0d76704977', name: 'Bambino', query: 'bambino dulce chile', ofa: true },
  { id: 'c2263f67-314f-40ed-aba1-2b814130a567', name: 'Turron', query: 'turron dulce', ofa: true },
  { id: 'bfd2e864-e73b-49a1-8afb-c55e7ecbf308', name: 'Tableton bolsa', query: 'tableton chocolate', ofa: true },
  { id: '01dd060d-10a0-4b6f-b5b2-cdba0ab86866', name: 'Lata atún San José', query: 'atun san jose lata', ofa: true },
  { id: '1f64b9fa-0a9e-401e-9c37-8153b210760c', name: 'Sobre club social', query: 'galletas club social', ofa: true },
  { id: 'b6aebb2a-2d44-41ab-95bc-f71422c55c44', name: 'Bombon Orly 4 × 1000', query: 'bombones orly', ofa: true },
  { id: '51075ffd-f9ba-493a-b177-8d120e58a543', name: 'Sprite medio', query: 'sprite botella', ofa: true },
  { id: '4be75681-08d6-4999-bbc5-e3435ff8a864', name: 'Fanta grande', query: 'fanta botella naranja', ofa: true },
  { id: '89d10447-acb6-4f99-9b31-d2aa151a87d6', name: 'Pepsi', query: 'pepsi botella', ofa: true },
  { id: '1a028c32-1ecf-4d54-9a9c-61664fc90a05', name: 'Pulsera', query: 'pulsera artesanal mujer', ofa: false },
  { id: '178eeff9-a136-4749-977a-d742810cd1a7', name: 'Niza', query: 'mantequilla niza chile', ofa: true },
  { id: '72aa0237-fc62-418b-a6ef-6be888abcdfd', name: 'Rockstar', query: 'rockstar energy drink lata', ofa: true },
  { id: '8ce9baf5-7f4d-4da8-92e8-be6894e28eed', name: 'Galleton ×3', query: 'costa galleton', ofa: true },
  { id: 'a9bd3e8c-1565-45d6-b742-6bb57d1b9acc', name: 'Collar', query: 'collar artesanal mujer', ofa: false },
  { id: '153a2c16-5cdb-48c2-96d8-43222a45f00d', name: 'Mini obsesión', query: 'costa mini obsesion', ofa: true },
  { id: '91adb92e-c300-4709-a5af-de6e9521a80a', name: 'Promo Game', query: 'costa game', ofa: true },
  { id: '89457d96-c6e0-4c7f-ad34-5a6516a48e1b', name: 'Leche bombillin', query: 'leche bombillin', ofa: true },
  { id: 'b2972813-0a21-4d93-ab44-1de6248151fd', name: 'Pap', query: 'bebida pap chile botella', ofa: true },
  { id: '66f549a0-9f09-41de-851d-d6b2ed306e85', name: 'Galletas nick', query: 'galletas nick', ofa: true },
  { id: '36ae2b8e-4f93-45a8-9afb-8dbb98ff8ecb', name: 'Snack M x3', query: 'snack m papas fritas', ofa: true },
  { id: '04770c7c-b656-416d-acb7-64eacd0e4588', name: 'Chicle', query: 'chicles beldent', ofa: true },
  { id: '94ba2325-7fd9-47b2-865d-4b806752fb78', name: 'Goma', query: 'goma de mascar chicles', ofa: true },
  { id: 'c49d32a6-1a3d-4436-a8e1-e61730cca990', name: 'Costa Mantequilla', query: 'galletas costa mantequilla', ofa: true },
  { id: 'aac1bdbe-2ab9-46a6-8307-a4807fe7e0de', name: 'Oreo', query: 'galletas oreo', ofa: true },
  { id: '29f744c3-fe80-4e92-8bcc-57d7879f2257', name: 'Galleta obsesión', query: 'costa obsesion galletas', ofa: true },
  { id: 'a5b64b7c-b73f-405d-a177-e9540742277d', name: 'Leche Nido', query: 'leche nido nestle', ofa: true },
  { id: '11b29b65-9d2b-4b49-aa65-625093a30a1d', name: 'Galleta soda chica', query: 'galletas soda', ofa: true },
  { id: '9f885df3-e65d-40b8-b860-7819430483ef', name: 'Galletas sezl', query: 'galletas selz', ofa: true },
  { id: 'e71522bb-12f7-4379-8c04-997e9b6e3e74', name: 'Donnuts/ crettel', query: 'donuts crettel', ofa: true },
  { id: '1718283f-0f1d-4ca8-abb1-3ac032a70f89', name: 'Costa rama grande', query: 'galletas costa rama', ofa: true },
  { id: '90633f00-6761-4dc6-9cff-4bfab2973999', name: 'Prestigio', query: 'chocolate prestigio nestle', ofa: true },
  { id: 'b2d189e4-52ae-42c2-85c9-9c4765b55c17', name: 'Gatorade 1 lt', query: 'gatorade botella 1 litro', ofa: true },
  { id: 'e3cb075e-b368-49f4-b648-f665b53669f8', name: 'Capuchino', query: 'galletas costa capuchino', ofa: true },
  { id: 'b0291d23-0f34-4fda-90cf-0bc2126fff62', name: 'Golazo/Golpe', query: 'galletas golpe costa', ofa: true },
  { id: 'e294f6f5-28b9-4141-b158-fb606404c171', name: 'Itkat', query: 'itkat chile', ofa: true },
  { id: '46fc1cd5-6673-4a9c-8297-538899a63d66', name: 'Bilz', query: 'bilz botella chile', ofa: true },
  { id: '58a9e56b-cc7b-4aad-9e2e-a1716abe5977', name: 'Galleta BB', query: 'galletas bb', ofa: true },
  { id: 'c7eed8cc-805b-4431-8cfd-a01fb79f6e38', name: 'Bandeja de empanadas', query: 'bandeja empanadas chilenas', ofa: false },
  { id: '83336811-5c81-40fc-976c-952e029921e9', name: 'Ricolate', query: 'ricolate chile', ofa: true },
  { id: 'b670b7a1-c1a2-4ac6-9b35-09d88e85d56b', name: 'Galleta bonobon', query: 'bon o bon chocolate', ofa: true },
  { id: '647b86d8-3dcf-4bc2-8056-c786182c7ffc', name: 'Rigochoc', query: 'rigochoc chile', ofa: true },
  { id: '65c15f2d-4c17-402d-ad11-a44d615bc8c3', name: 'Galleta Fruna Oblea', query: 'oblea fruna', ofa: true },
  { id: 'd8051b2c-e88c-4a12-be54-aa2ec4b3ce5d', name: 'Sprite 250cc', query: 'sprite lata 250', ofa: true },
  { id: '37e6655b-5215-4fe4-a697-3620d17cc555', name: 'Alfajor 3 capas', query: 'alfajor tres capas chile', ofa: true },
  { id: '4a9cd2db-5cd6-44cd-9681-b0e353609931', name: 'Goldennus', query: 'goldennus chile', ofa: true },
  { id: 'c6b713dc-2a48-4359-ae3d-56866bb54a9c', name: 'Milo sobre', query: 'milo nestle sobre', ofa: true },
  { id: '81ffb8a6-864e-48e0-bebb-919e7c7ad09c', name: 'Lata coca', query: 'coca cola lata', ofa: true },
  { id: '8966180f-cb78-469b-a9f4-698ff703491f', name: 'Paquete club social', query: 'caja club social galletas', ofa: true },
  { id: '114420fe-0286-44f1-95e5-2a2c7d4a7e10', name: 'Papa grande', query: 'papas fritas bolsa grande', ofa: true },
  { id: '7b22520f-3e00-4fc9-b300-cae0939bc725', name: 'Agua mineral', query: 'agua mineral botella', ofa: true },
  { id: '515b0ea3-b1cb-4fa7-845a-b81ab3b96b25', name: 'Aloevera', query: 'bebida aloe vera botella', ofa: true },
  { id: '85247fa2-6c3c-4c9a-815b-320059787465', name: 'Bonobon x 5', query: 'bon o bon', ofa: true },
  { id: 'ef187d7f-2af0-47e8-bd74-6e3c5cf06dce', name: 'Galleta Vino', query: 'galletas vino chile', ofa: true },
  { id: 'f8d421c3-19b1-483e-a0a8-b33eb09b7b8b', name: 'Agua lata sabor', query: 'agua saborizada lata', ofa: true },
  { id: '44d262cf-8601-4fb2-9ab4-398d21096f11', name: 'Halls', query: 'halls mentolada', ofa: true },
  { id: '95fc8726-7a70-4340-9cf9-823007389aca', name: 'Coca 250 cc', query: 'coca cola botella pequeña 250', ofa: true },
  { id: '3fb2603d-fe5e-4b90-a335-3131cbc72be2', name: 'Bebida lata', query: 'lata de bebida gaseosa', ofa: true },
  { id: '130d8e26-c8e2-4f08-a902-dd60f7d86287', name: 'Fanta 250cc', query: 'fanta lata 250', ofa: true },
  { id: '51a2059a-a7eb-4043-9934-71197b0e6f87', name: 'Gran cereal costa', query: 'costa gran cereal galletas', ofa: true },
  { id: '310ed4d6-c8bf-498e-8edd-41b5595cd263', name: 'Bonobon unidad', query: 'bon o bon individually', ofa: true },
  { id: '546a8b18-546c-4589-b050-23fe9577ec8d', name: 'Mini tortas', query: 'mini tortas apio', ofa: true },
  { id: 'ba047a0b-8b94-4a5a-b831-1ea825e8c19c', name: 'Café Chico', query: 'taza cafe espresso', ofa: false },
  { id: 'c636cdb1-b8e9-4399-aa8f-02608a7e2e86', name: 'Frac', query: 'frac chocolate chile', ofa: true },
  { id: 'd61c57bc-73fe-4a83-af07-ff85cbc8e401', name: 'Galletas seLz', query: 'galletas selz', ofa: true },
  { id: '8fd86081-0ea4-43a2-866e-f7c84afa51e8', name: 'Red bull chica', query: 'red bull lata', ofa: true },
  { id: 'd41f0b60-9f12-40e5-af5c-41b085bcfbc4', name: 'Galleta champañ costa', query: 'galletas champaign costa', ofa: true },
  { id: '364f7402-fe58-478b-903b-9a5ae354d656', name: 'Tuareg', query: 'tuareg dulce chile', ofa: true },
  { id: 'ef12ce59-9144-4f49-8759-6f2b87a00c15', name: 'Cracker chica', query: 'galletas crackers', ofa: true },
  { id: '93fa161b-0813-4233-9a82-649d6d202b20', name: 'Costa chocolate', query: 'galletas costa chocolate', ofa: true },
  { id: '81e57aa6-3e6c-484c-9e62-914c2562c1a8', name: 'Brownie', query: 'brownie chocolate', ofa: false },
  { id: 'd3cc3a5f-9ee9-468e-86ec-0a498bf9be61', name: 'Mantecol', query: 'mantecol', ofa: true },
  { id: 'd01c6035-53da-442c-bdfe-b4d41f81a6db', name: 'Rolls costa', query: 'costa rolls galletas', ofa: true },
  { id: '312db016-45d7-439e-ad14-1dc594f65dab', name: 'Game', query: 'costa game galleta', ofa: true },
  { id: '08a339ec-99f8-484f-9515-96dcfdd82451', name: 'Oblea mckay', query: 'oblea mckay', ofa: true },
];

async function fetchWithRetry(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': 'chanchimercado-catalog/1.0 (contacto: chanchimercado.cl)', ...(opts.headers || {}) },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === tries - 1) throw err;
      await sleep(1500 * (i + 1));
    }
  }
}

const STOP = new Set(['de', 'la', 'el', 'y', 'x', 'con', 'chica', 'chico', 'grande', 'medio', 'pequena', 'botella', 'lata', 'litro', 'bolsa', 'caja', 'paquete', 'unidad', 'sobre', 'sache', 'sachet', 'pequena']);
function nameTokens(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((t) => t.length > 2 && !/^\d+$/.test(t) && !STOP.has(t));
}

// Variantes de consulta: completa, simplificada (sin palabras de envase) y la primera palabra (marca)
function queryVariants(query) {
  const tokens = query.split(/\s+/);
  const simplified = tokens.filter((t) => !STOP.has(t.toLowerCase()) && !/^\d+$/.test(t));
  const variants = [query];
  if (simplified.length && simplified.join(' ') !== query) variants.push(simplified.join(' '));
  const firstTwo = simplified.slice(0, 2).join(' ');
  if (firstTwo && firstTwo !== variants[variants.length - 1]) variants.push(firstTwo);
  return [...new Set(variants)];
}

async function ofaSearch(query, chileOnly = true) {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '20');
  url.searchParams.set('fields', 'product_name,product_name_es,product_name_en,brands,image_front_url,image_small_url,countries');
  if (chileOnly) {
    url.searchParams.set('tagtype_0', 'countries');
    url.searchParams.set('tag_contains_0', 'contains');
    url.searchParams.set('tag_0', 'chile');
  }
  const res = await fetchWithRetry(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products || []).filter((p) => p.image_front_url || p.image_small_url);
}

function ofaScore(p, query) {
  const hay = [p.product_name, p.product_name_es, p.product_name_en, p.brands]
    .filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const qTokens = nameTokens(query);
  if (!qTokens.length) return 0;
  let hits = 0;
  for (const t of qTokens) if (hay.includes(t)) hits++;
  return hits / qTokens.length;
}

async function downloadImage(url, referer) {
  const res = await fetchWithRetry(url, referer ? { headers: { Referer: referer } } : {});
  if (!res.ok) return null;
  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (!type.startsWith('image/')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4000) return null; // demasiado pequeno para ser una foto real
  return { buf, type };
}

function extFromType(type, url) {
  const fromUrl = (url.split('?')[0].match(/\.(png|jpe?g|webp|avif|gif)$/i) || [])[1];
  if (fromUrl) return fromUrl.toLowerCase().replace('jpeg', 'jpg');
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('avif')) return 'avif';
  return 'jpg';
}

async function ddgImages(query) {
  try {
    const html = await (await fetchWithRetry(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
    })).text();
    const vqd = (html.match(/vqd=["']?([\d-]+)["']?/) || [])[1];
    if (!vqd) return [];
    await sleep(1200);
    const res = await fetchWithRetry(
      `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', Referer: 'https://duckduckgo.com/' } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 5).map((r) => ({ image: r.image, thumbnail: r.thumbnail, width: r.width, height: r.height }));
  } catch {
    return [];
  }
}

async function ddgDownload(cands) {
  for (const c of cands) {
    // preferir imagenes de tamano razonable, evitar sprites/gigantes
    if (c.width && (c.width < 200 || c.height < 200)) continue;
    if (c.width && c.width > 4000) continue;
    for (const url of [c.image, c.thumbnail].filter(Boolean)) {
      const dl = await downloadImage(url, 'https://duckduckgo.com/').catch(() => null);
      if (dl) return { ...dl, url };
      await sleep(300);
    }
  }
  return null;
}

for (const p of PRODUCTS) {
  const prev = manifest[p.id];
  if (prev?.ok && prev.status !== 'rejected') {
    console.log(`[skip] ${p.name}`);
    continue;
  }
  let result = { ok: false, status: 'no-result', name: p.name, query: p.query };
  try {
    if (p.ofa) {
      try {
        // primero con filtro Chile, luego global (marcas internacionales)
        for (const chileOnly of [true, false]) {
          for (const variant of queryVariants(p.query)) {
            const products = await ofaSearch(variant, chileOnly);
            let best = null;
            for (const cand of products) {
              const s = ofaScore(cand, variant);
              if (s >= 0.4 && (!best || s > best.score)) best = { ...cand, score: s };
            }
            if (best) {
              const url = best.image_front_url || best.image_small_url;
              const dl = await downloadImage(url).catch(() => null);
              if (dl) {
                const ext = extFromType(dl.type, url);
                const file = `${p.id}.${ext}`;
                fs.writeFileSync(path.join(candDir, file), dl.buf);
                result = { ok: true, status: 'ofa', name: p.name, query: variant, file, url, match: best.product_name || best.product_name_es, brands: best.brands };
                break;
              }
            }
            await sleep(1000);
          }
          if (result.ok) break;
        }
      } catch (err) {
        console.log(`  [ofa-error] ${p.name}: ${err.message}`);
      }
      await sleep(1000);
    }
    // DDG desactivado: i.js responde 403. Los faltantes se buscan con agentes web.
  } catch (err) {
    result.status = 'error: ' + err.message;
  }
  manifest[p.id] = result;
  console.log(`[${result.ok ? 'ok' : 'FAIL'}] ${p.name} (${result.status})`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

const okCount = Object.values(manifest).filter((m) => m.ok).length;
console.log(`\n${okCount}/${PRODUCTS.length} con imagen candidata. Manifest: ${manifestPath}`);
