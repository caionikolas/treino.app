import { getDb } from '../connection';
import { Exercise } from '@/types/exercise';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { CategoryKey } from '@/constants/categories';

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  category: string;
  media_filename: string | null;
  instructions: string | null;
  created_at: number;
}

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroupKey,
    category: row.category as CategoryKey,
    mediaFilename: row.media_filename,
    instructions: row.instructions ?? '',
    createdAt: row.created_at,
  };
}

export const exerciseRepository = {
  async findAll(): Promise<Exercise[]> {
    const db = getDb();
    const result = await db.execute('SELECT * FROM exercises ORDER BY name ASC');
    return (result.rows ?? []).map(r => rowToExercise(r as unknown as ExerciseRow));
  },

  async findById(id: string): Promise<Exercise | null> {
    const db = getDb();
    const result = await db.execute('SELECT * FROM exercises WHERE id = ? LIMIT 1', [id]);
    const row = result.rows?.[0];
    return row ? rowToExercise(row as unknown as ExerciseRow) : null;
  },

  async count(): Promise<number> {
    const db = getDb();
    const result = await db.execute('SELECT COUNT(*) as c FROM exercises');
    const row = result.rows?.[0];
    const c = row?.c;
    return typeof c === 'number' ? c : 0;
  },

  async insertMany(exercises: Exercise[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      for (const ex of exercises) {
        await tx.execute(
          `INSERT INTO exercises (id, name, muscle_group, category, media_filename, instructions, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ex.id, ex.name, ex.muscleGroup, ex.category, ex.mediaFilename, ex.instructions, ex.createdAt],
        );
      }
    });
  },
};
