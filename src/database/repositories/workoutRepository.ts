import { getDb } from '../connection';
import { Workout, WorkoutExercise, WorkoutSummary } from '@/types/workout';

interface WorkoutRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
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
  rest_seconds: number;
  notes: string | null;
}

interface SummaryRow {
  id: string;
  name: string;
  color: string;
  updated_at: number;
  exercise_count: number;
}

function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToExercise(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    sets: row.sets,
    reps: row.reps,
    restSeconds: row.rest_seconds,
    notes: row.notes,
  };
}

export const workoutRepository = {
  async findAllSummaries(): Promise<WorkoutSummary[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT w.id, w.name, w.color, w.updated_at,
              COUNT(we.id) AS exercise_count
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       GROUP BY w.id
       ORDER BY w.updated_at DESC`,
    );
    return (result.rows ?? []).map(r => {
      const row = r as unknown as SummaryRow;
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        updatedAt: row.updated_at,
        exerciseCount: typeof row.exercise_count === 'number' ? row.exercise_count : 0,
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
        `INSERT INTO workouts (id, name, description, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          workout.id,
          workout.name,
          workout.description,
          workout.color,
          workout.createdAt,
          workout.updatedAt,
        ],
      );
      for (const ex of exercises) {
        await tx.execute(
          `INSERT INTO workout_exercises
             (id, workout_id, exercise_id, order_index, sets, reps, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ex.id,
            ex.workoutId,
            ex.exerciseId,
            ex.orderIndex,
            ex.sets,
            ex.reps,
            ex.restSeconds,
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
           SET name = ?, description = ?, color = ?, updated_at = ?
         WHERE id = ?`,
        [workout.name, workout.description, workout.color, workout.updatedAt, id],
      );
      await tx.execute('DELETE FROM workout_exercises WHERE workout_id = ?', [id]);
      for (const ex of exercises) {
        await tx.execute(
          `INSERT INTO workout_exercises
             (id, workout_id, exercise_id, order_index, sets, reps, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ex.id,
            id,
            ex.exerciseId,
            ex.orderIndex,
            ex.sets,
            ex.reps,
            ex.restSeconds,
            ex.notes,
          ],
        );
      }
    });
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM workouts WHERE id = ?', [id]);
  },
};
