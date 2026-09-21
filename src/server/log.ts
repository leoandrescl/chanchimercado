export async function logActivity(
  db: D1Database,
  entry: { type: string; entity: string; entityId?: string | null; details?: unknown }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO activity_log (id, type, entity, entity_id, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        entry.type,
        entry.entity,
        entry.entityId ?? null,
        entry.details === undefined ? null : JSON.stringify(entry.details),
        new Date().toISOString()
      )
      .run();
  } catch (err) {
    console.error('logActivity failed', err);
  }
}
