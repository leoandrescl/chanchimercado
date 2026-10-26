import type { Bindings } from './types';

// Paginacion por keyset (id > ultimo): lee cada fila una sola vez.
// Con OFFSET, SQLite vuelve a escanear desde el inicio en cada pagina (O(n^2)).
async function fetchAll<T extends { id: string }>(
  db: D1Database,
  table: string,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  let lastId: string | null = null;
  for (;;) {
    const stmt: D1PreparedStatement =
      lastId === null
        ? db.prepare(`SELECT * FROM ${table} ORDER BY id LIMIT ${pageSize}`)
        : db.prepare(`SELECT * FROM ${table} WHERE id > ? ORDER BY id LIMIT ${pageSize}`).bind(lastId);
    const { results } = await stmt.all<T>();
    out.push(...results);
    if (results.length < pageSize) break;
    lastId = results[results.length - 1].id;
  }
  return out;
}

export interface BackupPayload {
  metadata: {
    exportedAt: string;
    version: string;
    totalClients: number;
    totalMovements: number;
    totalProducts: number;
  };
  clients: unknown[];
  movements: unknown[];
  products: unknown[];
}

export async function collectBackup(env: Bindings): Promise<BackupPayload> {
  // ORDER BY id: orden total determinista, evita saltos al paginar con empates.
  const [clients, movements, products] = await Promise.all([
    fetchAll(env.DB, 'clients'),
    fetchAll(env.DB, 'movements'),
    fetchAll(env.DB, 'products'),
  ]);

  return {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      totalClients: clients.length,
      totalMovements: movements.length,
      totalProducts: products.length,
    },
    clients,
    movements,
    products,
  };
}

const DAY_SECONDS = 60 * 60 * 24;

/** Respaldo diario a KV (independiente de D1 Time Travel). */
export async function runScheduledBackup(env: Bindings): Promise<void> {
  const data = await collectBackup(env);
  const json = JSON.stringify(data);
  const date = new Date().toISOString().slice(0, 10);

  await env.BACKUPS.put(`daily/${date}.json`, json, {
    expirationTtl: DAY_SECONDS * 60,
    metadata: { createdAt: Date.now(), bytes: json.length },
  });
  await env.BACKUPS.put('latest.json', json, {
    metadata: { createdAt: Date.now(), bytes: json.length, date },
  });

  console.log(`Backup ${date}: ${data.metadata.totalMovements} movimientos, ${json.length} bytes`);
}
