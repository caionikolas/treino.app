import { getDb } from '../connection';

export const settingsRepository = {
  async get(key: string): Promise<string | null> {
    const db = getDb();
    const r = await db.execute('SELECT value FROM app_settings WHERE key = ? LIMIT 1', [key]);
    const row = r.rows?.[0] as { value: string } | undefined;
    return row?.value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    const db = getDb();
    await db.execute(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  },
};
