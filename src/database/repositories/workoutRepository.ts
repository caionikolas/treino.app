import { getDb } from '../connection';
import { Workout, WorkoutExercise, WorkoutSummary } from '@/types/workout';

interface WorkoutRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  default_sets: number | null;
  default_rest_seconds: number | null;
  created_at: number;
  updated_at: number;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  reps_per_set: string | null;
  rest_seconds: number;
  rest_enabled: number | null;
  warmup_enabled: number | null;
  warmup_reps: number | null;
  notes: string | null;
}

interface SummaryRow {
  id: string;
  name: string;
  color: string;
  updated_at: number;
  exercise_count: number;
  is_favorite: number;
}

function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    defaultSets: row.default_sets ?? 3,
    defaultRestSeconds: row.default_rest_seconds ?? 90,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToExercise(row: WorkoutExerciseRow): WorkoutExercise {
  let repsPerSet: number[] = [];
  try {
    const parsed = JSON.parse(row.reps_per_set ?? '[]');
    if (Array.isArray(parsed)) {
      repsPerSet = parsed.filter((n: unknown) => typeof n === 'number' && Number.isFinite(n));
    }
  } catch {
    repsPerSet = [];
  }
  const sets = repsPerSet.length || row.sets || 0;
  const reps = repsPerSet.length > 0 ? repsPerSet.join('-') : (row.reps ?? '');
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    sets,
    reps,
    repsPerSet,
    restSeconds: row.rest_seconds,
    restEnabled: row.rest_enabled === null || row.rest_enabled === undefined ? true : row.rest_enabled !== 0,
    warmupEnabled: row.warmup_enabled === 1,
    warmupReps: row.warmup_reps,
    notes: row.notes,
  };
}

export const workoutRepository = {
  async findAllSummaries(): Promise<WorkoutSummary[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT w.id, w.name, w.color, w.updated_at, w.is_favorite,
              COUNT(we.id) AS exercise_count
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       GROUP BY w.id
       ORDER BY w.is_favorite DESC, w.updated_at DESC`,
    );
    return (result.rows ?? []).map(r => {
      const row = r as unknown as SummaryRow;
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        updatedAt: row.updated_at,
        exerciseCount: typeof row.exercise_count === 'number' ? row.exercise_count : 0,
        isFavorite: row.is_favorite === 1,
      };
    });
  },

  async findById(id: string): Promise<{ workout: Workout; exercises: WorkoutExercise[] } | null> {
    const db = getDb();
    const wResult = await db.execute('SELECT * FROM workouts WHERE id = ? LIMIT 1', [id]);
    const wRow = wResult.rows?.[0];
    if (!wRow) return null;

    const eResult = await db.execute(
      'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC',
      [id],
    );
    const exercises = (eResult.rows ?? []).map(r =>
      rowToExercise(r as unknown as WorkoutExerciseRow),
    );

    return { workout: rowToWorkout(wRow as unknown as WorkoutRow), exercises };
  },

  async insert(workout: Workout, exercises: WorkoutExercise[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO workouts (id, name, description, color, default_sets, default_rest_seconds, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workout.id,
          workout.name,
          workout.description,
          workout.color,
          workout.defaultSets,
          workout.defaultRestSeconds,
          workout.createdAt,
          workout.updatedAt,
        ],
      );
      for (const ex of exercises) {
        await tx.execute(
          `INSERT INTO workout_exercises
             (id, workout_id, exercise_id, order_index, sets, reps, reps_per_set,
              rest_seconds, rest_enabled, warmup_enabled, warmup_reps, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ex.id,
            ex.workoutId,
            ex.exerciseId,
            ex.orderIndex,
            ex.repsPerSet.length,
            ex.repsPerSet.join('-') || '0',
            JSON.stringify(ex.repsPerSet),
            ex.restSeconds,
            ex.restEnabled ? 1 : 0,
            ex.warmupEnabled ? 1 : 0,
            ex.warmupReps,
            ex.notes,
          ],
        );
      }
    });
  },

  async update(id: string, workout: Workout, exercises: WorkoutExercise[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        `UPDATE workouts
           SET name = ?, description = ?, color = ?, default_sets = ?, default_rest_seconds = ?, updated_at = ?
         WHERE id = ?`,
        [
          workout.name,
          workout.description,
          workout.color,
          workout.defaultSets,
          workout.defaultRestSeconds,
          workout.updatedAt,
          id,
        ],
      );
      await tx.execute('DELETE FROM workout_exercises WHERE workout_id = ?', [id]);
      for (const ex of exercises) {
        await tx.execute(
          `INSERT INTO workout_exercises
             (id, workout_id, exercise_id, order_index, sets, reps, reps_per_set,
              rest_seconds, rest_enabled, warmup_enabled, warmup_reps, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ex.id,
            id,
            ex.exerciseId,
            ex.orderIndex,
            ex.repsPerSet.length,
            ex.repsPerSet.join('-') || '0',
            JSON.stringify(ex.repsPerSet),
            ex.restSeconds,
            ex.restEnabled ? 1 : 0,
            ex.warmupEnabled ? 1 : 0,
            ex.warmupReps,
            ex.notes,
          ],
        );
      }
    });
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    const result = await db.execute(
      'SELECT COUNT(*) AS c FROM plan_workouts WHERE workout_id = ?',
      [id],
    );
    const row = result.rows?.[0] as { c: number } | undefined;
    const count = row?.c ?? 0;
    if (count > 0) {
      throw new Error(`Este treino faz parte de ${count} plano(s). Remova-o dos planos antes de excluir.`);
    }
    await db.execute('DELETE FROM workouts WHERE id = ?', [id]);
  },

  async toggleFavorite(id: string): Promise<void> {
    const db = getDb();
    await db.execute(
      `UPDATE workouts
         SET is_favorite = CASE is_favorite WHEN 0 THEN 1 ELSE 0 END,
             updated_at = ?
       WHERE id = ?`,
      [Date.now(), id],
    );
  },
};
