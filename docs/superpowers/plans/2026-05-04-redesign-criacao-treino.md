# Redesign Criação de Treino — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever as telas de criação de treino e configuração de exercício para o design dos mockups (`treino1-4.png`), usando peso só na execução, séries com reps individuais e suporte a warm-up/toggle de descanso.

**Architecture:** Migration v4 adiciona colunas (`default_sets`, `default_rest_seconds` em `workouts`; `reps_per_set`, `warmup_enabled`, `warmup_reps`, `rest_enabled` em `workout_exercises`). Repository expõe os novos campos e mantém `sets`/`reps` derivados para retrocompatibilidade com a execução/histórico atuais. Lista de exercícios sai de `WorkoutFormScreen` e vai para `WorkoutPreviewScreen`. Novos componentes reutilizáveis (`SettingRow`, `Toggle`, `StepperModal`, `ColorPickerModal`, `WorkoutNameField`, `SetRow`) montam as telas redesenhadas.

**Tech Stack:** React Native CLI, TypeScript, Zustand, react-native-sqlite-storage (op-sqlite), React Navigation, Jest.

**Spec:** `docs/superpowers/specs/2026-05-04-redesign-criacao-treino-design.md`

---

## File map

**Create:**
- `src/components/common/SettingRow.tsx`
- `src/components/common/Toggle.tsx`
- `src/components/common/StepperModal.tsx`
- `src/components/workout/ColorPickerModal.tsx`
- `src/components/workout/WorkoutNameField.tsx`
- `src/components/workout/SetRow.tsx`
- `src/utils/parseRepsToArray.ts`
- `src/utils/formatRestTime.ts`
- `__tests__/unit/parseRepsToArray.test.ts`
- `__tests__/unit/workoutRepository.v4.test.ts`

**Modify:**
- `src/database/migrations.ts` (add v4)
- `src/database/repositories/workoutRepository.ts` (read/write new fields, derive `sets`/`reps`)
- `src/types/workout.ts` (add fields to `Workout`, `WorkoutExercise`, `DraftExercise`)
- `src/store/useWorkoutDraftStore.ts` (new fields + methods)
- `src/components/workout/WorkoutFormFields.tsx` (use SettingRow + modais)
- `src/components/workout/index.ts` (export novos)
- `src/components/common/index.ts` (export novos)
- `src/screens/workout/WorkoutFormScreen.tsx` (remove lista de exercícios; navega para Preview ao salvar)
- `src/screens/workout/WorkoutPreviewScreen.tsx` (gerencia exercícios)
- `src/screens/workout/ExerciseInWorkoutScreen.tsx` (redesign treino2.png)
- `__tests__/unit/useWorkoutDraftStore.test.ts` (cobrir novos métodos)
- `__tests__/unit/workoutRepository.test.ts` (cobrir novos campos)

**Out of scope (não tocar):** `WorkoutExecutionScreen`, `sessionRepository`, `useActiveSessionStore`, telas de histórico. Devem continuar funcionando via `sets`/`reps` derivados.

---

### Task 1: Util `parseRepsToArray` (migração de dados)

**Files:**
- Create: `src/utils/parseRepsToArray.ts`
- Test: `__tests__/unit/parseRepsToArray.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/unit/parseRepsToArray.test.ts
import { parseRepsToArray } from '../../src/utils/parseRepsToArray';

describe('parseRepsToArray', () => {
  it('repeats numeric reps for given sets count', () => {
    expect(parseRepsToArray('12', 4)).toEqual([12, 12, 12, 12]);
  });

  it('takes upper bound of "a-b" range', () => {
    expect(parseRepsToArray('8-12', 3)).toEqual([12, 12, 12]);
  });

  it('falls back to 10 for non-numeric reps', () => {
    expect(parseRepsToArray('até falha', 3)).toEqual([10, 10, 10]);
  });

  it('returns empty array when sets <= 0', () => {
    expect(parseRepsToArray('12', 0)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `npx jest parseRepsToArray -i`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement util**

```ts
// src/utils/parseRepsToArray.ts
export function parseRepsToArray(reps: string, sets: number): number[] {
  if (sets <= 0) return [];
  const trimmed = reps.trim();
  let value: number;
  const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    value = parseInt(range[2], 10);
  } else {
    const single = parseInt(trimmed, 10);
    value = Number.isFinite(single) ? single : 10;
  }
  return Array.from({ length: sets }, () => value);
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `npx jest parseRepsToArray -i`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/parseRepsToArray.ts __tests__/unit/parseRepsToArray.test.ts
git commit -m "feat(utils): add parseRepsToArray for v4 migration"
```

---

### Task 2: Util `formatRestTime`

**Files:**
- Create: `src/utils/formatRestTime.ts`

- [ ] **Step 1: Implement (sem teste, util trivial)**

```ts
// src/utils/formatRestTime.ts
export function formatRestTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/formatRestTime.ts
git commit -m "feat(utils): add formatRestTime helper"
```

---

### Task 3: Migration v4 (schema)

**Files:**
- Modify: `src/database/migrations.ts`

- [ ] **Step 1: Adicionar migration v4 ao array `MIGRATIONS`**

Adicione esta entrada após o objeto v3 (mantenha v1-v3 inalterados):

```ts
{
  version: 4,
  up: [
    `ALTER TABLE workouts ADD COLUMN default_sets INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE workouts ADD COLUMN default_rest_seconds INTEGER NOT NULL DEFAULT 90`,
    `ALTER TABLE workout_exercises ADD COLUMN reps_per_set TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE workout_exercises ADD COLUMN warmup_enabled INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE workout_exercises ADD COLUMN warmup_reps INTEGER`,
    `ALTER TABLE workout_exercises ADD COLUMN rest_enabled INTEGER NOT NULL DEFAULT 1`,
  ],
},
```

- [ ] **Step 2: Backfill `reps_per_set` para exercícios existentes**

A backfill precisa ser feita em código (não SQL puro). Depois do `for (const migration of pending)` aplicar normalmente, adicione um passo de pós-migração que detecta `reps_per_set = '[]'` e popula a partir de `sets` + `reps`. Adicione esta função e chame-a no final de `runMigrations`:

```ts
import { parseRepsToArray } from '@/utils/parseRepsToArray';

async function backfillRepsPerSet(): Promise<void> {
  const db = getDb();
  const result = await db.execute(
    `SELECT id, sets, reps FROM workout_exercises WHERE reps_per_set = '[]' OR reps_per_set IS NULL`,
  );
  const rows = (result.rows ?? []) as Array<{ id: string; sets: number; reps: string }>;
  for (const row of rows) {
    const arr = parseRepsToArray(row.reps, row.sets);
    await db.execute(
      'UPDATE workout_exercises SET reps_per_set = ? WHERE id = ?',
      [JSON.stringify(arr), row.id],
    );
  }
}

export async function runMigrations(): Promise<void> {
  const db = getDb();
  const current = await getCurrentVersion();
  const pending = MIGRATIONS.filter(m => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.transaction(async tx => {
      for (const stmt of migration.up) {
        await tx.execute(stmt);
      }
      await tx.execute('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        Date.now(),
      ]);
    });
    console.log(`Applied migration v${migration.version}`);
  }

  await backfillRepsPerSet();
}
```

- [ ] **Step 3: Verificar no device (depois das tasks de UI estarem prontas, voltar e validar)**

Boot do app não deve crashar; treinos antigos devem aparecer com séries preservadas.

- [ ] **Step 4: Commit**

```bash
git add src/database/migrations.ts
git commit -m "feat(db): add v4 migration with reps_per_set, warmup, rest toggle"
```

---

### Task 4: Atualizar tipos

**Files:**
- Modify: `src/types/workout.ts`

- [ ] **Step 1: Atualizar `Workout`, `WorkoutExercise`, `DraftExercise`**

Adicione/atualize os campos abaixo. Mantenha campos antigos (`sets`, `reps`) em `WorkoutExercise` por compatibilidade com execução/histórico — eles passarão a ser **derivados** no repository.

```ts
// src/types/workout.ts
export interface Workout {
  id: string;
  name: string;
  description: string | null;
  color: string;
  defaultSets: number;
  defaultRestSeconds: number;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  // legacy derived fields, mantidos para retrocompat
  sets: number;
  reps: string;
  // novos
  repsPerSet: number[];
  restSeconds: number;
  restEnabled: boolean;
  warmupEnabled: boolean;
  warmupReps: number | null;
  notes: string | null;
}

export interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: import('@/constants/muscleGroups').MuscleGroupKey;
  repsPerSet: number[];
  restSeconds: number;
  restEnabled: boolean;
  warmupEnabled: boolean;
  warmupReps: number | null;
}
```

(Se `WorkoutSummary` existe e está OK, não tocar.)

- [ ] **Step 2: Rodar typecheck**

Run: `npx tsc --noEmit`
Expected: vai aparecer um monte de erro nos consumers — vamos resolver nas próximas tasks. Por enquanto **não commit ainda**, ou commit junto com Task 5.

---

### Task 5: Atualizar repository (read/write novos campos + derivar legacy)

**Files:**
- Modify: `src/database/repositories/workoutRepository.ts`
- Modify: `__tests__/unit/workoutRepository.test.ts`

- [ ] **Step 1: Atualizar interfaces de row**

Substitua `WorkoutRow` e `WorkoutExerciseRow` por:

```ts
interface WorkoutRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  default_sets: number;
  default_rest_seconds: number;
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
  reps_per_set: string;       // JSON
  rest_seconds: number;
  rest_enabled: number;
  warmup_enabled: number;
  warmup_reps: number | null;
  notes: string | null;
}
```

- [ ] **Step 2: Atualizar mappers**

```ts
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
    if (Array.isArray(parsed)) repsPerSet = parsed.filter(n => Number.isFinite(n));
  } catch {
    repsPerSet = [];
  }
  const sets = repsPerSet.length || row.sets || 0;
  const reps = repsPerSet.length > 0
    ? repsPerSet.join('-')
    : (row.reps ?? '');
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    sets,
    reps,
    repsPerSet,
    restSeconds: row.rest_seconds,
    restEnabled: row.rest_enabled !== 0,
    warmupEnabled: row.warmup_enabled === 1,
    warmupReps: row.warmup_reps,
    notes: row.notes,
  };
}
```

- [ ] **Step 3: Atualizar `insert` e `update` para escrever novos campos**

Em `insert`, mude o INSERT do workout para incluir `default_sets, default_rest_seconds`:

```ts
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
```

E os exercises:

```ts
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
```

Aplicar mudança equivalente em `update` (mesma lista de colunas no UPDATE workouts e mesmo INSERT em workout_exercises após o DELETE).

UPDATE workouts:

```ts
await tx.execute(
  `UPDATE workouts
     SET name = ?, description = ?, color = ?, default_sets = ?, default_rest_seconds = ?, updated_at = ?
   WHERE id = ?`,
  [workout.name, workout.description, workout.color, workout.defaultSets, workout.defaultRestSeconds, workout.updatedAt, id],
);
```

- [ ] **Step 4: Atualizar/adicionar testes**

Em `__tests__/unit/workoutRepository.test.ts`, adicione um teste round-trip cobrindo os novos campos:

```ts
it('persists and reads new v4 fields', async () => {
  const id = 'w1';
  await workoutRepository.insert(
    {
      id, name: 'T', description: null, color: '#fff',
      defaultSets: 4, defaultRestSeconds: 120,
      createdAt: 1, updatedAt: 1,
    },
    [
      {
        id: 'e1', workoutId: id, exerciseId: 'ex1', orderIndex: 0,
        sets: 3, reps: '30-30-30',
        repsPerSet: [30, 30, 30],
        restSeconds: 180, restEnabled: true,
        warmupEnabled: true, warmupReps: 10,
        notes: null,
      },
    ],
  );
  const found = await workoutRepository.findById(id);
  expect(found?.workout.defaultSets).toBe(4);
  expect(found?.workout.defaultRestSeconds).toBe(120);
  expect(found?.exercises[0].repsPerSet).toEqual([30, 30, 30]);
  expect(found?.exercises[0].warmupEnabled).toBe(true);
  expect(found?.exercises[0].warmupReps).toBe(10);
  expect(found?.exercises[0].restEnabled).toBe(true);
});
```

(Se não tiver setup de DB em memória nos testes, basta seguir o padrão dos testes existentes em `workoutRepository.test.ts`.)

- [ ] **Step 5: Rodar testes**

Run: `npx jest workoutRepository -i`
Expected: PASS.

- [ ] **Step 6: Rodar typecheck**

Run: `npx tsc --noEmit`
Expected: ainda pode ter erros nos screens — OK por enquanto, próximas tasks resolvem.

- [ ] **Step 7: Commit**

```bash
git add src/types/workout.ts src/database/repositories/workoutRepository.ts __tests__/unit/workoutRepository.test.ts
git commit -m "feat(db): expose v4 fields in workout repository"
```

---

### Task 6: Atualizar `useWorkoutDraftStore`

**Files:**
- Modify: `src/store/useWorkoutDraftStore.ts`
- Modify: `__tests__/unit/useWorkoutDraftStore.test.ts`

- [ ] **Step 1: Atualizar a interface `DraftState`**

```ts
interface DraftState {
  id: string | null;
  name: string;
  color: string;
  defaultSets: number;
  defaultRestSeconds: number;
  exercises: DraftExercise[];
  originalSnapshot: string;

  loadNew: () => void;
  loadExisting: (
    id: string,
    exerciseLookup: (exerciseId: string) => { name: string; muscleGroup: MuscleGroupKey } | undefined,
  ) => Promise<void>;
  updateName: (name: string) => void;
  updateColor: (color: string) => void;
  updateDefaultSets: (n: number) => void;
  updateDefaultRest: (seconds: number) => void;
  addExercise: (exerciseId: string, exerciseName: string, muscleGroup: MuscleGroupKey) => void;
  removeExercise: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;

  updateSetReps: (exIndex: number, setIndex: number, reps: number) => void;
  addSet: (exIndex: number) => void;
  removeSet: (exIndex: number, setIndex: number) => void;
  toggleWarmup: (exIndex: number) => void;
  setWarmupReps: (exIndex: number, reps: number) => void;
  toggleRest: (exIndex: number) => void;
  updateRestSeconds: (exIndex: number, seconds: number) => void;

  hasExercise: (exerciseId: string) => boolean;
  isDirty: () => boolean;
  toPersist: () => { workout: Workout; exercises: WorkoutExercise[] };
  reset: () => void;
}
```

- [ ] **Step 2: Atualizar o snapshot, defaults e factory de exercício**

```ts
const DEFAULT_SETS = 3;
const DEFAULT_REST = 90;
const DEFAULT_REPS = 12;

function snapshotOf(
  name: string,
  color: string,
  defaultSets: number,
  defaultRestSeconds: number,
  exercises: DraftExercise[],
): string {
  return JSON.stringify({ name, color, defaultSets, defaultRestSeconds, exercises });
}

function newDraftExercise(
  exerciseId: string,
  exerciseName: string,
  muscleGroup: MuscleGroupKey,
  defaultSets: number,
  defaultRest: number,
): DraftExercise {
  return {
    exerciseId,
    exerciseName,
    muscleGroup,
    repsPerSet: Array.from({ length: defaultSets }, () => DEFAULT_REPS),
    restSeconds: defaultRest,
    restEnabled: true,
    warmupEnabled: false,
    warmupReps: null,
  };
}
```

- [ ] **Step 3: Atualizar `loadNew`, `loadExisting`, `addExercise`**

```ts
loadNew: () => {
  const snap = snapshotOf('', DEFAULT_WORKOUT_COLOR, DEFAULT_SETS, DEFAULT_REST, []);
  set({
    id: null,
    name: '',
    color: DEFAULT_WORKOUT_COLOR,
    defaultSets: DEFAULT_SETS,
    defaultRestSeconds: DEFAULT_REST,
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
      repsPerSet: e.repsPerSet.length > 0 ? e.repsPerSet : [DEFAULT_REPS],
      restSeconds: e.restSeconds,
      restEnabled: e.restEnabled,
      warmupEnabled: e.warmupEnabled,
      warmupReps: e.warmupReps,
    };
  });
  const snap = snapshotOf(
    data.workout.name,
    data.workout.color,
    data.workout.defaultSets,
    data.workout.defaultRestSeconds,
    exercises,
  );
  set({
    id: data.workout.id,
    name: data.workout.name,
    color: data.workout.color,
    defaultSets: data.workout.defaultSets,
    defaultRestSeconds: data.workout.defaultRestSeconds,
    exercises,
    originalSnapshot: snap,
  });
},

addExercise: (exerciseId, exerciseName, muscleGroup) => {
  const { defaultSets, defaultRestSeconds } = get();
  set(state => ({
    exercises: [
      ...state.exercises,
      newDraftExercise(exerciseId, exerciseName, muscleGroup, defaultSets, defaultRestSeconds),
    ],
  }));
},
```

- [ ] **Step 4: Implementar novos métodos**

```ts
updateDefaultSets: (n) => set({ defaultSets: Math.max(1, n) }),
updateDefaultRest: (seconds) => set({ defaultRestSeconds: Math.max(0, seconds) }),

updateSetReps: (exIndex, setIndex, reps) => {
  set(state => ({
    exercises: state.exercises.map((e, i) => {
      if (i !== exIndex) return e;
      const next = [...e.repsPerSet];
      if (setIndex < 0 || setIndex >= next.length) return e;
      next[setIndex] = Math.max(0, reps);
      return { ...e, repsPerSet: next };
    }),
  }));
},

addSet: (exIndex) => {
  set(state => ({
    exercises: state.exercises.map((e, i) => {
      if (i !== exIndex) return e;
      const last = e.repsPerSet[e.repsPerSet.length - 1] ?? DEFAULT_REPS;
      return { ...e, repsPerSet: [...e.repsPerSet, last] };
    }),
  }));
},

removeSet: (exIndex, setIndex) => {
  set(state => ({
    exercises: state.exercises.map((e, i) => {
      if (i !== exIndex) return e;
      if (e.repsPerSet.length <= 1) return e;
      return { ...e, repsPerSet: e.repsPerSet.filter((_, k) => k !== setIndex) };
    }),
  }));
},

toggleWarmup: (exIndex) => {
  set(state => ({
    exercises: state.exercises.map((e, i) => {
      if (i !== exIndex) return e;
      const enabled = !e.warmupEnabled;
      return { ...e, warmupEnabled: enabled, warmupReps: enabled ? (e.warmupReps ?? 10) : null };
    }),
  }));
},

setWarmupReps: (exIndex, reps) => {
  set(state => ({
    exercises: state.exercises.map((e, i) =>
      i === exIndex ? { ...e, warmupReps: Math.max(0, reps) } : e,
    ),
  }));
},

toggleRest: (exIndex) => {
  set(state => ({
    exercises: state.exercises.map((e, i) =>
      i === exIndex ? { ...e, restEnabled: !e.restEnabled } : e,
    ),
  }));
},

updateRestSeconds: (exIndex, seconds) => {
  set(state => ({
    exercises: state.exercises.map((e, i) =>
      i === exIndex ? { ...e, restSeconds: Math.max(0, seconds) } : e,
    ),
  }));
},
```

- [ ] **Step 5: Atualizar `isDirty` e `toPersist`**

```ts
isDirty: () => {
  const { name, color, defaultSets, defaultRestSeconds, exercises, originalSnapshot } = get();
  return snapshotOf(name, color, defaultSets, defaultRestSeconds, exercises) !== originalSnapshot;
},

toPersist: () => {
  const { id, name, color, defaultSets, defaultRestSeconds, exercises } = get();
  const now = Date.now();
  const workoutId = id ?? generateId();
  const workout: Workout = {
    id: workoutId,
    name: name.trim(),
    description: null,
    color,
    defaultSets,
    defaultRestSeconds,
    createdAt: now,
    updatedAt: now,
  };
  const workoutExercises: WorkoutExercise[] = exercises.map((e, i) => ({
    id: generateId(),
    workoutId,
    exerciseId: e.exerciseId,
    orderIndex: i,
    sets: e.repsPerSet.length,
    reps: e.repsPerSet.join('-'),
    repsPerSet: e.repsPerSet,
    restSeconds: e.restSeconds,
    restEnabled: e.restEnabled,
    warmupEnabled: e.warmupEnabled,
    warmupReps: e.warmupReps,
    notes: null,
  }));
  return { workout, exercises: workoutExercises };
},

reset: () => set({
  id: null,
  name: '',
  color: DEFAULT_WORKOUT_COLOR,
  defaultSets: DEFAULT_SETS,
  defaultRestSeconds: DEFAULT_REST,
  exercises: [],
  originalSnapshot: '',
}),
```

- [ ] **Step 6: Atualizar testes**

Adicionar a `__tests__/unit/useWorkoutDraftStore.test.ts`:

```ts
it('toggleWarmup default reps to 10', () => {
  const s = useWorkoutDraftStore.getState();
  s.loadNew();
  s.addExercise('ex1', 'Push', 'chest');
  s.toggleWarmup(0);
  expect(useWorkoutDraftStore.getState().exercises[0].warmupEnabled).toBe(true);
  expect(useWorkoutDraftStore.getState().exercises[0].warmupReps).toBe(10);
});

it('addSet duplicates last reps value', () => {
  const s = useWorkoutDraftStore.getState();
  s.loadNew();
  s.addExercise('ex1', 'Push', 'chest');
  s.updateSetReps(0, 0, 30);
  s.addSet(0);
  expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet).toEqual([30, 12, 12, 30]);
});

it('removeSet keeps at least one set', () => {
  const s = useWorkoutDraftStore.getState();
  s.loadNew();
  s.updateDefaultSets(1);
  s.addExercise('ex1', 'Push', 'chest');
  s.removeSet(0, 0);
  expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet.length).toBe(1);
});

it('updateDefaultSets affects new exercises only', () => {
  const s = useWorkoutDraftStore.getState();
  s.loadNew();
  s.updateDefaultSets(5);
  s.addExercise('ex1', 'Push', 'chest');
  expect(useWorkoutDraftStore.getState().exercises[0].repsPerSet.length).toBe(5);
});
```

> Atualize qualquer asserção pré-existente que referencie `sets` ou `reps` no draft (foram removidos do tipo) — agora usar `repsPerSet`.

- [ ] **Step 7: Rodar testes**

Run: `npx jest useWorkoutDraftStore -i`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/store/useWorkoutDraftStore.ts __tests__/unit/useWorkoutDraftStore.test.ts
git commit -m "feat(store): per-set reps, warmup and rest toggle on draft store"
```

---

### Task 7: Componente `Toggle`

**Files:**
- Create: `src/components/common/Toggle.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Implementar**

```tsx
// src/components/common/Toggle.tsx
import React from 'react';
import { Switch, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? colors.textPrimary : colors.textSecondary}
        trackColor={{ false: colors.surface, true: colors.accent }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { transform: [{ scale: 0.9 }] },
});
```

- [ ] **Step 2: Exportar**

Em `src/components/common/index.ts`, adicione:
```ts
export { Toggle } from './Toggle';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/common/Toggle.tsx src/components/common/index.ts
git commit -m "feat(common): Toggle component"
```

---

### Task 8: Componente `SettingRow`

**Files:**
- Create: `src/components/common/SettingRow.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Implementar**

```tsx
// src/components/common/SettingRow.tsx
import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  icon?: string;
  label: string;
  value?: ReactNode;
  onPress?: () => void;
  rightAccessory?: ReactNode;
}

export function SettingRow({ icon, label, value, onPress, rightAccessory }: Props) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={styles.row} android_ripple={{ color: '#ffffff10' }}>
      <View style={styles.left}>
        {icon ? <MaterialIcons name={icon} size={20} color={colors.textSecondary} style={styles.icon} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value !== undefined ? (
          typeof value === 'string' || typeof value === 'number'
            ? <Text style={styles.value}>{value}</Text>
            : value
        ) : null}
        {rightAccessory ?? (onPress ? (
          <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
        ) : null)}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff15',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: spacing.sm },
  label: { ...typography.body, color: colors.textPrimary },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  value: { ...typography.body, color: colors.textSecondary, marginRight: spacing.xs },
});
```

- [ ] **Step 2: Exportar**

```ts
export { SettingRow } from './SettingRow';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/common/SettingRow.tsx src/components/common/index.ts
git commit -m "feat(common): SettingRow component"
```

---

### Task 9: Componente `StepperModal`

**Files:**
- Create: `src/components/common/StepperModal.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Implementar**

```tsx
// src/components/common/StepperModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  description?: string;
  initial: number;
  min?: number;
  max?: number;
  step?: number;
  formatter?: (n: number) => string;
  onClose: () => void;
  onSave: (value: number) => void;
}

export function StepperModal({
  visible, title, description, initial,
  min = 0, max = Infinity, step = 1,
  formatter = (n) => String(n),
  onClose, onSave,
}: Props) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  const dec = () => setValue(v => Math.max(min, v - step));
  const inc = () => setValue(v => Math.min(max, v + step));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}

        <View style={styles.row}>
          <Pressable onPress={dec} style={styles.btn}>
            <Text style={styles.btnText}>−</Text>
          </Pressable>
          <Text style={styles.value}>{formatter(value)}</Text>
          <Pressable onPress={inc} style={styles.btn}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => { onSave(value); onClose(); }} style={styles.save}>
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000aa' },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  desc: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.lg,
  },
  btn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: colors.textPrimary, fontSize: 28, lineHeight: 30 },
  value: { color: colors.textPrimary, fontSize: 56, fontWeight: '700', minWidth: 140, textAlign: 'center' },
  save: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Exportar**

```ts
export { StepperModal } from './StepperModal';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/common/StepperModal.tsx src/components/common/index.ts
git commit -m "feat(common): StepperModal bottom sheet"
```

---

### Task 10: Componente `ColorPickerModal`

**Files:**
- Create: `src/components/workout/ColorPickerModal.tsx`
- Modify: `src/components/workout/index.ts`

- [ ] **Step 1: Implementar**

Verificar se `WORKOUT_COLOR_PALETTE` (ou similar) existe em `src/constants/workoutColors.ts`. Caso só exista `DEFAULT_WORKOUT_COLOR`, adicionar:

```ts
// src/constants/workoutColors.ts (caso ainda não exista WORKOUT_COLORS)
export const WORKOUT_COLORS: string[] = [
  '#9CA3AF', '#6B7280', '#22D3EE', '#3B82F6', '#1D4ED8', '#1E3A8A',
  '#A78BFA', '#8B5CF6', '#F472B6', '#FCA5A5', '#F87171', '#EF4444',
  '#F59E0B', '#FB923C', '#FDE047', '#84CC16', '#10B981', '#14B8A6',
];
```
(Se já existir alguma constante de paleta, reusar.)

```tsx
// src/components/workout/ColorPickerModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { WORKOUT_COLORS } from '@/constants/workoutColors';
import { colors, spacing, typography } from '@/theme';

interface Props {
  visible: boolean;
  current: string;
  onClose: () => void;
  onSave: (color: string) => void;
}

export function ColorPickerModal({ visible, current, onClose, onSave }: Props) {
  const [selected, setSelected] = useState(current);
  useEffect(() => { if (visible) setSelected(current); }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Cor</Text>
        <Text style={styles.desc}>Escolha uma cor para este treino.</Text>

        <View style={styles.grid}>
          {WORKOUT_COLORS.map(c => {
            const isSel = selected === c;
            return (
              <Pressable key={c} onPress={() => setSelected(c)} style={styles.cell}>
                <View style={[styles.swatch, { backgroundColor: c }, isSel && styles.swatchSel]} />
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => { onSave(selected); onClose(); }} style={styles.save}>
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000aa' },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  desc: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.lg },
  cell: { width: '16%', alignItems: 'center', paddingVertical: spacing.xs },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSel: { borderWidth: 2, borderColor: colors.textPrimary },
  save: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Exportar**

Em `src/components/workout/index.ts`:
```ts
export { ColorPickerModal } from './ColorPickerModal';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/ColorPickerModal.tsx src/components/workout/index.ts src/constants/workoutColors.ts
git commit -m "feat(workout): ColorPickerModal bottom sheet"
```

---

### Task 11: Componente `WorkoutNameField`

**Files:**
- Create: `src/components/workout/WorkoutNameField.tsx`
- Modify: `src/components/workout/index.ts`

- [ ] **Step 1: Implementar**

```tsx
// src/components/workout/WorkoutNameField.tsx
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export function WorkoutNameField({ label, value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
});
```

- [ ] **Step 2: Exportar**

```ts
export { WorkoutNameField } from './WorkoutNameField';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/WorkoutNameField.tsx src/components/workout/index.ts
git commit -m "feat(workout): WorkoutNameField large input"
```

---

### Task 12: Componente `SetRow`

**Files:**
- Create: `src/components/workout/SetRow.tsx`
- Modify: `src/components/workout/index.ts`

- [ ] **Step 1: Implementar**

```tsx
// src/components/workout/SetRow.tsx
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  setLabel: string | 'warmup';
  reps: number;
  onChangeReps: (n: number) => void;
  onRemove?: () => void;
}

export function SetRow({ setLabel, reps, onChangeReps, onRemove }: Props) {
  const isWarmup = setLabel === 'warmup';
  return (
    <View style={styles.row}>
      <View style={styles.colSet}>
        {isWarmup ? (
          <MaterialIcons name="bolt" size={20} color={colors.accent} />
        ) : (
          <Text style={styles.cellText}>{setLabel}</Text>
        )}
      </View>
      <View style={styles.colReps}>
        <TextInput
          value={String(reps)}
          onChangeText={(t) => {
            const n = parseInt(t, 10);
            onChangeReps(Number.isFinite(n) ? n : 0);
          }}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
      <View style={styles.colWeight}>
        <Text style={styles.placeholder}>—</Text>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
          <MaterialIcons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      ) : <View style={styles.removeBtn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff10',
  },
  colSet: { width: 40, alignItems: 'center' },
  colReps: { flex: 1, paddingHorizontal: spacing.sm },
  colWeight: { flex: 1, paddingHorizontal: spacing.sm, alignItems: 'flex-start' },
  cellText: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  input: {
    backgroundColor: colors.primaryLight,
    color: colors.textPrimary,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    minWidth: 60,
  },
  placeholder: { ...typography.body, color: colors.textSecondary, paddingHorizontal: spacing.sm },
  removeBtn: { width: 28, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 2: Exportar**

```ts
export { SetRow } from './SetRow';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/workout/SetRow.tsx src/components/workout/index.ts
git commit -m "feat(workout): SetRow component"
```

---

### Task 13: Reescrever `WorkoutFormFields`

**Files:**
- Modify: `src/components/workout/WorkoutFormFields.tsx`

- [ ] **Step 1: Reescrever**

```tsx
// src/components/workout/WorkoutFormFields.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingRow, StepperModal } from '@/components/common';
import { WorkoutNameField } from './WorkoutNameField';
import { ColorPickerModal } from './ColorPickerModal';
import { formatRestTime } from '@/utils/formatRestTime';
import { colors, spacing } from '@/theme';

interface Props {
  name: string;
  color: string;
  defaultSets: number;
  defaultRestSeconds: number;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onDefaultSetsChange: (n: number) => void;
  onDefaultRestChange: (seconds: number) => void;
}

export function WorkoutFormFields(props: Props) {
  const [colorOpen, setColorOpen] = useState(false);
  const [setsOpen, setSetsOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <WorkoutNameField
        label="Novo treino"
        value={props.name}
        onChangeText={props.onNameChange}
        placeholder="Nome do treino"
      />

      <SettingRow
        icon="palette"
        label="Cor"
        onPress={() => setColorOpen(true)}
        rightAccessory={<View style={[styles.swatch, { backgroundColor: props.color }]} />}
      />
      <SettingRow
        icon="repeat"
        label="Séries"
        value={`${props.defaultSets} séries`}
        onPress={() => setSetsOpen(true)}
      />
      <SettingRow
        icon="timer"
        label="Descanso"
        value={formatRestTime(props.defaultRestSeconds)}
        onPress={() => setRestOpen(true)}
      />

      <ColorPickerModal
        visible={colorOpen}
        current={props.color}
        onClose={() => setColorOpen(false)}
        onSave={props.onColorChange}
      />
      <StepperModal
        visible={setsOpen}
        title="Séries por exercício"
        description="Quantidade padrão de séries para novos exercícios deste treino."
        initial={props.defaultSets}
        min={1}
        max={10}
        onClose={() => setSetsOpen(false)}
        onSave={props.onDefaultSetsChange}
      />
      <StepperModal
        visible={restOpen}
        title="Tempo de descanso"
        description="Quanto descanso entre as séries (padrão para novos exercícios)."
        initial={props.defaultRestSeconds}
        min={0}
        max={600}
        step={15}
        formatter={formatRestTime}
        onClose={() => setRestOpen(false)}
        onSave={props.onDefaultRestChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderRadius: 16, paddingBottom: spacing.xs, marginBottom: spacing.lg },
  swatch: { width: 24, height: 24, borderRadius: 12 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workout/WorkoutFormFields.tsx
git commit -m "feat(workout): redesign WorkoutFormFields with SettingRow + modals"
```

---

### Task 14: Reescrever `WorkoutFormScreen` (sem lista de exercícios)

**Files:**
- Modify: `src/screens/workout/WorkoutFormScreen.tsx`

- [ ] **Step 1: Reescrever**

```tsx
// src/screens/workout/WorkoutFormScreen.tsx
import React, { useEffect, useLayoutEffect } from 'react';
import {
  View, StyleSheet, SafeAreaView, Text, Pressable, Alert, BackHandler, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutFormFields } from '@/components/workout';
import { Button } from '@/components/common';
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
    if (!draft.isDirty()) { onConfirm(); return; }
    Alert.alert(
      'Descartar alterações?',
      'As alterações serão perdidas.',
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
    const newId = workout.id;
    draft.reset();
    if (mode === 'new') {
      navigation.replace('WorkoutPreview', { id: newId });
    } else {
      navigation.goBack();
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'new' ? 'Novo treino' : draft.name || 'Editar treino',
      headerLeft: () => (
        <Pressable onPress={onCancel} style={styles.headerBtn}>
          <Text style={styles.headerCancel}>Cancelar</Text>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, mode, draft.name]);

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
          defaultSets={draft.defaultSets}
          defaultRestSeconds={draft.defaultRestSeconds}
          onNameChange={draft.updateName}
          onColorChange={draft.updateColor}
          onDefaultSetsChange={draft.updateDefaultSets}
          onDefaultRestChange={draft.updateDefaultRest}
        />
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={mode === 'new' ? 'Criar treino' : 'Salvar'}
          onPress={canSave ? onSave : () => {}}
          disabled={!canSave}
          style={styles.cta}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ffffff10' },
  cta: { borderRadius: 999 },
  headerBtn: { paddingHorizontal: spacing.sm },
  headerCancel: { ...typography.body, color: colors.textSecondary },
});
```

> Se `WorkoutStackParamList` exigir `mode: 'edit'` com `id: string`, mantenha a tipagem como já está hoje. Não mudei param list.

- [ ] **Step 2: Rodar typecheck**

Run: `npx tsc --noEmit`
Expected: pode ainda quebrar em `WorkoutPreviewScreen`/`ExerciseInWorkoutScreen` (próximas tasks).

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutFormScreen.tsx
git commit -m "feat(workout): redesign WorkoutFormScreen, remove exercise list"
```

---

### Task 15: Reescrever `WorkoutPreviewScreen` (gerencia exercícios)

**Files:**
- Modify: `src/screens/workout/WorkoutPreviewScreen.tsx`

- [ ] **Step 1: Adicionar gerenciamento de exercícios**

A tela passa a:
- Carregar do repository já com os novos campos (`repsPerSet`).
- Ter um botão "Adicionar exercício" que navega para `ExercisePicker`.
- Cada exercício listado é um Pressable que navega para `ExerciseInWorkout` com o índice do exercício (mesmo padrão de hoje).
- Após editar/adicionar, recarregar dados (refetch ao focar a tela).

Mudanças mínimas:

```tsx
import { useFocusEffect } from '@react-navigation/native';
// ... dentro do componente, substitua o useEffect de carga por:
const load = React.useCallback(async () => {
  const result = await workoutRepository.findById(id);
  if (result) {
    setWorkout(result.workout);
    setExercises(result.exercises);
  }
  setLoading(false);
}, [id]);

useFocusEffect(React.useCallback(() => { load(); }, [load]));
```

E acrescente, no JSX, antes do bloco `<View style={styles.actions}>`:

```tsx
<Button
  label="+ Adicionar exercício"
  variant="secondary"
  onPress={() => navigation.navigate('ExercisePicker')}
  style={{ marginTop: spacing.md }}
/>
```

E transforme cada `<Card>` em `<Pressable>` (ou envolva o Card) navegando:

```tsx
<Pressable
  key={e.id}
  onPress={() => navigation.navigate('ExerciseInWorkout', { index: i })}
>
  <Card style={styles.itemCard}>
    {/* ... conteúdo igual */}
  </Card>
</Pressable>
```

> **Importante:** o `ExercisePicker` hoje adiciona ao `useWorkoutDraftStore`. Para a tela `WorkoutPreview` aproveitar esse fluxo, o "Adicionar exercício" precisa popular o draft com o workout atual antes de navegar:

```tsx
const draft = useWorkoutDraftStore();
const onAdd = () => {
  draft.loadExisting(id, (exId) => {
    const found = allExercises.find(e => e.id === exId);
    return found ? { name: found.name, muscleGroup: found.muscleGroup } : undefined;
  });
  navigation.navigate('ExercisePicker');
};
```

E após retornar do picker (no `useFocusEffect`), persistir o draft de volta:

```ts
const draftIsDirty = useWorkoutDraftStore.getState().isDirty();
if (draftIsDirty) {
  const persisted = useWorkoutDraftStore.getState().toPersist();
  await workoutRepository.update(id, persisted.workout, persisted.exercises);
  useWorkoutDraftStore.getState().reset();
}
await load();
```

> Idem `ExerciseInWorkout` — quando usuário sair dessa tela, o draft persiste de volta.

- [ ] **Step 2: Rodar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (com Task 16 também aplicada).

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutPreviewScreen.tsx
git commit -m "feat(workout): WorkoutPreview manages exercises (add/edit)"
```

---

### Task 16: Reescrever `ExerciseInWorkoutScreen`

**Files:**
- Modify: `src/screens/workout/ExerciseInWorkoutScreen.tsx`

- [ ] **Step 1: Reescrever**

```tsx
// src/screens/workout/ExerciseInWorkoutScreen.tsx
import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Text, Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button, EmptyState, Toggle, StepperModal } from '@/components/common';
import { SetRow } from '@/components/workout';
import { useWorkoutDraftStore } from '@/store/useWorkoutDraftStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { formatRestTime } from '@/utils/formatRestTime';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExerciseInWorkout'>;

export function ExerciseInWorkoutScreen({ route, navigation }: Props) {
  const { index } = route.params;
  const exercise = useWorkoutDraftStore(s => s.exercises[index]);
  const updateSetReps = useWorkoutDraftStore(s => s.updateSetReps);
  const addSet = useWorkoutDraftStore(s => s.addSet);
  const removeSet = useWorkoutDraftStore(s => s.removeSet);
  const toggleWarmup = useWorkoutDraftStore(s => s.toggleWarmup);
  const setWarmupReps = useWorkoutDraftStore(s => s.setWarmupReps);
  const toggleRest = useWorkoutDraftStore(s => s.toggleRest);
  const updateRestSeconds = useWorkoutDraftStore(s => s.updateRestSeconds);

  const [restModal, setRestModal] = useState(false);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Exercício não encontrado" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.name}>{exercise.exerciseName}</Text>
          <View style={styles.timer}>
            <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.timerText}>00:00</Text>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Pressable
            style={[styles.restBadge, !exercise.restEnabled && styles.restBadgeOff]}
            onPress={() => exercise.restEnabled && setRestModal(true)}
          >
            <MaterialIcons name="schedule" size={14} color={colors.textPrimary} />
            <Text style={styles.restText}>{formatRestTime(exercise.restSeconds)} rest</Text>
          </Pressable>

          <View style={styles.toggleWrap}>
            <Text style={styles.toggleLabel}>Warm-up</Text>
            <Toggle value={exercise.warmupEnabled} onChange={() => toggleWarmup(index)} />
          </View>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.toggleLabel}>Descanso ativado</Text>
          <Toggle value={exercise.restEnabled} onChange={() => toggleRest(index)} />
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.thSet, styles.th]}>Set</Text>
          <Text style={[styles.thReps, styles.th]}>Reps</Text>
          <Text style={[styles.thWeight, styles.th]}>Weight</Text>
          <View style={{ width: 28 }} />
        </View>

        {exercise.warmupEnabled && (
          <SetRow
            setLabel="warmup"
            reps={exercise.warmupReps ?? 10}
            onChangeReps={(n) => setWarmupReps(index, n)}
          />
        )}

        {exercise.repsPerSet.map((reps, i) => (
          <SetRow
            key={i}
            setLabel={String(i + 1)}
            reps={reps}
            onChangeReps={(n) => updateSetReps(index, i, n)}
            onRemove={exercise.repsPerSet.length > 1 ? () => removeSet(index, i) : undefined}
          />
        ))}

        <Pressable onPress={() => addSet(index)} style={styles.addSet}>
          <Text style={styles.addSetText}>+ Adicionar série</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Concluir" onPress={() => navigation.goBack()} style={styles.cta} />
      </View>

      <StepperModal
        visible={restModal}
        title="Descanso entre séries"
        description="Tempo de descanso para este exercício."
        initial={exercise.restSeconds}
        min={0}
        max={600}
        step={15}
        formatter={formatRestTime}
        onClose={() => setRestModal(false)}
        onSave={(s) => updateRestSeconds(index, s)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  name: { ...typography.heading, color: colors.accent, fontWeight: '700' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { ...typography.body, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  restBadgeOff: { opacity: 0.4 },
  restText: { ...typography.caption, color: colors.textPrimary },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleLabel: { ...typography.body, color: colors.textPrimary },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff15',
  },
  th: { ...typography.caption, color: colors.textSecondary },
  thSet: { width: 40, textAlign: 'center' },
  thReps: { flex: 1, paddingHorizontal: spacing.sm },
  thWeight: { flex: 1, paddingHorizontal: spacing.sm },
  addSet: { paddingVertical: spacing.md, alignItems: 'flex-start' },
  addSetText: { ...typography.body, color: colors.textPrimary },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ffffff10' },
  cta: { borderRadius: 999 },
});
```

> Removi o "Iniciar treino" daqui (ficou apenas no Preview pra simplicidade — o spec não exigia que esse botão fosse funcional). Botão de "Concluir" só fecha a tela; persistência do draft é feita pelo `WorkoutPreviewScreen` no `useFocusEffect`.

- [ ] **Step 2: Rodar typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (módulos de outras telas já adaptados ou inalterados).

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/ExerciseInWorkoutScreen.tsx
git commit -m "feat(workout): redesign ExerciseInWorkout (per-set reps, warmup, rest toggle)"
```

---

### Task 17: Compatibilidade com consumers existentes

**Files:**
- Verificar: `src/components/workout/WorkoutExerciseRow.tsx`, `src/store/useActiveSessionStore.ts`, `src/screens/workout/WorkoutExecutionScreen.tsx`, `src/screens/history/SessionDetailScreen.tsx`, `src/components/history/ExerciseLogGroup.tsx`

- [ ] **Step 1: Rodar typecheck completo**

Run: `npx tsc --noEmit`
Expected: PASS. Os consumers que usam `e.sets` / `e.reps` continuam funcionando porque o repository derivou esses campos. Caso algum lugar use `Workout` diretamente (sem campos novos), o TS pode reclamar — corrigir adicionando os campos no construtor com valores defaults (`defaultSets: 3, defaultRestSeconds: 90`).

- [ ] **Step 2: Rodar todos os testes**

Run: `npx jest -i`
Expected: PASS.

- [ ] **Step 3: Commit (caso tenha ajustes)**

```bash
git add -A
git commit -m "fix: ajustar consumers para novos campos de Workout"
```

(Pular se não houve ajustes.)

---

### Task 18: Validação visual no device

**Files:** nenhum

- [ ] **Step 1: Garantir que o Metro está rodando** (`npm start`)

- [ ] **Step 2: Rebuild para aplicar a migration nativa**

Run: `npm run android`
Expected: app abre, migrations rodam (logs `Applied migration v4` no Metro).

- [ ] **Step 3: Smoke test manual** — ir confirmando cada item:
  - Criar novo treino → tela parecida com treino1.png
  - Tap "Cor" → modal de cores (treino4.png), salvar muda swatch
  - Tap "Séries" → stepper, salvar mostra "X séries"
  - Tap "Descanso" → stepper com mm:ss
  - Botão "Criar treino" desabilitado sem nome, ativo com nome
  - Após criar → vai para WorkoutPreview com 0 exercícios
  - "Adicionar exercício" → picker → seleciona → volta com exercício listado
  - Tap exercício → tela treino2.png
  - Toggle warm-up → linha extra com ícone raio aparece
  - Toggle "Descanso ativado" off → badge fica esmaecida
  - "Adicionar série" funciona; remover série mantém ≥1
  - Voltar para Preview → exercício salvo (refetch via focus effect)
  - Editar treino existente: dados preservados (treinos antigos mostram repsPerSet vindo da backfill)
  - Iniciar treino do Preview: fluxo de execução funciona normalmente

- [ ] **Step 4: Caso encontrar bugs, abrir tasks adicionais e corrigir antes de fechar.**

---

## Self-review

- ✅ Spec coverage: cada item dos critérios de aceite está mapeado em tasks (modelo: 1-6; flow: 14-15; UI: 7-16; downstream: 17; QA: 18).
- ✅ Sem placeholders `TBD`/`TODO`.
- ✅ Type consistency: `repsPerSet`, `restEnabled`, `warmupEnabled`, `warmupReps`, `defaultSets`, `defaultRestSeconds` aparecem com mesma grafia em types/store/repository.
- ✅ Decisão consciente: "Iniciar treino" do `ExerciseInWorkout` removida (não é critério obrigatório do spec); Preview já tem.
