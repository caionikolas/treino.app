# CRUD de Treinos (Fase 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a tab "Treinos" 100% funcional: criar, editar, duplicar, apagar treinos; adicionar, configurar, reordenar e remover exercícios dentro de um treino.

**Architecture:** Adiciona `WorkoutStack` (substitui `ComingSoonScreen` na tab Treinos) com 4 screens. Persistência via `workoutRepository` em `op-sqlite`. Dois Zustand stores: um para a lista (`useWorkoutStore`) e um para o rascunho durante edição (`useWorkoutDraftStore`). Reusa a biblioteca de exercícios para o picker.

**Tech Stack:** React Native 0.85.1, TypeScript, op-sqlite (async), Zustand, React Navigation native-stack + bottom-tabs.

**Spec de referência:** `docs/superpowers/specs/2026-04-18-crud-treinos-design.md`

**Convenções:**
- Assets/código em inglês; strings de UI em PT-BR
- Defaults de exercício no treino: `sets=4, reps="12", restSeconds=90`
- Cor default: `#E94560` (primeira da paleta, accent do tema)
- Todos os métodos de repositório são **async** (op-sqlite v15 é async)

---

## Task 1: Constantes — paleta de cores de treinos

**Files:**
- Create: `src/constants/workoutColors.ts`

- [ ] **Step 1: Criar `src/constants/workoutColors.ts`**

```typescript
export const WORKOUT_COLORS = [
  '#E94560',
  '#3282B8',
  '#6A4C93',
  '#F39C12',
  '#00B894',
  '#FD79A8',
  '#FDCB6E',
  '#A29BFE',
  '#00CEC9',
  '#E17055',
] as const;

export const DEFAULT_WORKOUT_COLOR = WORKOUT_COLORS[0];
```

- [ ] **Step 2: Verificar**

Run: `pnpm tsc --noEmit`
Expected: exit 0, nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add src/constants/workoutColors.ts
git commit -m "feat: add workout color palette"
```

---

## Task 2: Types — Workout, WorkoutExercise, WorkoutSummary, DraftExercise

**Files:**
- Create: `src/types/workout.ts`

- [ ] **Step 1: Criar `src/types/workout.ts`**

```typescript
import { MuscleGroupKey } from '@/constants/muscleGroups';

export interface Workout {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string | null;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  color: string;
  exerciseCount: number;
  updatedAt: number;
}

export interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupKey;
  sets: number;
  reps: string;
  restSeconds: number;
}
```

- [ ] **Step 2: Verificar**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/types/workout.ts
git commit -m "feat: add Workout, WorkoutExercise, WorkoutSummary, DraftExercise types"
```

---

## Task 3: workoutRepository (TDD)

**Files:**
- Create: `src/database/repositories/workoutRepository.ts`
- Create: `__tests__/unit/workoutRepository.test.ts`

Note: op-sqlite's `execute` and `transaction` are async. Row types arrive as `Record<string, Scalar>`; cast through `as unknown as RowType` when narrowing.

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/unit/workoutRepository.test.ts`:

```typescript
import { open } from '@op-engineering/op-sqlite';
import { runMigrations } from '@/database/migrations';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { Workout, WorkoutExercise } from '@/types/workout';

// Mock getDb to use an in-memory DB per test
jest.mock('@/database/connection', () => {
  const { open } = require('@op-engineering/op-sqlite');
  let inst: any = null;
  return {
    getDb: () => {
      if (!inst) {
        inst = open({ name: ':memory:' });
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
  const { __resetDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
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
});
```

- [ ] **Step 2: Rodar teste — deve FALHAR com "Cannot find module"**

Run: `pnpm test workoutRepository`
Expected: FAIL — `Cannot find module '@/database/repositories/workoutRepository'`.

- [ ] **Step 3: Implementar `src/database/repositories/workoutRepository.ts`**

```typescript
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
```

- [ ] **Step 4: Rodar teste — deve PASSAR**

Run: `pnpm test workoutRepository`
Expected: PASS (5 tests).

- [ ] **Step 5: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/database/repositories/workoutRepository.ts __tests__/unit/workoutRepository.test.ts
git commit -m "feat: add workoutRepository with CRUD + cascade delete"
```

---

## Task 4: useWorkoutDraftStore (TDD)

**Files:**
- Create: `src/store/useWorkoutDraftStore.ts`
- Create: `__tests__/unit/useWorkoutDraftStore.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/unit/useWorkoutDraftStore.test.ts`:

```typescript
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';

describe('useWorkoutDraftStore', () => {
  beforeEach(() => {
    useWorkoutDraftStore.getState().reset();
  });

  it('loadNew initializes with empty state and default color', () => {
    useWorkoutDraftStore.getState().loadNew();
    const s = useWorkoutDraftStore.getState();
    expect(s.id).toBeNull();
    expect(s.name).toBe('');
    expect(s.color).toBe('#E94560');
    expect(s.exercises).toEqual([]);
    expect(s.isDirty()).toBe(false);
  });

  it('addExercise appends with defaults 4x12 and 90s rest', () => {
    useWorkoutDraftStore.getState().loadNew();
    useWorkoutDraftStore.getState().addExercise('ex-1', 'Supino', 'chest');
    const s = useWorkoutDraftStore.getState();
    expect(s.exercises.length).toBe(1);
    expect(s.exercises[0]).toEqual({
      exerciseId: 'ex-1',
      exerciseName: 'Supino',
      muscleGroup: 'chest',
      sets: 4,
      reps: '12',
      restSeconds: 90,
    });
  });

  it('hasExercise returns true/false correctly', () => {
    useWorkoutDraftStore.getState().loadNew();
    useWorkoutDraftStore.getState().addExercise('ex-1', 'Supino', 'chest');
    expect(useWorkoutDraftStore.getState().hasExercise('ex-1')).toBe(true);
    expect(useWorkoutDraftStore.getState().hasExercise('ex-2')).toBe(false);
  });

  it('moveUp(0) is a no-op; moveDown(last) is a no-op', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');

    s.moveUp(0);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['a', 'b']);

    s.moveDown(1);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['a', 'b']);
  });

  it('moveUp(1) swaps items 0 and 1', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');
    s.moveUp(1);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['b', 'a']);
  });

  it('moveDown(0) swaps items 0 and 1', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');
    s.moveDown(0);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['b', 'a']);
  });

  it('removeExercise drops the item at index', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.addExercise('b', 'B', 'chest');
    s.removeExercise(0);
    expect(useWorkoutDraftStore.getState().exercises.map(e => e.exerciseId)).toEqual(['b']);
  });

  it('updateExerciseConfig patches only specified fields', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    s.addExercise('a', 'A', 'chest');
    s.updateExerciseConfig(0, { sets: 5, restSeconds: 120 });
    const ex = useWorkoutDraftStore.getState().exercises[0];
    expect(ex.sets).toBe(5);
    expect(ex.reps).toBe('12');
    expect(ex.restSeconds).toBe(120);
  });

  it('isDirty detects name, color, and exercise changes', () => {
    const s = useWorkoutDraftStore.getState();
    s.loadNew();
    expect(s.isDirty()).toBe(false);

    s.updateName('New Name');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().updateColor('#00B894');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);

    s.loadNew();
    useWorkoutDraftStore.getState().addExercise('a', 'A', 'chest');
    expect(useWorkoutDraftStore.getState().isDirty()).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar teste — deve FALHAR**

Run: `pnpm test useWorkoutDraftStore`
Expected: FAIL — `Cannot find module '@/store/useWorkoutDraftStore'`.

- [ ] **Step 3: Implementar `src/store/useWorkoutDraftStore.ts`**

```typescript
import { create } from 'zustand';
import { DraftExercise, Workout, WorkoutExercise } from '@/types/workout';
import { DEFAULT_WORKOUT_COLOR } from '@/constants/workoutColors';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { generateId } from '@/utils/generateId';

interface DraftState {
  id: string | null;
  name: string;
  color: string;
  exercises: DraftExercise[];
  originalSnapshot: string;

  loadNew: () => void;
  loadExisting: (
    id: string,
    exerciseLookup: (exerciseId: string) => { name: string; muscleGroup: MuscleGroupKey } | undefined,
  ) => Promise<void>;
  updateName: (name: string) => void;
  updateColor: (color: string) => void;
  addExercise: (exerciseId: string, exerciseName: string, muscleGroup: MuscleGroupKey) => void;
  removeExercise: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  updateExerciseConfig: (
    index: number,
    patch: Partial<Pick<DraftExercise, 'sets' | 'reps' | 'restSeconds'>>,
  ) => void;
  hasExercise: (exerciseId: string) => boolean;
  isDirty: () => boolean;
  toPersist: () => { workout: Workout; exercises: WorkoutExercise[] };
  reset: () => void;
}

function snapshotOf(name: string, color: string, exercises: DraftExercise[]): string {
  return JSON.stringify({ name, color, exercises });
}

export const useWorkoutDraftStore = create<DraftState>((set, get) => ({
  id: null,
  name: '',
  color: DEFAULT_WORKOUT_COLOR,
  exercises: [],
  originalSnapshot: '',

  loadNew: () => {
    const snap = snapshotOf('', DEFAULT_WORKOUT_COLOR, []);
    set({
      id: null,
      name: '',
      color: DEFAULT_WORKOUT_COLOR,
      exercises: [],
      originalSnapshot: snap,
    });
  },

  loadExisting: async (id, exerciseLookup) => {
    const data = await workoutRepository.findById(id);
    if (!data) {
      get().loadNew();
      return;
    }
    const exercises: DraftExercise[] = data.exercises.map(e => {
      const info = exerciseLookup(e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        exerciseName: info?.name ?? e.exerciseId,
        muscleGroup: info?.muscleGroup ?? 'chest',
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      };
    });
    const snap = snapshotOf(data.workout.name, data.workout.color, exercises);
    set({
      id: data.workout.id,
      name: data.workout.name,
      color: data.workout.color,
      exercises,
      originalSnapshot: snap,
    });
  },

  updateName: (name) => set({ name }),
  updateColor: (color) => set({ color }),

  addExercise: (exerciseId, exerciseName, muscleGroup) => {
    set(state => ({
      exercises: [
        ...state.exercises,
        { exerciseId, exerciseName, muscleGroup, sets: 4, reps: '12', restSeconds: 90 },
      ],
    }));
  },

  removeExercise: (index) => {
    set(state => ({
      exercises: state.exercises.filter((_, i) => i !== index),
    }));
  },

  moveUp: (index) => {
    set(state => {
      if (index <= 0 || index >= state.exercises.length) return {};
      const next = [...state.exercises];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return { exercises: next };
    });
  },

  moveDown: (index) => {
    set(state => {
      if (index < 0 || index >= state.exercises.length - 1) return {};
      const next = [...state.exercises];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return { exercises: next };
    });
  },

  updateExerciseConfig: (index, patch) => {
    set(state => ({
      exercises: state.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  },

  hasExercise: (exerciseId) => get().exercises.some(e => e.exerciseId === exerciseId),

  isDirty: () => {
    const { name, color, exercises, originalSnapshot } = get();
    return snapshotOf(name, color, exercises) !== originalSnapshot;
  },

  toPersist: () => {
    const { id, name, color, exercises } = get();
    const now = Date.now();
    const workoutId = id ?? generateId();
    const workout: Workout = {
      id: workoutId,
      name: name.trim(),
      description: null,
      color,
      createdAt: now,
      updatedAt: now,
    };
    const workoutExercises: WorkoutExercise[] = exercises.map((e, i) => ({
      id: generateId(),
      workoutId,
      exerciseId: e.exerciseId,
      orderIndex: i,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      notes: null,
    }));
    return { workout, exercises: workoutExercises };
  },

  reset: () => set({
    id: null,
    name: '',
    color: DEFAULT_WORKOUT_COLOR,
    exercises: [],
    originalSnapshot: '',
  }),
}));
```

- [ ] **Step 4: Rodar teste — deve PASSAR**

Run: `pnpm test useWorkoutDraftStore`
Expected: PASS (9 tests).

- [ ] **Step 5: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/store/useWorkoutDraftStore.ts __tests__/unit/useWorkoutDraftStore.test.ts
git commit -m "feat: add useWorkoutDraftStore with reorder and dirty tracking"
```

---

## Task 5: useWorkoutStore

**Files:**
- Create: `src/store/useWorkoutStore.ts`

- [ ] **Step 1: Criar `src/store/useWorkoutStore.ts`**

```typescript
import { create } from 'zustand';
import { WorkoutSummary, Workout, WorkoutExercise } from '@/types/workout';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { generateId } from '@/utils/generateId';

interface WorkoutState {
  summaries: WorkoutSummary[];
  loaded: boolean;

  load: () => Promise<void>;
  save: (workout: Workout, exercises: WorkoutExercise[], isNew: boolean) => Promise<void>;
  duplicate: (id: string) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  summaries: [],
  loaded: false,

  load: async () => {
    const summaries = await workoutRepository.findAllSummaries();
    set({ summaries, loaded: true });
  },

  save: async (workout, exercises, isNew) => {
    if (isNew) {
      await workoutRepository.insert(workout, exercises);
    } else {
      await workoutRepository.update(workout.id, workout, exercises);
    }
    await get().load();
  },

  duplicate: async (id) => {
    const original = await workoutRepository.findById(id);
    if (!original) return null;

    const now = Date.now();
    const newId = generateId();
    const newWorkout: Workout = {
      ...original.workout,
      id: newId,
      name: `${original.workout.name} (cópia)`,
      createdAt: now,
      updatedAt: now,
    };
    const newExercises: WorkoutExercise[] = original.exercises.map((e, i) => ({
      ...e,
      id: generateId(),
      workoutId: newId,
      orderIndex: i,
    }));
    await workoutRepository.insert(newWorkout, newExercises);
    await get().load();
    return newId;
  },

  remove: async (id) => {
    await workoutRepository.delete(id);
    await get().load();
  },
}));
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/store/useWorkoutStore.ts
git commit -m "feat: add useWorkoutStore for list + duplicate + remove"
```

---

## Task 6: ColorPicker component

**Files:**
- Create: `src/components/workout/ColorPicker.tsx`

- [ ] **Step 1: Criar `src/components/workout/ColorPicker.tsx`**

```typescript
import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { WORKOUT_COLORS } from '@/constants/workoutColors';
import { colors, spacing, typography } from '@/theme';

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  palette?: readonly string[];
}

export function ColorPicker({ value, onChange, label, palette = WORKOUT_COLORS }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {palette.map(color => {
          const selected = color === value;
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              style={[styles.circle, { backgroundColor: color }, selected && styles.selected]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selected: {
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/ColorPicker.tsx
git commit -m "feat: add ColorPicker component"
```

---

## Task 7: WorkoutFormFields component

**Files:**
- Create: `src/components/workout/WorkoutFormFields.tsx`

- [ ] **Step 1: Criar `src/components/workout/WorkoutFormFields.tsx`**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '@/components/common';
import { ColorPicker } from './ColorPicker';
import { spacing } from '@/theme';

interface Props {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
}

export function WorkoutFormFields({ name, color, onNameChange, onColorChange }: Props) {
  return (
    <View style={styles.wrapper}>
      <Input label="Nome" value={name} onChangeText={onNameChange} placeholder="Ex: Treino A - Peito" />
      <ColorPicker label="Cor" value={color} onChange={onColorChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/WorkoutFormFields.tsx
git commit -m "feat: add WorkoutFormFields (name + color grouped)"
```

---

## Task 8: WorkoutExerciseRow component

**Files:**
- Create: `src/components/workout/WorkoutExerciseRow.tsx`

- [ ] **Step 1: Criar `src/components/workout/WorkoutExerciseRow.tsx`**

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card } from '@/components/common';
import { DraftExercise } from '@/types/workout';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exercise: DraftExercise;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function summaryText(e: DraftExercise): string {
  return `${e.sets}x${e.reps} • ${e.restSeconds}s`;
}

export function WorkoutExerciseRow({
  exercise,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onRemove,
}: Props) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{exercise.exerciseName}</Text>
          <Text style={styles.summary}>{summaryText(exercise)}</Text>
        </View>
        <View style={styles.actions}>
          <IconBtn name="arrow-upward" onPress={onMoveUp} disabled={isFirst} />
          <IconBtn name="arrow-downward" onPress={onMoveDown} disabled={isLast} />
          <IconBtn name="edit" onPress={onEdit} />
          <IconBtn name="delete-outline" onPress={onRemove} />
        </View>
      </View>
    </Card>
  );
}

function IconBtn({
  name,
  onPress,
  disabled,
}: {
  name: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.iconBtn, pressed && !disabled && styles.iconBtnPressed]}
    >
      <Icon name={name} size={24} color={disabled ? colors.border : colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm, padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, paddingLeft: spacing.sm },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  summary: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { opacity: 0.6 },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/WorkoutExerciseRow.tsx
git commit -m "feat: add WorkoutExerciseRow with up/down/edit/delete controls"
```

---

## Task 9: WorkoutCard component + barrel

**Files:**
- Create: `src/components/workout/WorkoutCard.tsx`
- Create: `src/components/workout/index.ts`

- [ ] **Step 1: Criar `src/components/workout/WorkoutCard.tsx`**

```typescript
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { WorkoutSummary } from '@/types/workout';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  workout: WorkoutSummary;
  onPress: () => void;
  onLongPress: () => void;
}

export function WorkoutCard({ workout, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: workout.color },
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Text style={styles.name} numberOfLines={2}>{workout.name}</Text>
        <Text style={styles.subtitle}>
          {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercício' : 'exercícios'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  name: { ...typography.heading, color: colors.textPrimary, fontWeight: '700' },
  subtitle: { ...typography.caption, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Criar `src/components/workout/index.ts`**

```typescript
export { ColorPicker } from './ColorPicker';
export { WorkoutFormFields } from './WorkoutFormFields';
export { WorkoutExerciseRow } from './WorkoutExerciseRow';
export { WorkoutCard } from './WorkoutCard';
```

- [ ] **Step 3: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/workout/
git commit -m "feat: add WorkoutCard and workout components barrel"
```

---

## Task 10: ExerciseInWorkoutScreen

**Files:**
- Create: `src/screens/workout/ExerciseInWorkoutScreen.tsx`

- [ ] **Step 1: Criar `src/screens/workout/ExerciseInWorkoutScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, Button, EmptyState } from '@/components/common';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExerciseInWorkout'>;

export function ExerciseInWorkoutScreen({ route, navigation }: Props) {
  const { index } = route.params;
  const exercise = useWorkoutDraftStore(s => s.exercises[index]);
  const updateExerciseConfig = useWorkoutDraftStore(s => s.updateExerciseConfig);

  const [sets, setSets] = useState<string>(exercise ? String(exercise.sets) : '4');
  const [reps, setReps] = useState<string>(exercise?.reps ?? '12');
  const [rest, setRest] = useState<string>(exercise ? String(exercise.restSeconds) : '90');

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Exercício não encontrado" />
      </SafeAreaView>
    );
  }

  const onSave = () => {
    const parsedSets = Math.max(1, parseInt(sets, 10) || 1);
    const parsedRest = Math.max(0, parseInt(rest, 10) || 0);
    updateExerciseConfig(index, {
      sets: parsedSets,
      reps: reps.trim() || '12',
      restSeconds: parsedRest,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{exercise.exerciseName}</Text>
        <Input
          label="Séries"
          value={sets}
          onChangeText={setSets}
          keyboardType="number-pad"
        />
        <Input
          label="Repetições"
          value={reps}
          onChangeText={setReps}
          placeholder='Ex: 12 ou 8-12'
        />
        <Input
          label="Descanso (segundos)"
          value={rest}
          onChangeText={setRest}
          keyboardType="number-pad"
        />
        <View style={styles.buttons}>
          <Button label="Cancelar" variant="ghost" onPress={() => navigation.goBack()} style={styles.btn} />
          <Button label="Salvar" onPress={onSave} style={styles.btn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: will fail because `WorkoutStack` doesn't exist yet — stub it for now.

- [ ] **Step 3: Stub `src/navigation/WorkoutStack.tsx`**

Create temporary stub to allow tsc:

```typescript
import { NavigatorScreenParams } from '@react-navigation/native';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutForm: { mode: 'new' } | { mode: 'edit'; id: string };
  ExercisePicker: undefined;
  ExerciseInWorkout: { index: number };
};

// Real implementation comes in later task
```

- [ ] **Step 4: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/screens/workout/ExerciseInWorkoutScreen.tsx src/navigation/WorkoutStack.tsx
git commit -m "feat: add ExerciseInWorkoutScreen for editing sets/reps/rest"
```

---

## Task 11: ExercisePickerScreen

**Files:**
- Create: `src/screens/workout/ExercisePickerScreen.tsx`

O picker reusa `ExerciseCard`, `MuscleGroupFilter`, `CategoryFilter`, `useExerciseStore`. Diferenças: ao tocar adiciona ao draft com feedback visual; botão "Concluído" no header. Exercícios já no draft aparecem com opacity reduzida e são no-op.

- [ ] **Step 1: Criar `src/screens/workout/ExercisePickerScreen.tsx`**

```typescript
import React, { useLayoutEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Pressable, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useExerciseStore } from '@/store/useExerciseStore';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import {
  ExerciseCard,
  MuscleGroupFilter,
  CategoryFilter,
} from '@/components/exercise';
import { Input, EmptyState } from '@/components/common';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExercisePicker'>;

export function ExercisePickerScreen({ navigation }: Props) {
  const {
    search, setSearch,
    muscleGroup, setMuscleGroup,
    category, setCategory,
    filtered,
  } = useExerciseStore();

  const addExercise = useWorkoutDraftStore(s => s.addExercise);
  const hasExercise = useWorkoutDraftStore(s => s.hasExercise);
  const addedCount = useWorkoutDraftStore(s => s.exercises.length);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.goBack()} style={styles.doneBtn}>
          <Text style={styles.doneTxt}>Concluído</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const data = filtered();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.subtitle}>
        {addedCount} {addedCount === 1 ? 'exercício adicionado' : 'exercícios adicionados'}
      </Text>
      <View style={styles.searchWrapper}>
        <Input
          placeholder="Buscar exercício..."
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <MuscleGroupFilter value={muscleGroup} onChange={setMuscleGroup} />
      <CategoryFilter value={category} onChange={setCategory} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const already = hasExercise(item.id);
          return (
            <Pressable
              disabled={already}
              onPress={() => addExercise(item.id, item.name, item.muscleGroup)}
              style={[already && styles.disabled]}
            >
              <ExerciseCard exercise={item} onPress={() => {
                if (!already) addExercise(item.id, item.name, item.muscleGroup);
              }} />
            </Pressable>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="search-off"
            title="Nenhum exercício encontrado"
            subtitle="Tente ajustar os filtros ou a busca"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subtitle: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  searchWrapper: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  list: { padding: spacing.md, flexGrow: 1 },
  disabled: { opacity: 0.4 },
  doneBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  doneTxt: { ...typography.body, color: colors.accent, fontWeight: '600' },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/ExercisePickerScreen.tsx
git commit -m "feat: add ExercisePickerScreen for multi-add from library"
```

---

## Task 12: WorkoutFormScreen

**Files:**
- Create: `src/screens/workout/WorkoutFormScreen.tsx`

Este é o componente mais complexo. Integra form fields, lista de exercícios do draft, picker de exercícios, e detecção de dirty-state. Usa `useExerciseStore` para o lookup ao carregar um treino existente.

- [ ] **Step 1: Criar `src/screens/workout/WorkoutFormScreen.tsx`**

```typescript
import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  Pressable,
  Alert,
  BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutFormFields, WorkoutExerciseRow } from '@/components/workout';
import { Button, EmptyState } from '@/components/common';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutForm'>;

export function WorkoutFormScreen({ route, navigation }: Props) {
  const mode = route.params.mode;
  const id = route.params.mode === 'edit' ? route.params.id : null;

  const draft = useWorkoutDraftStore();
  const save = useWorkoutStore(s => s.save);
  const allExercises = useExerciseStore(s => s.all);

  useEffect(() => {
    if (mode === 'new') {
      draft.loadNew();
    } else if (id) {
      draft.loadExisting(id, (exerciseId) => {
        const found = allExercises.find(e => e.id === exerciseId);
        if (!found) return undefined;
        return { name: found.name, muscleGroup: found.muscleGroup };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id]);

  const confirmDiscard = (onConfirm: () => void) => {
    if (!draft.isDirty()) {
      onConfirm();
      return;
    }
    Alert.alert(
      'Descartar alterações?',
      'As alterações feitas neste treino serão perdidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onConfirm },
      ],
    );
  };

  const onCancel = () => confirmDiscard(() => navigation.goBack());

  const canSave = draft.name.trim().length > 0;

  const onSave = async () => {
    const { workout, exercises } = draft.toPersist();
    await save(workout, exercises, mode === 'new');
    draft.reset();
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'new' ? 'Novo treino' : draft.name || 'Editar treino',
      headerLeft: () => (
        <Pressable onPress={onCancel} style={styles.headerBtn}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={canSave ? onSave : undefined}
          disabled={!canSave}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerSave, !canSave && styles.headerDisabled]}>Salvar</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, mode, draft.name, canSave, draft.exercises]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (draft.isDirty()) {
        confirmDiscard(() => navigation.goBack());
        return true;
      }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <WorkoutFormFields
          name={draft.name}
          color={draft.color}
          onNameChange={draft.updateName}
          onColorChange={draft.updateColor}
        />

        <Text style={styles.sectionTitle}>
          Exercícios ({draft.exercises.length})
        </Text>

        {draft.exercises.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              icon="fitness-center"
              title="Nenhum exercício"
              subtitle='Toque em "Adicionar exercício" para começar'
            />
          </View>
        ) : (
          draft.exercises.map((ex, index) => (
            <WorkoutExerciseRow
              key={`${ex.exerciseId}-${index}`}
              exercise={ex}
              index={index}
              total={draft.exercises.length}
              onMoveUp={() => draft.moveUp(index)}
              onMoveDown={() => draft.moveDown(index)}
              onEdit={() => navigation.navigate('ExerciseInWorkout', { index })}
              onRemove={() => draft.removeExercise(index)}
            />
          ))
        )}

        <Button
          label="Adicionar exercício"
          variant="secondary"
          onPress={() => navigation.navigate('ExercisePicker')}
          style={styles.addBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  empty: { minHeight: 160 },
  addBtn: { marginTop: spacing.md },
  headerBtn: { paddingHorizontal: spacing.sm },
  headerCancel: { ...typography.body, color: colors.textSecondary },
  headerSave: { ...typography.body, color: colors.accent, fontWeight: '600' },
  headerDisabled: { opacity: 0.4 },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutFormScreen.tsx
git commit -m "feat: add WorkoutFormScreen with dirty tracking and save"
```

---

## Task 13: WorkoutListScreen

**Files:**
- Create: `src/screens/workout/WorkoutListScreen.tsx`

- [ ] **Step 1: Criar `src/screens/workout/WorkoutListScreen.tsx`**

```typescript
import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Pressable, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutCard } from '@/components/workout';
import { EmptyState } from '@/components/common';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, radius } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutList'>;

export function WorkoutListScreen({ navigation }: Props) {
  const summaries = useWorkoutStore(s => s.summaries);
  const load = useWorkoutStore(s => s.load);
  const duplicate = useWorkoutStore(s => s.duplicate);
  const remove = useWorkoutStore(s => s.remove);

  useEffect(() => {
    load();
  }, [load]);

  const openMenu = (id: string, name: string) => {
    Alert.alert(name, undefined, [
      {
        text: 'Duplicar',
        onPress: async () => {
          const newId = await duplicate(id);
          if (newId) {
            navigation.navigate('WorkoutForm', { mode: 'edit', id: newId });
          }
        },
      },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Apagar treino?',
            'Esta ação não pode ser desfeita.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Apagar', style: 'destructive', onPress: () => remove(id) },
            ],
          );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => navigation.navigate('WorkoutForm', { mode: 'edit', id: item.id })}
            onLongPress={() => openMenu(item.id, item.name)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="fitness-center"
            title="Nenhum treino ainda"
            subtitle='Toque em + para criar seu primeiro treino'
          />
        }
      />
      <Pressable
        onPress={() => navigation.navigate('WorkoutForm', { mode: 'new' })}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Icon name="add" size={32} color={colors.textPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
});
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutListScreen.tsx
git commit -m "feat: add WorkoutListScreen with FAB and long-press menu"
```

---

## Task 14: WorkoutStack navigation

**Files:**
- Modify: `src/navigation/WorkoutStack.tsx` (substituir o stub do Task 10)

- [ ] **Step 1: Substituir `src/navigation/WorkoutStack.tsx` pelo navegador real**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkoutListScreen } from '@/screens/workout/WorkoutListScreen';
import { WorkoutFormScreen } from '@/screens/workout/WorkoutFormScreen';
import { ExercisePickerScreen } from '@/screens/workout/ExercisePickerScreen';
import { ExerciseInWorkoutScreen } from '@/screens/workout/ExerciseInWorkoutScreen';
import { colors } from '@/theme';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutForm: { mode: 'new' } | { mode: 'edit'; id: string };
  ExercisePicker: undefined;
  ExerciseInWorkout: { index: number };
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export function WorkoutStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutListScreen}
        options={{ title: 'Treinos' }}
      />
      <Stack.Screen
        name="WorkoutForm"
        component={WorkoutFormScreen}
        options={{ title: 'Treino' }}
      />
      <Stack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{ title: 'Adicionar exercícios' }}
      />
      <Stack.Screen
        name="ExerciseInWorkout"
        component={ExerciseInWorkoutScreen}
        options={{ title: 'Configurar' }}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/WorkoutStack.tsx
git commit -m "feat: wire up WorkoutStack with 4 screens"
```

---

## Task 15: Wire WorkoutStack no AppNavigator (substitui placeholder)

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Atualizar `src/navigation/AppNavigator.tsx`**

Substituir `WorkoutsPlaceholder` por `WorkoutStack`.

Abra o arquivo e:
- Adicione o import:
  ```typescript
  import { WorkoutStack } from './WorkoutStack';
  ```
- Remova a linha `const WorkoutsPlaceholder = () => <ComingSoonScreen title="Treinos" />;`
- Troque o `<Tab.Screen>` de `Workouts` para usar `component={WorkoutStack}`:
  ```typescript
  <Tab.Screen name="Workouts" component={WorkoutStack} options={{ title: 'Treinos' }} />
  ```

- [ ] **Step 2: Verificar tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: swap Workouts tab placeholder for WorkoutStack"
```

---

## Task 16: Smoke test manual no device + suite de testes

**Files:** nenhum (apenas validação). Se algo quebrar em device, abra um mini-fix.

- [ ] **Step 1: Rodar suite de testes unitários**

Run: `pnpm test`
Expected: todos os testes (generateId, mediaResolver, workoutRepository, useWorkoutDraftStore) passam.

- [ ] **Step 2: Rebuild Android e instalar**

```bash
export PATH=$PATH:$HOME/Android/Sdk/platform-tools
adb reverse tcp:8081 tcp:8081
pnpm start   # deixar rodando em background
```

Em outro terminal:
```bash
pnpm android
```

- [ ] **Step 3: Smoke test no device — checklist**

Abrir o app e validar:

- [ ] Tab "Treinos" mostra `EmptyState` "Nenhum treino ainda"
- [ ] FAB `+` abre tela "Novo treino"
- [ ] Salvar desabilitado sem nome
- [ ] Digitar nome + escolher cor → salvar desabilitado até ter nome; salva e volta pra lista
- [ ] Lista mostra o treino criado com fundo colorido e "0 exercícios"
- [ ] Tocar no card abre tela de edição com nome/cor preenchidos
- [ ] "Adicionar exercício" abre o picker; picker tem busca + filtros
- [ ] Tocar num exercício no picker atualiza contador ("1 exercício adicionado") e mostra o card com opacity reduzida
- [ ] Tocar em "Concluído" volta pro form com o exercício na lista
- [ ] Exercício mostra "4x12 • 90s"; botões ▲/▼ desabilitados corretamente com 1 item
- [ ] Adicionar 2 outros exercícios → ▲/▼ reordenam corretamente
- [ ] Tocar ✏ num exercício abre tela de config; editar séries (ex: 5) e salvar → volta com "5x12 • 90s"
- [ ] Tocar 🗑 remove o exercício
- [ ] Mudar algo e pressionar voltar do Android → dispara alerta "Descartar alterações?"
- [ ] Salvar treino → aparece na lista
- [ ] Long-press num card → menu com "Duplicar" / "Apagar"
- [ ] Duplicar → cria "{nome} (cópia)" e abre pra editar
- [ ] Apagar → dispara "Apagar treino?" com confirmação; treino some da lista
- [ ] Fechar app e abrir de novo → treinos persistem

- [ ] **Step 4: Se tudo OK, mark task complete. Se algo quebrar:**

Diagnose via `adb logcat -d | grep -iE 'reactnativejs|fatal|error.*treinoapp' | tail -30` e ajuste o componente relevante com mini-fixes. Commit cada fix.

---

## Notas para implementação

- **Jest transformIgnorePatterns**: já configurado em fase anterior para pnpm — não precisa mudar.
- **`@op-engineering/op-sqlite` com `:memory:`**: deve funcionar no ambiente Jest já configurado; se der erro, fallback é criar um arquivo temporário e apagar entre testes.
- **Ícones**: usamos `react-native-vector-icons/MaterialIcons`. Nomes usados aqui já existem no set (add, arrow-upward, arrow-downward, edit, delete-outline, fitness-center, error-outline, search-off).
- **Drag-and-drop foi recusado explicitamente** — não adicionar nenhuma lib nova. Se surgir vontade de adicionar, pare e consulte.
- **Vídeos não reproduzem** (known issue da Fase 2) — sem problema nesta fase, o picker usa `ExerciseCard` que já não renderiza vídeo.
- **Adicionar testes de UI** fora de escopo (apenas lógica unitária).
