import type { Bindings } from './types';

async function fetchAll<T>(db: D1Database, sql: string, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { results } = await db.prepare(`${sql} LIMIT ${pageSize} OFFSET ${offset}`).all<T>();
    out.push(...results);
    if (results.length < pageSize) break;
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
    fetchAll(env.DB, `SELECT * FROM clients ORDER BY id`),
    fetchAll(env.DB, `SELECT * FROM movements ORDER BY id`),
    fetchAll(env.DB, `SELECT * FROM products ORDER BY id`),
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
