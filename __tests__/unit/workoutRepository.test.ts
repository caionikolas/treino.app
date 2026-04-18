import { runMigrations } from '@/database/migrations';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { Workout, WorkoutExercise } from '@/types/workout';

// Mock getDb to use an in-memory better-sqlite3 DB, wrapped to match op-sqlite API.
jest.mock('@/database/connection', () => {
  const Database = require('better-sqlite3');

  function wrap(db: any) {
    const executeSync = (sql: string, params?: unknown[]) => {
      const stmt = db.prepare(sql);
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT')
        || sql.trim().toUpperCase().startsWith('PRAGMA');
      if (isSelect && stmt.reader) {
        const rows = params && params.length ? stmt.all(...params) : stmt.all();
        return { rows, rowsAffected: 0 };
      }
      const info = params && params.length ? stmt.run(...params) : stmt.run();
      return { rows: [], rowsAffected: info.changes };
    };
    const execute = async (sql: string, params?: unknown[]) => executeSync(sql, params);
    const transaction = async (fn: (tx: any) => Promise<void>) => {
      executeSync('BEGIN');
      try {
        await fn({ execute });
        executeSync('COMMIT');
      } catch (err) {
        executeSync('ROLLBACK');
        throw err;
      }
    };
    const close = () => db.close();
    return { executeSync, execute, transaction, close };
  }

  let inst: any = null;
  return {
    getDb: () => {
      if (!inst) {
        const rawDb = new Database(':memory:');
        inst = wrap(rawDb);
        inst.executeSync('PRAGMA foreign_keys = ON');
      }
      return inst;
    },
    __resetDb: () => {
      if (inst) {
        inst.close();
        inst = null;
      }
    },
  };
});

beforeEach(async () => {
  const { __resetDb, getDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
  // Seed exercises referenced by tests (FK targets)
  const db = getDb();
  for (const exId of ['ex-chest-01', 'ex-chest-02']) {
    await db.execute(
      `INSERT INTO exercises (id, name, muscle_group, category, media_filename, instructions, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?)`,
      [exId, exId, 'chest', 'musculacao', Date.now()],
    );
  }
});

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  const now = Date.now();
  return {
    id: 'w-1',
    name: 'Treino A',
    description: null,
    color: '#E94560',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: 'we-1',
    workoutId: 'w-1',
    exerciseId: 'ex-chest-01',
    orderIndex: 0,
    sets: 4,
    reps: '12',
    restSeconds: 90,
    notes: null,
    ...overrides,
  };
}

describe('workoutRepository', () => {
  it('insert + findById round-trips the workout and its exercises', async () => {
    const workout = makeWorkout();
    const exercises = [makeExercise({ id: 'we-1', orderIndex: 0 })];

    await workoutRepository.insert(workout, exercises);
    const result = await workoutRepository.findById('w-1');

    expect(result).not.toBeNull();
    expect(result!.workout.name).toBe('Treino A');
    expect(result!.exercises.length).toBe(1);
    expect(result!.exercises[0].exerciseId).toBe('ex-chest-01');
  });

  it('findAllSummaries returns workouts ordered by updatedAt desc with exercise count', async () => {
    const older = makeWorkout({ id: 'w-old', name: 'Velho', updatedAt: 1000 });
    const newer = makeWorkout({ id: 'w-new', name: 'Novo', updatedAt: 2000 });

    await workoutRepository.insert(older, [makeExercise({ workoutId: 'w-old', id: 'we-o1' })]);
    await workoutRepository.insert(newer, [
      makeExercise({ workoutId: 'w-new', id: 'we-n1', orderIndex: 0 }),
      makeExercise({ workoutId: 'w-new', id: 'we-n2', orderIndex: 1, exerciseId: 'ex-chest-02' }),
    ]);

    const list = await workoutRepository.findAllSummaries();
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('w-new');
    expect(list[0].exerciseCount).toBe(2);
    expect(list[1].id).toBe('w-old');
    expect(list[1].exerciseCount).toBe(1);
  });

  it('update replaces workout fields and exercises (delete-all + insert-all)', async () => {
    await workoutRepository.insert(makeWorkout(), [
      makeExercise({ id: 'we-old', orderIndex: 0, sets: 4 }),
    ]);

    const updatedWorkout = { ...makeWorkout(), name: 'Renomeado', color: '#00B894' };
    const newExercises = [
      makeExercise({ id: 'we-new-1', orderIndex: 0, sets: 5, exerciseId: 'ex-chest-02' }),
    ];
    await workoutRepository.update('w-1', updatedWorkout, newExercises);

    const result = await workoutRepository.findById('w-1');
    expect(result!.workout.name).toBe('Renomeado');
    expect(result!.workout.color).toBe('#00B894');
    expect(result!.exercises.length).toBe(1);
    expect(result!.exercises[0].id).toBe('we-new-1');
    expect(result!.exercises[0].sets).toBe(5);
  });

  it('delete removes workout and cascades to workout_exercises', async () => {
    await workoutRepository.insert(makeWorkout(), [makeExercise({ id: 'we-1' })]);
    await workoutRepository.delete('w-1');

    expect(await workoutRepository.findById('w-1')).toBeNull();

    const { getDb } = require('@/database/connection');
    const res = await getDb().execute('SELECT COUNT(*) as c FROM workout_exercises');
    expect((res.rows?.[0] as any)?.c).toBe(0);
  });

  it('findById returns null for unknown id', async () => {
    expect(await workoutRepository.findById('does-not-exist')).toBeNull();
  });

  it('findAllSummaries includes isFavorite and sorts favorites first', async () => {
    const now = Date.now();
    const fav = makeWorkout({ id: 'w-fav', name: 'Favorito', updatedAt: now - 1000 });
    const reg = makeWorkout({ id: 'w-reg', name: 'Regular', updatedAt: now });

    await workoutRepository.insert(fav, [makeExercise({ workoutId: 'w-fav', id: 'we-f1' })]);
    await workoutRepository.insert(reg, [makeExercise({ workoutId: 'w-reg', id: 'we-r1' })]);

    await workoutRepository.toggleFavorite('w-fav');

    const list = await workoutRepository.findAllSummaries();
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('w-fav');
    expect(list[0].isFavorite).toBe(true);
    expect(list[1].id).toBe('w-reg');
    expect(list[1].isFavorite).toBe(false);
  });

  it('toggleFavorite flips the value', async () => {
    await workoutRepository.insert(makeWorkout(), [makeExercise()]);

    await workoutRepository.toggleFavorite('w-1');
    let list = await workoutRepository.findAllSummaries();
    expect(list[0].isFavorite).toBe(true);

    await workoutRepository.toggleFavorite('w-1');
    list = await workoutRepository.findAllSummaries();
    expect(list[0].isFavorite).toBe(false);
  });
});
