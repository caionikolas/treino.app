import { getDb } from '../connection';
import { WorkoutSession, SessionSet } from '@/types/session';
import { SessionDetail, StatsData } from '@/types/history';

interface SessionRow {
  id: string;
  workout_id: string;
  started_at: number;
  finished_at: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

interface DetailJoinRow {
  session_id: string;
  workout_id: string;
  started_at: number;
  finished_at: number | null;
  duration_seconds: number | null;
  session_notes: string | null;
  workout_name: string | null;
  workout_color: string | null;
  set_id: string | null;
  set_exercise_id: string | null;
  set_number: number | null;
  set_reps: number | null;
  set_weight_kg: number | null;
  set_completed: number | null;
  set_notes: string | null;
  exercise_name: string | null;
  exercise_muscle_group: string | null;
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

  async findByDateRange(startMs: number, endMs: number): Promise<WorkoutSession[]> {
    const db = getDb();
    const result = await db.execute(
      'SELECT * FROM workout_sessions WHERE started_at >= ? AND started_at < ? ORDER BY started_at DESC',
      [startMs, endMs],
    );
    return (result.rows ?? []).map(r => rowToSession(r as unknown as SessionRow));
  },

  async findDatesWithSessions(startMs: number, endMs: number): Promise<string[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT DISTINCT date(started_at / 1000, 'unixepoch', 'localtime') AS day
       FROM workout_sessions
       WHERE started_at >= ? AND started_at < ?
       ORDER BY day DESC`,
      [startMs, endMs],
    );
    return (result.rows ?? []).map(r => (r as any).day as string);
  },

  async findById(id: string): Promise<SessionDetail | null> {
    const db = getDb();
    const result = await db.execute(
      `SELECT ws.id AS session_id, ws.workout_id, ws.started_at, ws.finished_at,
              ws.duration_seconds, ws.notes AS session_notes,
              w.name AS workout_name, w.color AS workout_color,
              ss.id AS set_id, ss.exercise_id AS set_exercise_id,
              ss.set_number, ss.reps AS set_reps, ss.weight_kg AS set_weight_kg,
              ss.completed AS set_completed, ss.notes AS set_notes,
              e.name AS exercise_name, e.muscle_group AS exercise_muscle_group
       FROM workout_sessions ws
       LEFT JOIN workouts w ON w.id = ws.workout_id
       LEFT JOIN session_sets ss ON ss.session_id = ws.id
       LEFT JOIN exercises e ON e.id = ss.exercise_id
       WHERE ws.id = ?
       ORDER BY ss.set_number ASC`,
      [id],
    );

    const rows = (result.rows ?? []) as unknown as DetailJoinRow[];
    if (rows.length === 0) return null;

    const first = rows[0];
    const session: WorkoutSession = {
      id: first.session_id,
      workoutId: first.workout_id,
      startedAt: first.started_at,
      finishedAt: first.finished_at,
      durationSeconds: first.duration_seconds,
      notes: first.session_notes,
    };

    const workoutExists = first.workout_name !== null;

    const setsMap = new Map<string, SessionDetail['setsByExercise'][number]>();
    for (const row of rows) {
      if (!row.set_id || !row.set_exercise_id) continue;
      let group = setsMap.get(row.set_exercise_id);
      if (!group) {
        group = {
          exerciseId: row.set_exercise_id,
          exerciseName: row.exercise_name ?? row.set_exercise_id,
          muscleGroup: row.exercise_muscle_group ?? '',
          sets: [],
        };
        setsMap.set(row.set_exercise_id, group);
      }
      group.sets.push({
        id: row.set_id,
        sessionId: first.session_id,
        exerciseId: row.set_exercise_id,
        setNumber: row.set_number ?? 0,
        reps: row.set_reps ?? 0,
        weightKg: row.set_weight_kg,
        completed: row.set_completed ?? 0,
        notes: row.set_notes,
      });
    }

    return {
      session,
      workoutName: workoutExists ? first.workout_name! : 'Treino removido',
      workoutColor: workoutExists ? first.workout_color! : '#8E8E93',
      workoutExists,
      setsByExercise: Array.from(setsMap.values()),
    };
  },

  async findCompletedForWorkoutsSince(
    workoutIds: string[],
    since: number,
  ): Promise<{ workoutId: string; finishedAt: number }[]> {
    if (workoutIds.length === 0) return [];
    const db = getDb();
    const placeholders = workoutIds.map(() => '?').join(',');
    const result = await db.execute(
      `SELECT workout_id, finished_at FROM workout_sessions
       WHERE finished_at IS NOT NULL
         AND finished_at > ?
         AND workout_id IN (${placeholders})
       ORDER BY finished_at ASC`,
      [since, ...workoutIds],
    );
    return (result.rows ?? []).map(r => {
      const row = r as { workout_id: string; finished_at: number };
      return { workoutId: row.workout_id, finishedAt: row.finished_at };
    });
  },

  async getStats(): Promise<StatsData> {
    const db = getDb();

    const totalRow = (await db.execute(
      'SELECT COUNT(*) AS count FROM workout_sessions',
    )).rows?.[0] as any;
    const totalSessions = totalRow?.count ?? 0;

    if (totalSessions === 0) {
      return { sessionsThisMonth: 0, avgSessionsPerWeek: 0, avgDurationSeconds: 0, totalSessions: 0 };
    }

    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    const thisMonthRow = (await db.execute(
      'SELECT COUNT(*) AS count FROM workout_sessions WHERE started_at >= ?',
      [firstDay.getTime()],
    )).rows?.[0] as any;
    const sessionsThisMonth = thisMonthRow?.count ?? 0;

    const minRow = (await db.execute(
      'SELECT MIN(started_at) AS first FROM workout_sessions',
    )).rows?.[0] as any;
    const firstStart = (minRow?.first as number) ?? Date.now();
    const daysSinceFirst = Math.max(1, (Date.now() - firstStart) / (1000 * 60 * 60 * 24));
    const weeksSinceFirst = Math.max(1, Math.ceil(daysSinceFirst / 7));
    const avgSessionsPerWeek = totalSessions / weeksSinceFirst;

    const avgRow = (await db.execute(
      'SELECT AVG(duration_seconds) AS avg FROM workout_sessions WHERE finished_at IS NOT NULL',
    )).rows?.[0] as any;
    const avgDurationSeconds = Math.round((avgRow?.avg as number) ?? 0);

    return { sessionsThisMonth, avgSessionsPerWeek, avgDurationSeconds, totalSessions };
  },
};
