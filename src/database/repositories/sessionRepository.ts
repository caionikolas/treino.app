import { getDb } from '../connection';
import { WorkoutSession, SessionSet } from '@/types/session';

interface SessionRow {
  id: string;
  workout_id: string;
  started_at: number;
  finished_at: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

function rowToSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    workoutId: row.workout_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    notes: row.notes,
  };
}

export const sessionRepository = {
  async insert(session: WorkoutSession, sets: SessionSet[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO workout_sessions
           (id, workout_id, started_at, finished_at, duration_seconds, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.workoutId,
          session.startedAt,
          session.finishedAt,
          session.durationSeconds,
          session.notes,
        ],
      );
      for (const s of sets) {
        await tx.execute(
          `INSERT INTO session_sets
             (id, session_id, exercise_id, set_number, reps, weight_kg, completed, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.sessionId,
            s.exerciseId,
            s.setNumber,
            s.reps,
            s.weightKg,
            s.completed,
            s.notes,
          ],
        );
      }
    });
  },

  async findRecent(limit: number = 20): Promise<WorkoutSession[]> {
    const db = getDb();
    const result = await db.execute(
      'SELECT * FROM workout_sessions ORDER BY started_at DESC LIMIT ?',
      [limit],
    );
    return (result.rows ?? []).map(r => rowToSession(r as unknown as SessionRow));
  },
};
