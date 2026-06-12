import { getDb } from '../connection';
import { MasteryLevel } from '@/types/boss';

interface Row {
  progression_id: string;
  mastery_level: number;
}

export const progressionProgressRepository = {
  async getAllLevels(): Promise<Record<string, MasteryLevel>> {
    const db = getDb();
    const result = await db.execute(
      'SELECT progression_id, mastery_level FROM progression_progress',
    );
    const out: Record<string, MasteryLevel> = {};
    for (const r of (result.rows ?? []) as unknown as Row[]) {
      out[r.progression_id] = r.mastery_level as MasteryLevel;
    }
    return out;
  },

  async setLevel(progressionId: string, level: MasteryLevel): Promise<void> {
    const db = getDb();
    await db.execute(
      `INSERT INTO progression_progress (progression_id, mastery_level, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(progression_id)
       DO UPDATE SET mastery_level = excluded.mastery_level, updated_at = excluded.updated_at`,
      [progressionId, level, Date.now()],
    );
  },
};
