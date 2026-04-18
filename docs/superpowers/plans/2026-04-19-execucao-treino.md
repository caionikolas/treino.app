# Execução do Treino + Favoritar (Fase 4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar tela de execução de treino (timer, log de séries, navegação entre exercícios, resumo) + favoritar treinos com ordenação.

**Architecture:** Adiciona 3 screens à `WorkoutStack` (Preview, Execution, Summary). Novo `useActiveSessionStore` gerencia sessão em memória. Novo `sessionRepository` persiste em `workout_sessions` + `session_sets`. Migration v2 adiciona `is_favorite` em `workouts`. Usa `@notifee/react-native` para notificação + som + vibração ao fim do descanso. Keep-screen-on via módulo nativo minimalista custom.

**Tech Stack:** React Native 0.85.1, TypeScript, op-sqlite (async), Zustand, React Navigation, @notifee/react-native, modulo nativo customizado para keep-awake.

**Spec de referência:** `docs/superpowers/specs/2026-04-19-execucao-treino-design.md`

**Convenções:**
- Código em inglês, UI em PT-BR
- Todos os repositórios são async
- Timers usam `Date.now()` como baseline pra evitar drift

---

## Task 1: Migration v2 — add `is_favorite` em `workouts`

**Files:**
- Modify: `src/database/migrations.ts`
- Modify: `__tests__/unit/workoutRepository.test.ts` (add migration test; update mock to apply v2)

- [ ] **Step 1: Adicionar migração v2 em `src/database/migrations.ts`**

Abra o arquivo e adicione uma entrada ao array `MIGRATIONS` após a v1:

```typescript
  {
    version: 2,
    up: [
      `ALTER TABLE workouts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
    ],
  },
```

Array completo fica `[{ version: 1, up: [...] }, { version: 2, up: [...] }]`.

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/database/migrations.ts
git commit -m "feat: add migration v2 for workouts.is_favorite"
```

---

## Task 2: Atualizar tipo `WorkoutSummary` com `isFavorite`

**Files:**
- Modify: `src/types/workout.ts`

- [ ] **Step 1: Adicionar `isFavorite` ao `WorkoutSummary`**

Abra `src/types/workout.ts` e atualize apenas a interface `WorkoutSummary`:

```typescript
export interface WorkoutSummary {
  id: string;
  name: string;
  color: string;
  exerciseCount: number;
  updatedAt: number;
  isFavorite: boolean;
}
```

Demais interfaces (`Workout`, `WorkoutExercise`, `DraftExercise`) permanecem inalteradas.

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: erro em `workoutRepository.findAllSummaries` (retorno não inclui `isFavorite`). Isso será corrigido no Task 3. Siga em frente.

- [ ] **Step 3: Commit**

```bash
git add src/types/workout.ts
git commit -m "feat: add isFavorite to WorkoutSummary type"
```

---

## Task 3: Repository — `toggleFavorite` + sort em `findAllSummaries` (TDD)

**Files:**
- Modify: `src/database/repositories/workoutRepository.ts`
- Modify: `__tests__/unit/workoutRepository.test.ts`

- [ ] **Step 1: Adicionar novos testes no fim de `__tests__/unit/workoutRepository.test.ts`**

Abra o arquivo e ADICIONE estes testes dentro do `describe('workoutRepository', ...)`:

```typescript
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
```

- [ ] **Step 2: Rodar testes — devem FALHAR**

Run: `pnpm test workoutRepository`
Expected: 2 novos testes falham (método `toggleFavorite` não existe, `isFavorite` não vem na query).

- [ ] **Step 3: Atualizar `src/database/repositories/workoutRepository.ts`**

Substitua a `SummaryRow` para incluir `is_favorite`, atualize `findAllSummaries` e adicione `toggleFavorite`:

```typescript
interface SummaryRow {
  id: string;
  name: string;
  color: string;
  updated_at: number;
  exercise_count: number;
  is_favorite: number;
}
```

Substitua `findAllSummaries`:

```typescript
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
```

Adicione novo método `toggleFavorite` ao objeto:

```typescript
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
```

- [ ] **Step 4: Rodar testes — devem PASSAR**

Run: `pnpm test workoutRepository`
Expected: todos os testes (antigos + 2 novos) passam.

- [ ] **Step 5: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0 agora (erro do Task 2 resolvido).

- [ ] **Step 6: Commit**

```bash
git add src/database/repositories/workoutRepository.ts __tests__/unit/workoutRepository.test.ts
git commit -m "feat: add toggleFavorite and favorite-first sort in workoutRepository"
```

---

## Task 4: `useWorkoutStore.toggleFavorite`

**Files:**
- Modify: `src/store/useWorkoutStore.ts`

- [ ] **Step 1: Adicionar `toggleFavorite` ao store**

Abra `src/store/useWorkoutStore.ts` e adicione:

1. Na interface `WorkoutState`, após `remove`:
```typescript
  toggleFavorite: (id: string) => Promise<void>;
```

2. Na implementação do store (no `create((set, get) => ({ ... }))`), após `remove`:
```typescript
  toggleFavorite: async (id) => {
    await workoutRepository.toggleFavorite(id);
    await get().load();
  },
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/store/useWorkoutStore.ts
git commit -m "feat: add toggleFavorite to useWorkoutStore"
```

---

## Task 5: Types — `src/types/session.ts`

**Files:**
- Create: `src/types/session.ts`

- [ ] **Step 1: Criar `src/types/session.ts`**

```typescript
import { MuscleGroupKey } from '@/constants/muscleGroups';

export interface WorkoutSession {
  id: string;
  workoutId: string;
  startedAt: number;
  finishedAt: number | null;
  durationSeconds: number | null;
  notes: string | null;
}

export interface SessionSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  completed: number;
  notes: string | null;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupKey;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
}

export interface LoggedSet {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  completed: boolean;
  loggedAt: number;
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/types/session.ts
git commit -m "feat: add session types (WorkoutSession, SessionSet, ActiveExercise, LoggedSet)"
```

---

## Task 6: `sessionRepository` (TDD)

**Files:**
- Create: `src/database/repositories/sessionRepository.ts`
- Create: `__tests__/unit/sessionRepository.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/unit/sessionRepository.test.ts`:

```typescript
import { runMigrations } from '@/database/migrations';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { WorkoutSession, SessionSet } from '@/types/session';

// Reuse the same Jest mock strategy as workoutRepository tests
jest.mock('@/database/connection', () => {
  const Database = require('better-sqlite3');
  let inst: any = null;
  return {
    getDb: () => {
      if (!inst) {
        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        // Build a thin op-sqlite-compatible wrapper
        inst = {
          execute: async (sql: string, params?: any[]) => {
            const trimmed = sql.trim().toLowerCase();
            if (trimmed.startsWith('select')) {
              const rows = db.prepare(sql).all(...(params ?? []));
              return { rows };
            }
            db.prepare(sql).run(...(params ?? []));
            return { rows: [] };
          },
          executeSync: (sql: string) => {
            db.exec(sql);
          },
          transaction: async (fn: any) => {
            db.exec('BEGIN');
            try {
              await fn({
                execute: async (sql: string, params?: any[]) => {
                  db.prepare(sql).run(...(params ?? []));
                  return { rows: [] };
                },
              });
              db.exec('COMMIT');
            } catch (e) {
              db.exec('ROLLBACK');
              throw e;
            }
          },
          close: () => db.close(),
        };
      }
      return inst;
    },
    __resetDb: () => {
      if (inst) {
        try { inst.close(); } catch {}
        inst = null;
      }
    },
  };
});

beforeEach(async () => {
  const { __resetDb, getDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
  // Seed required FK dependencies: one exercise row + one workout row
  const db = getDb();
  await db.execute(
    `INSERT INTO exercises (id, name, muscle_group, category, created_at)
     VALUES ('ex-1', 'Test', 'chest', 'strength', 0)`,
  );
  await db.execute(
    `INSERT INTO workouts (id, name, color, created_at, updated_at)
     VALUES ('w-1', 'Treino', '#E94560', 0, 0)`,
  );
});

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's-1',
    workoutId: 'w-1',
    startedAt: 1000,
    finishedAt: 2000,
    durationSeconds: 1000,
    notes: null,
    ...overrides,
  };
}

function makeSet(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    id: 'ss-1',
    sessionId: 's-1',
    exerciseId: 'ex-1',
    setNumber: 1,
    reps: 12,
    weightKg: 80,
    completed: 1,
    notes: null,
    ...overrides,
  };
}

describe('sessionRepository', () => {
  it('insert + findRecent round-trips session', async () => {
    await sessionRepository.insert(makeSession(), [makeSet()]);
    const sessions = await sessionRepository.findRecent();
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('s-1');
    expect(sessions[0].durationSeconds).toBe(1000);
  });

  it('findRecent orders by startedAt desc, respects limit', async () => {
    await sessionRepository.insert(makeSession({ id: 's-1', startedAt: 100 }), []);
    await sessionRepository.insert(makeSession({ id: 's-2', startedAt: 300 }), []);
    await sessionRepository.insert(makeSession({ id: 's-3', startedAt: 200 }), []);

    const all = await sessionRepository.findRecent(10);
    expect(all.map(s => s.id)).toEqual(['s-2', 's-3', 's-1']);

    const limited = await sessionRepository.findRecent(2);
    expect(limited.map(s => s.id)).toEqual(['s-2', 's-3']);
  });

  it('insert with empty sets array works', async () => {
    await sessionRepository.insert(makeSession(), []);
    const sessions = await sessionRepository.findRecent();
    expect(sessions.length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar teste — deve FALHAR**

Run: `pnpm test sessionRepository`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `src/database/repositories/sessionRepository.ts`**

```typescript
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
```

- [ ] **Step 4: Rodar testes — devem PASSAR**

Run: `pnpm test sessionRepository`
Expected: 3 tests pass.

- [ ] **Step 5: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/database/repositories/sessionRepository.ts __tests__/unit/sessionRepository.test.ts
git commit -m "feat: add sessionRepository with insert + findRecent"
```

---

## Task 7: `useActiveSessionStore` (TDD)

**Files:**
- Create: `src/store/useActiveSessionStore.ts`
- Create: `__tests__/unit/useActiveSessionStore.test.ts`

- [ ] **Step 1: Criar teste falhando `__tests__/unit/useActiveSessionStore.test.ts`**

```typescript
import { useActiveSessionStore } from '@/store/useActiveSessionStore';

describe('useActiveSessionStore', () => {
  beforeEach(() => {
    useActiveSessionStore.getState().reset();
  });

  const sampleExercises = [
    { exerciseId: 'ex-1', exerciseName: 'Supino', muscleGroup: 'chest' as const, sets: 3, reps: '12', restSeconds: 90 },
    { exerciseId: 'ex-2', exerciseName: 'Rosca', muscleGroup: 'biceps' as const, sets: 2, reps: '10', restSeconds: 60 },
  ];

  it('start initializes session state', () => {
    useActiveSessionStore.getState().start('w-1', sampleExercises);
    const s = useActiveSessionStore.getState();
    expect(s.sessionId).not.toBeNull();
    expect(s.workoutId).toBe('w-1');
    expect(s.startedAt).not.toBeNull();
    expect(s.exercises.length).toBe(2);
    expect(s.exercises[0].targetSets).toBe(3);
    expect(s.exercises[0].targetReps).toBe('12');
    expect(s.currentExerciseIndex).toBe(0);
    expect(s.currentSetNumber).toBe(1);
    expect(s.loggedSets).toEqual([]);
  });

  it('logSet adds set and advances setNumber', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    const afterOne = useActiveSessionStore.getState();
    expect(afterOne.loggedSets.length).toBe(1);
    expect(afterOne.loggedSets[0].reps).toBe(12);
    expect(afterOne.loggedSets[0].weightKg).toBe(80);
    expect(afterOne.currentSetNumber).toBe(2);
    expect(afterOne.currentExerciseIndex).toBe(0);
  });

  it('logSet advances to next exercise after last set', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.logSet(12, 80);
    s.logSet(12, 80);
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(1);
    expect(after.currentSetNumber).toBe(1);
    expect(after.loggedSets.length).toBe(3);
  });

  it('nextExercise advances and resets setNumber to logged + 1', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.nextExercise();
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(1);
    expect(after.currentSetNumber).toBe(1);
  });

  it('previousExercise goes back, setNumber resumes after existing logs', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.nextExercise();
    s.previousExercise();
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(0);
    // one set already logged, so next = 2
    expect(after.currentSetNumber).toBe(2);
  });

  it('skipExercise advances without logging', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.skipExercise();
    const after = useActiveSessionStore.getState();
    expect(after.currentExerciseIndex).toBe(1);
    expect(after.loggedSets.length).toBe(0);
  });

  it('lastSetForExercise returns the most recent set of that exercise', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.logSet(10, 85);
    const last = useActiveSessionStore.getState().lastSetForExercise('ex-1');
    expect(last?.reps).toBe(10);
    expect(last?.weightKg).toBe(85);
  });

  it('adjustRest changes restEndsAt by delta seconds', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    const before = useActiveSessionStore.getState().restEndsAt!;
    s.adjustRest(30);
    const after = useActiveSessionStore.getState().restEndsAt!;
    expect(after - before).toBe(30_000);
  });

  it('skipRest clears restEndsAt', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    expect(useActiveSessionStore.getState().restEndsAt).not.toBeNull();
    s.skipRest();
    expect(useActiveSessionStore.getState().restEndsAt).toBeNull();
  });

  it('finalize produces session + sets with computed duration', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', sampleExercises);
    s.logSet(12, 80);
    s.setNotes('foi bom');
    const { session, sets } = s.finalize();
    expect(session.workoutId).toBe('w-1');
    expect(session.finishedAt).not.toBeNull();
    expect(session.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(session.notes).toBe('foi bom');
    expect(sets.length).toBe(1);
    expect(sets[0].reps).toBe(12);
  });

  it('isLastSetOfLastExercise returns true only at the very end', () => {
    const s = useActiveSessionStore.getState();
    s.start('w-1', [sampleExercises[0]]);  // 1 exercise, 3 sets
    expect(s.isLastSetOfLastExercise()).toBe(false);
    s.logSet(12, 80);
    expect(useActiveSessionStore.getState().isLastSetOfLastExercise()).toBe(false);
    s.logSet(12, 80);
    expect(useActiveSessionStore.getState().isLastSetOfLastExercise()).toBe(true);  // currentSet = 3, total = 3
  });
});
```

- [ ] **Step 2: Rodar teste — deve FALHAR**

Run: `pnpm test useActiveSessionStore`
Expected: fail (module not found).

- [ ] **Step 3: Implementar `src/store/useActiveSessionStore.ts`**

```typescript
import { create } from 'zustand';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { ActiveExercise, LoggedSet, WorkoutSession, SessionSet } from '@/types/session';
import { generateId } from '@/utils/generateId';

interface ActiveSessionState {
  sessionId: string | null;
  workoutId: string | null;
  startedAt: number | null;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetNumber: number;
  loggedSets: LoggedSet[];
  restEndsAt: number | null;
  notes: string;

  start: (
    workoutId: string,
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      muscleGroup: MuscleGroupKey;
      sets: number;
      reps: string;
      restSeconds: number;
    }>,
  ) => void;

  logSet: (reps: number, weightKg: number | null) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  skipExercise: () => void;

  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;

  setNotes: (notes: string) => void;

  finalize: () => { session: WorkoutSession; sets: SessionSet[] };
  reset: () => void;

  currentExercise: () => ActiveExercise | null;
  lastSetForExercise: (exerciseId: string) => LoggedSet | undefined;
  isLastSetOfLastExercise: () => boolean;
}

function countLoggedForExercise(sets: LoggedSet[], exerciseId: string): number {
  return sets.filter(s => s.exerciseId === exerciseId).length;
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => ({
  sessionId: null,
  workoutId: null,
  startedAt: null,
  exercises: [],
  currentExerciseIndex: 0,
  currentSetNumber: 1,
  loggedSets: [],
  restEndsAt: null,
  notes: '',

  start: (workoutId, exercises) => {
    set({
      sessionId: generateId(),
      workoutId,
      startedAt: Date.now(),
      exercises: exercises.map(e => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        muscleGroup: e.muscleGroup,
        targetSets: e.sets,
        targetReps: e.reps,
        restSeconds: e.restSeconds,
      })),
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      loggedSets: [],
      restEndsAt: null,
      notes: '',
    });
  },

  logSet: (reps, weightKg) => {
    const state = get();
    const currentEx = state.exercises[state.currentExerciseIndex];
    if (!currentEx) return;
    const loggedSet: LoggedSet = {
      exerciseId: currentEx.exerciseId,
      setNumber: state.currentSetNumber,
      reps,
      weightKg,
      completed: true,
      loggedAt: Date.now(),
    };
    const nextLoggedSets = [...state.loggedSets, loggedSet];

    const wasLastSet = state.currentSetNumber >= currentEx.targetSets;
    if (wasLastSet) {
      const nextIndex = state.currentExerciseIndex + 1;
      const nextEx = state.exercises[nextIndex];
      set({
        loggedSets: nextLoggedSets,
        currentExerciseIndex: nextIndex < state.exercises.length ? nextIndex : state.currentExerciseIndex,
        currentSetNumber: nextEx ? countLoggedForExercise(nextLoggedSets, nextEx.exerciseId) + 1 : state.currentSetNumber,
        restEndsAt: Date.now() + currentEx.restSeconds * 1000,
      });
    } else {
      set({
        loggedSets: nextLoggedSets,
        currentSetNumber: state.currentSetNumber + 1,
        restEndsAt: Date.now() + currentEx.restSeconds * 1000,
      });
    }
  },

  nextExercise: () => {
    const state = get();
    const nextIndex = Math.min(state.currentExerciseIndex + 1, state.exercises.length - 1);
    const nextEx = state.exercises[nextIndex];
    set({
      currentExerciseIndex: nextIndex,
      currentSetNumber: nextEx ? countLoggedForExercise(state.loggedSets, nextEx.exerciseId) + 1 : 1,
      restEndsAt: null,
    });
  },

  previousExercise: () => {
    const state = get();
    const prevIndex = Math.max(state.currentExerciseIndex - 1, 0);
    const prevEx = state.exercises[prevIndex];
    set({
      currentExerciseIndex: prevIndex,
      currentSetNumber: prevEx ? countLoggedForExercise(state.loggedSets, prevEx.exerciseId) + 1 : 1,
      restEndsAt: null,
    });
  },

  skipExercise: () => {
    get().nextExercise();
  },

  adjustRest: (deltaSeconds) => {
    const current = get().restEndsAt;
    if (current == null) return;
    set({ restEndsAt: current + deltaSeconds * 1000 });
  },

  skipRest: () => set({ restEndsAt: null }),

  setNotes: (notes) => set({ notes }),

  finalize: () => {
    const state = get();
    const now = Date.now();
    const duration = state.startedAt ? Math.floor((now - state.startedAt) / 1000) : 0;
    const session: WorkoutSession = {
      id: state.sessionId ?? generateId(),
      workoutId: state.workoutId ?? '',
      startedAt: state.startedAt ?? now,
      finishedAt: now,
      durationSeconds: duration,
      notes: state.notes.trim() || null,
    };
    const sessionId = session.id;
    const sets: SessionSet[] = state.loggedSets.map(ls => ({
      id: generateId(),
      sessionId,
      exerciseId: ls.exerciseId,
      setNumber: ls.setNumber,
      reps: ls.reps,
      weightKg: ls.weightKg,
      completed: ls.completed ? 1 : 0,
      notes: null,
    }));
    return { session, sets };
  },

  reset: () => set({
    sessionId: null,
    workoutId: null,
    startedAt: null,
    exercises: [],
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    loggedSets: [],
    restEndsAt: null,
    notes: '',
  }),

  currentExercise: () => {
    const state = get();
    return state.exercises[state.currentExerciseIndex] ?? null;
  },

  lastSetForExercise: (exerciseId) => {
    const state = get();
    const matches = state.loggedSets.filter(s => s.exerciseId === exerciseId);
    return matches[matches.length - 1];
  },

  isLastSetOfLastExercise: () => {
    const state = get();
    const lastIndex = state.exercises.length - 1;
    const currentEx = state.exercises[state.currentExerciseIndex];
    if (!currentEx) return false;
    return state.currentExerciseIndex === lastIndex && state.currentSetNumber >= currentEx.targetSets;
  },
}));
```

- [ ] **Step 4: Rodar testes — devem PASSAR**

Run: `pnpm test useActiveSessionStore`
Expected: 11 tests pass.

- [ ] **Step 5: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/store/useActiveSessionStore.ts __tests__/unit/useActiveSessionStore.test.ts
git commit -m "feat: add useActiveSessionStore for in-memory session management"
```

---

## Task 8: Instalar libs e setup Android

**Files:**
- Modify: `package.json` / `pnpm-lock.yaml` via `pnpm add`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Instalar notifee**

Run:
```bash
pnpm add @notifee/react-native
```

- [ ] **Step 2: Adicionar permissão POST_NOTIFICATIONS**

Abra `android/app/src/main/AndroidManifest.xml`. Dentro de `<manifest>` antes de `<application>`, adicione após as permissões existentes:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

- [ ] **Step 3: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml android/app/src/main/AndroidManifest.xml
git commit -m "chore: install notifee and add POST_NOTIFICATIONS permission"
```

---

## Task 9: Keep-awake nativo custom

Em vez de depender de lib potencialmente incompatível com Fabric, criamos um módulo nativo mínimo.

**Files:**
- Create: `android/app/src/main/java/com/treinoapp/KeepAwakeModule.kt`
- Create: `android/app/src/main/java/com/treinoapp/KeepAwakePackage.kt`
- Modify: `android/app/src/main/java/com/treinoapp/MainApplication.kt` (adicionar package)
- Create: `src/hooks/useKeepAwake.ts`

- [ ] **Step 1: Criar `KeepAwakeModule.kt`**

```kotlin
package com.treinoapp

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KeepAwakeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "KeepAwake"

  @ReactMethod
  fun activate() {
    val activity = currentActivity ?: return
    activity.runOnUiThread {
      activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
  }

  @ReactMethod
  fun deactivate() {
    val activity = currentActivity ?: return
    activity.runOnUiThread {
      activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
  }
}
```

- [ ] **Step 2: Criar `KeepAwakePackage.kt`**

```kotlin
package com.treinoapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class KeepAwakePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(KeepAwakeModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
```

- [ ] **Step 3: Registrar package em `MainApplication.kt`**

Abra `android/app/src/main/java/com/treinoapp/MainApplication.kt`. Procure o método `getPackages()` (ou `packages` property):

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // add(MyReactNativePackage())
    }
```

Substitua por (adicionar linha `add(KeepAwakePackage())`):

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(KeepAwakePackage())
    }
```

- [ ] **Step 4: Criar `src/hooks/useKeepAwake.ts`**

```typescript
import { useEffect } from 'react';
import { NativeModules } from 'react-native';

const KeepAwake = NativeModules.KeepAwake as
  | { activate: () => void; deactivate: () => void }
  | undefined;

export function useKeepAwake(enabled = true): void {
  useEffect(() => {
    if (!enabled || !KeepAwake) return;
    KeepAwake.activate();
    return () => KeepAwake.deactivate();
  }, [enabled]);
}
```

- [ ] **Step 5: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/treinoapp/KeepAwakeModule.kt android/app/src/main/java/com/treinoapp/KeepAwakePackage.kt android/app/src/main/java/com/treinoapp/MainApplication.kt src/hooks/useKeepAwake.ts
git commit -m "feat: add native KeepAwake module and useKeepAwake hook"
```

---

## Task 10: Hook `useIntervalTimer`

**Files:**
- Create: `src/hooks/useIntervalTimer.ts`

- [ ] **Step 1: Criar `src/hooks/useIntervalTimer.ts`**

```typescript
import { useEffect, useRef } from 'react';

/**
 * Calls onTick(Date.now()) every tickMs while enabled.
 * Uses Date.now() so consumers can compute elapsed/remaining without drift.
 */
export function useIntervalTimer(
  tickMs: number,
  onTick: (now: number) => void,
  enabled: boolean = true,
): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return;
    const handle = setInterval(() => onTickRef.current(Date.now()), tickMs);
    return () => clearInterval(handle);
  }, [enabled, tickMs]);
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIntervalTimer.ts
git commit -m "feat: add useIntervalTimer hook with Date.now() baseline"
```

---

## Task 11: Notifee setup no bootstrap

**Files:**
- Create: `src/services/notificationService.ts`
- Modify: `App.tsx`

- [ ] **Step 1: Criar `src/services/notificationService.ts`**

```typescript
import notifee, { AndroidImportance } from '@notifee/react-native';

const REST_CHANNEL_ID = 'rest-timer';

export async function setupNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: REST_CHANNEL_ID,
    name: 'Fim do descanso',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

export async function requestNotificationPermission(): Promise<void> {
  await notifee.requestPermission();
}

export async function showRestFinishedNotification(
  exerciseName: string,
  setNumber: number,
): Promise<void> {
  await notifee.displayNotification({
    title: 'Descanso acabou',
    body: `${exerciseName} — Série ${setNumber}`,
    android: {
      channelId: REST_CHANNEL_ID,
      pressAction: { id: 'default' },
      autoCancel: true,
    },
  });
}
```

- [ ] **Step 2: Modificar `App.tsx` para chamar `setupNotificationChannel` no bootstrap**

Abra `App.tsx`. No bloco `useEffect` de bootstrap (onde chama `runMigrations`, `runSeeds`, `loadExercises`), adicione import e chamada:

```typescript
import { setupNotificationChannel } from '@/services/notificationService';
```

E dentro do `useEffect` após `await loadExercises()`:

```typescript
await setupNotificationChannel();
```

- [ ] **Step 3: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/services/notificationService.ts App.tsx
git commit -m "feat: add notification service and channel setup on bootstrap"
```

---

## Task 12: Componente `RestTimer`

**Files:**
- Create: `src/components/session/RestTimer.tsx`

- [ ] **Step 1: Criar `src/components/session/RestTimer.tsx`**

```typescript
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  secondsRemaining: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function RestTimer({ secondsRemaining, onAdjust, onSkip }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Descanso</Text>
      <Text style={styles.clock}>{formatMmSs(secondsRemaining)}</Text>
      <View style={styles.row}>
        <ActionBtn label="-30s" onPress={() => onAdjust(-30)} />
        <ActionBtn label="Pular" onPress={onSkip} primary />
        <ActionBtn label="+30s" onPress={() => onAdjust(30)} />
      </View>
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnLabel, primary && styles.btnLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  clock: { ...typography.monoLarge, color: colors.accent, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    minWidth: 80,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnPressed: { opacity: 0.7 },
  btnLabel: { ...typography.body, color: colors.textPrimary },
  btnLabelPrimary: { fontWeight: '600' },
});
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/session/RestTimer.tsx
git commit -m "feat: add RestTimer component with -30/Skip/+30 controls"
```

---

## Task 13: Componentes `WorkoutTimer`, `SetLogRow`, `ExerciseProgress` + barrel

**Files:**
- Create: `src/components/session/WorkoutTimer.tsx`
- Create: `src/components/session/SetLogRow.tsx`
- Create: `src/components/session/ExerciseProgress.tsx`
- Create: `src/components/session/index.ts`

- [ ] **Step 1: Criar `src/components/session/WorkoutTimer.tsx`**

```typescript
import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useIntervalTimer } from '@/hooks/useIntervalTimer';
import { colors, typography } from '@/theme';

interface Props {
  startedAt: number;
}

function formatHhMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function WorkoutTimer({ startedAt }: Props) {
  const [now, setNow] = useState<number>(Date.now());
  useIntervalTimer(1000, setNow);
  const elapsed = Math.floor((now - startedAt) / 1000);
  return <Text style={styles.clock}>{formatHhMmSs(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  clock: { ...typography.heading, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 2: Criar `src/components/session/SetLogRow.tsx`**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input, Button } from '@/components/common';
import { spacing } from '@/theme';

interface Props {
  weight: string;
  reps: string;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function SetLogRow({ weight, reps, onWeightChange, onRepsChange, onConfirm, disabled }: Props) {
  return (
    <View>
      <View style={styles.inputs}>
        <View style={styles.field}>
          <Input
            label="Carga extra (kg)"
            value={weight}
            onChangeText={onWeightChange}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <View style={styles.field}>
          <Input
            label="Reps"
            value={reps}
            onChangeText={onRepsChange}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
      </View>
      <Button
        label="✅ Concluir série"
        onPress={onConfirm}
        disabled={disabled}
        style={styles.confirmBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputs: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  confirmBtn: { marginTop: spacing.sm, minHeight: 56 },
});
```

- [ ] **Step 3: Criar `src/components/session/ExerciseProgress.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  targetReps: string;
}

export function ExerciseProgress({ exerciseName, currentSet, totalSets, targetReps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.name} numberOfLines={2}>{exerciseName}</Text>
      <Text style={styles.detail}>
        Série {currentSet} de {totalSets} • alvo: {targetReps} reps
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: spacing.md },
  name: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  detail: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});
```

- [ ] **Step 4: Criar barrel `src/components/session/index.ts`**

```typescript
export { RestTimer } from './RestTimer';
export { WorkoutTimer } from './WorkoutTimer';
export { SetLogRow } from './SetLogRow';
export { ExerciseProgress } from './ExerciseProgress';
```

- [ ] **Step 5: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/session/
git commit -m "feat: add WorkoutTimer, SetLogRow, ExerciseProgress and session barrel"
```

---

## Task 14: `FavoriteButton` + atualizar `WorkoutCard`

**Files:**
- Create: `src/components/workout/FavoriteButton.tsx`
- Modify: `src/components/workout/WorkoutCard.tsx`
- Modify: `src/components/workout/index.ts`

- [ ] **Step 1: Criar `src/components/workout/FavoriteButton.tsx`**

```typescript
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/theme';

interface Props {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

export function FavoriteButton({ isFavorite, onToggle, size = 28 }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Icon
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={isFavorite ? '#FFD700' : colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
  pressed: { opacity: 0.7 },
});
```

- [ ] **Step 2: Atualizar `src/components/workout/WorkoutCard.tsx`**

Substitua o arquivo inteiro:

```typescript
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { WorkoutSummary } from '@/types/workout';
import { FavoriteButton } from './FavoriteButton';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  workout: WorkoutSummary;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite: () => void;
}

export function WorkoutCard({ workout, onPress, onLongPress, onToggleFavorite }: Props) {
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
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{workout.name}</Text>
          <Text style={styles.subtitle}>
            {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercício' : 'exercícios'}
          </Text>
        </View>
        <FavoriteButton isFavorite={workout.isFavorite} onToggle={onToggleFavorite} />
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
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
  pressed: { opacity: 0.85 },
  name: { ...typography.heading, color: colors.textPrimary, fontWeight: '700' },
  subtitle: { ...typography.caption, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs },
});
```

- [ ] **Step 3: Atualizar barrel `src/components/workout/index.ts`**

Adicionar export:

```typescript
export { ColorPicker } from './ColorPicker';
export { WorkoutFormFields } from './WorkoutFormFields';
export { WorkoutExerciseRow } from './WorkoutExerciseRow';
export { WorkoutCard } from './WorkoutCard';
export { FavoriteButton } from './FavoriteButton';
```

- [ ] **Step 4: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: erro em `WorkoutListScreen` (falta `onToggleFavorite` prop). Será corrigido no Task 18.

- [ ] **Step 5: Commit**

```bash
git add src/components/workout/FavoriteButton.tsx src/components/workout/WorkoutCard.tsx src/components/workout/index.ts
git commit -m "feat: add FavoriteButton and wire into WorkoutCard"
```

---

## Task 15: `WorkoutPreviewScreen`

**Files:**
- Create: `src/screens/workout/WorkoutPreviewScreen.tsx`
- Modify: `src/navigation/WorkoutStack.tsx` (adicionar entrada no ParamList)

- [ ] **Step 1: Atualizar `WorkoutStackParamList` em `src/navigation/WorkoutStack.tsx`**

Abra o arquivo e substitua o tipo `WorkoutStackParamList`:

```typescript
export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutForm: { mode: 'new' } | { mode: 'edit'; id: string };
  ExercisePicker: undefined;
  ExerciseInWorkout: { index: number };
  WorkoutPreview: { id: string };
  WorkoutExecution: undefined;
  WorkoutSummary: undefined;
};
```

(Ainda não adicione os `<Stack.Screen>` novos — serão adicionados no Task 19 quando todas as screens existirem.)

- [ ] **Step 2: Criar `src/screens/workout/WorkoutPreviewScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, EmptyState } from '@/components/common';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { Workout, WorkoutExercise } from '@/types/workout';
import { MuscleGroupKey, labelForMuscleGroup } from '@/constants/muscleGroups';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutPreview'>;

export function WorkoutPreviewScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const start = useActiveSessionStore(s => s.start);
  const allExercises = useExerciseStore(s => s.all);

  useEffect(() => {
    (async () => {
      const result = await workoutRepository.findById(id);
      if (result) {
        setWorkout(result.workout);
        setExercises(result.exercises);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Treino não encontrado" />
      </SafeAreaView>
    );
  }

  const onStart = () => {
    const enriched = exercises.map(e => {
      const info = allExercises.find(x => x.id === e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        exerciseName: info?.name ?? e.exerciseId,
        muscleGroup: (info?.muscleGroup ?? 'chest') as MuscleGroupKey,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      };
    });
    start(workout.id, enriched);
    navigation.navigate('WorkoutExecution');
  };

  const onEdit = () => {
    navigation.navigate('WorkoutForm', { mode: 'edit', id: workout.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: workout.color }]}>
          <Text style={styles.name}>{workout.name}</Text>
          <Text style={styles.subtitle}>
            {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Exercícios</Text>
        {exercises.map((e, i) => {
          const info = allExercises.find(x => x.id === e.exerciseId);
          return (
            <Card key={e.id} style={styles.itemCard}>
              <Text style={styles.itemName} numberOfLines={1}>
                {i + 1}. {info?.name ?? e.exerciseId}
              </Text>
              <Text style={styles.itemSub}>
                {labelForMuscleGroup(info?.muscleGroup ?? '')} • {e.sets}x{e.reps} • {e.restSeconds}s
              </Text>
            </Card>
          );
        })}

        <View style={styles.actions}>
          <Button label="Editar" variant="secondary" onPress={onEdit} style={styles.actionBtn} />
          <Button label="Iniciar treino" onPress={onStart} style={styles.actionBtn} disabled={exercises.length === 0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  loading: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  header: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  name: { ...typography.title, color: colors.textPrimary, fontWeight: '700' },
  subtitle: { ...typography.body, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  itemCard: { marginBottom: spacing.sm },
  itemName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  itemSub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: { flex: 1 },
});
```

- [ ] **Step 3: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0 para este arquivo. Erro antigo do WorkoutCard ainda persiste (Task 14) — mas o novo `WorkoutPreviewScreen` compila.

- [ ] **Step 4: Commit**

```bash
git add src/screens/workout/WorkoutPreviewScreen.tsx src/navigation/WorkoutStack.tsx
git commit -m "feat: add WorkoutPreviewScreen and expand WorkoutStack ParamList"
```

---

## Task 16: `WorkoutExecutionScreen`

**Files:**
- Create: `src/screens/workout/WorkoutExecutionScreen.tsx`

- [ ] **Step 1: Criar `src/screens/workout/WorkoutExecutionScreen.tsx`**

```typescript
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Text, Pressable, Alert, BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutTimer, RestTimer, SetLogRow, ExerciseProgress } from '@/components/session';
import { Button, EmptyState } from '@/components/common';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useIntervalTimer } from '@/hooks/useIntervalTimer';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { showRestFinishedNotification, requestNotificationPermission } from '@/services/notificationService';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';
import { Vibration } from 'react-native';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutExecution'>;

export function WorkoutExecutionScreen({ navigation }: Props) {
  useKeepAwake();

  const startedAt = useActiveSessionStore(s => s.startedAt);
  const exercises = useActiveSessionStore(s => s.exercises);
  const currentExerciseIndex = useActiveSessionStore(s => s.currentExerciseIndex);
  const currentSetNumber = useActiveSessionStore(s => s.currentSetNumber);
  const restEndsAt = useActiveSessionStore(s => s.restEndsAt);
  const logSet = useActiveSessionStore(s => s.logSet);
  const nextExercise = useActiveSessionStore(s => s.nextExercise);
  const previousExercise = useActiveSessionStore(s => s.previousExercise);
  const skipExercise = useActiveSessionStore(s => s.skipExercise);
  const adjustRest = useActiveSessionStore(s => s.adjustRest);
  const skipRest = useActiveSessionStore(s => s.skipRest);
  const lastSetForExercise = useActiveSessionStore(s => s.lastSetForExercise);
  const isLastSetOfLastExercise = useActiveSessionStore(s => s.isLastSetOfLastExercise);
  const reset = useActiveSessionStore(s => s.reset);

  const currentExercise = exercises[currentExerciseIndex];

  const lastSet = currentExercise ? lastSetForExercise(currentExercise.exerciseId) : undefined;
  const defaultReps = lastSet ? String(lastSet.reps) : (currentExercise?.targetReps ?? '');
  const defaultWeight = lastSet?.weightKg != null ? String(lastSet.weightKg) : '0';

  const [weight, setWeight] = useState<string>(defaultWeight);
  const [reps, setReps] = useState<string>(defaultReps);

  useEffect(() => {
    // Reset inputs whenever current exercise/set changes
    const last = currentExercise ? lastSetForExercise(currentExercise.exerciseId) : undefined;
    setReps(last ? String(last.reps) : (currentExercise?.targetReps ?? ''));
    setWeight(last?.weightKg != null ? String(last.weightKg) : '0');
  }, [currentExerciseIndex, currentSetNumber, currentExercise, lastSetForExercise]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const [now, setNow] = useState(Date.now());
  useIntervalTimer(500, setNow, restEndsAt != null);

  const [hasNotified, setHasNotified] = useState(false);
  const secondsLeft = restEndsAt != null ? Math.ceil((restEndsAt - now) / 1000) : 0;

  useEffect(() => {
    if (restEndsAt != null && now >= restEndsAt && !hasNotified) {
      Vibration.vibrate(300);
      if (currentExercise) {
        showRestFinishedNotification(currentExercise.exerciseName, currentSetNumber);
      }
      setHasNotified(true);
      skipRest();
    }
    if (restEndsAt != null && !hasNotified && now < restEndsAt) {
      // fresh rest started; reset flag
    }
    if (restEndsAt == null) {
      setHasNotified(false);
    }
  }, [restEndsAt, now, hasNotified, currentExercise, currentSetNumber, skipRest]);

  const onConfirmSet = () => {
    const repsNum = parseInt(reps, 10);
    if (isNaN(repsNum) || repsNum <= 0) return;
    const weightNum = weight.trim() === '' ? null : parseFloat(weight);
    const weightFinal = weightNum == null || isNaN(weightNum) ? null : weightNum;

    if (isLastSetOfLastExercise()) {
      logSet(repsNum, weightFinal);
      navigation.navigate('WorkoutSummary');
    } else {
      logSet(repsNum, weightFinal);
    }
  };

  const openExitMenu = () => {
    Alert.alert(
      'Sair do treino?',
      undefined,
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Finalizar agora',
          onPress: () => navigation.navigate('WorkoutSummary'),
        },
        {
          text: 'Descartar treino',
          style: 'destructive',
          onPress: () => {
            reset();
            navigation.popToTop();
          },
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={openExitMenu} style={styles.headerBtn}>
          <Icon name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
      headerTitle: () => (startedAt ? <WorkoutTimer startedAt={startedAt} /> : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, startedAt]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      openExitMenu();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentExercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Nenhum exercício na sessão" />
        <Button label="Sair" onPress={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ExerciseProgress
          exerciseName={currentExercise.exerciseName}
          currentSet={currentSetNumber}
          totalSets={currentExercise.targetSets}
          targetReps={currentExercise.targetReps}
        />

        <View style={styles.mediaPlaceholder}>
          <Icon name="fitness-center" size={64} color={colors.textSecondary} />
        </View>

        {restEndsAt != null && secondsLeft > 0 ? (
          <RestTimer
            secondsRemaining={secondsLeft}
            onAdjust={adjustRest}
            onSkip={skipRest}
          />
        ) : (
          <SetLogRow
            weight={weight}
            reps={reps}
            onWeightChange={setWeight}
            onRepsChange={setReps}
            onConfirm={onConfirmSet}
            disabled={parseInt(reps, 10) <= 0 || isNaN(parseInt(reps, 10))}
          />
        )}

        <View style={styles.nav}>
          <Button
            label="◀ Anterior"
            variant="ghost"
            onPress={previousExercise}
            disabled={currentExerciseIndex === 0}
            style={styles.navBtn}
          />
          <Text style={styles.navCount}>
            {currentExerciseIndex + 1}/{exercises.length}
          </Text>
          <Button
            label="Próximo ▶"
            variant="ghost"
            onPress={nextExercise}
            disabled={currentExerciseIndex >= exercises.length - 1}
            style={styles.navBtn}
          />
        </View>

        <Button
          label="Pular exercício"
          variant="ghost"
          onPress={skipExercise}
          style={styles.skipBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerBtn: { paddingHorizontal: spacing.sm },
  mediaPlaceholder: {
    aspectRatio: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  navBtn: { flex: 1 },
  navCount: { ...typography.body, color: colors.textSecondary, paddingHorizontal: spacing.md },
  skipBtn: { marginTop: spacing.sm },
});
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutExecutionScreen.tsx
git commit -m "feat: add WorkoutExecutionScreen with timer, set logging, rest, navigation"
```

---

## Task 17: `WorkoutSummaryScreen`

**Files:**
- Create: `src/screens/workout/WorkoutSummaryScreen.tsx`

- [ ] **Step 1: Criar `src/screens/workout/WorkoutSummaryScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { ScrollView, StyleSheet, SafeAreaView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input } from '@/components/common';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { WorkoutStackParamList } from '@/navigation/WorkoutStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'WorkoutSummary'>;

function formatDuration(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  if (mm === 0) return `${ss}s`;
  return `${mm}min ${ss.toString().padStart(2, '0')}s`;
}

export function WorkoutSummaryScreen({ navigation }: Props) {
  const exercises = useActiveSessionStore(s => s.exercises);
  const loggedSets = useActiveSessionStore(s => s.loggedSets);
  const startedAt = useActiveSessionStore(s => s.startedAt);
  const setNotes = useActiveSessionStore(s => s.setNotes);
  const finalize = useActiveSessionStore(s => s.finalize);
  const reset = useActiveSessionStore(s => s.reset);

  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const totalTargetSets = exercises.reduce((sum, e) => sum + e.targetSets, 0);
  const duration = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  const onFinish = async () => {
    setSaving(true);
    setNotes(notesInput);
    const { session, sets } = finalize();
    await sessionRepository.insert(session, sets);
    reset();
    setSaving(false);
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Treino concluído</Text>

        <View style={styles.statsRow}>
          <StatBlock label="Duração" value={formatDuration(duration)} />
          <StatBlock label="Séries" value={`${loggedSets.length}/${totalTargetSets}`} />
        </View>

        <Text style={styles.sectionTitle}>Notas</Text>
        <Input
          value={notesInput}
          onChangeText={setNotesInput}
          multiline
          placeholder="Como foi o treino?"
          style={styles.notesInput}
        />

        <Button
          label="Concluir"
          onPress={onFinish}
          loading={saving}
          style={styles.finishBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: { ...typography.title, color: colors.accent, fontWeight: '700' },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  notesInput: { minHeight: 100, textAlignVertical: 'top', marginBottom: spacing.lg },
  finishBtn: { marginTop: spacing.md },
});
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutSummaryScreen.tsx
git commit -m "feat: add WorkoutSummaryScreen with notes and persist"
```

---

## Task 18: Atualizar `WorkoutListScreen` — toggleFavorite wiring

**Files:**
- Modify: `src/screens/workout/WorkoutListScreen.tsx`

- [ ] **Step 1: Passar `onToggleFavorite` pro `WorkoutCard`**

Abra `src/screens/workout/WorkoutListScreen.tsx`. Dentro do componente, adicione ao bloco de selectors do store:

```typescript
  const toggleFavorite = useWorkoutStore(s => s.toggleFavorite);
```

E no `renderItem` do FlatList, substitua a chamada do `<WorkoutCard ...>` para incluir `onToggleFavorite`:

```typescript
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => navigation.navigate('WorkoutPreview', { id: item.id })}
            onLongPress={() => openMenu(item.id, item.name)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
```

(Também trocar `WorkoutForm` edit → `WorkoutPreview` para abrir preview antes de edit.)

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/workout/WorkoutListScreen.tsx
git commit -m "feat: wire toggleFavorite and navigate to WorkoutPreview from list"
```

---

## Task 19: Atualizar `WorkoutStack` — incluir screens novas

**Files:**
- Modify: `src/navigation/WorkoutStack.tsx`

- [ ] **Step 1: Adicionar imports e `<Stack.Screen>` novos**

Substitua todo o `src/navigation/WorkoutStack.tsx` por:

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkoutListScreen } from '@/screens/workout/WorkoutListScreen';
import { WorkoutFormScreen } from '@/screens/workout/WorkoutFormScreen';
import { ExercisePickerScreen } from '@/screens/workout/ExercisePickerScreen';
import { ExerciseInWorkoutScreen } from '@/screens/workout/ExerciseInWorkoutScreen';
import { WorkoutPreviewScreen } from '@/screens/workout/WorkoutPreviewScreen';
import { WorkoutExecutionScreen } from '@/screens/workout/WorkoutExecutionScreen';
import { WorkoutSummaryScreen } from '@/screens/workout/WorkoutSummaryScreen';
import { colors } from '@/theme';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutForm: { mode: 'new' } | { mode: 'edit'; id: string };
  ExercisePicker: undefined;
  ExerciseInWorkout: { index: number };
  WorkoutPreview: { id: string };
  WorkoutExecution: undefined;
  WorkoutSummary: undefined;
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
        name="WorkoutPreview"
        component={WorkoutPreviewScreen}
        options={{ title: 'Treino' }}
      />
      <Stack.Screen
        name="WorkoutExecution"
        component={WorkoutExecutionScreen}
        options={{ title: 'Em andamento', gestureEnabled: false }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{ title: 'Resumo', gestureEnabled: false, headerBackVisible: false }}
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

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/WorkoutStack.tsx
git commit -m "feat: add WorkoutPreview, WorkoutExecution, WorkoutSummary screens to stack"
```

---

## Task 20: Smoke test + rebuild

**Files:** nenhum (só validação)

- [ ] **Step 1: Rodar suite de testes**

Run: `pnpm test`
Expected: todos os testes passam (generateId, mediaResolver, workoutRepository, useWorkoutDraftStore, sessionRepository, useActiveSessionStore).

- [ ] **Step 2: Rebuild Android (native module novo)**

```bash
export PATH=$PATH:$HOME/Android/Sdk/platform-tools
adb reverse tcp:8081 tcp:8081
cd android && ./gradlew clean && cd ..
pnpm start &   # em outro terminal, idealmente
pnpm android
```

- [ ] **Step 3: Smoke test no device — checklist**

- [ ] Tab "Treinos" mostra lista com favoritos (se existirem) no topo
- [ ] Ícone ★ aparece em cada card; tocar no ícone alterna estrela (favorito no topo)
- [ ] Tocar no card abre `WorkoutPreviewScreen` com nome, cor, exercícios listados, botões "Editar" / "Iniciar"
- [ ] "Editar" abre `WorkoutFormScreen` em modo edit
- [ ] "Iniciar" abre `WorkoutExecutionScreen` com timer no header, nome do exercício e "Série 1 de N"
- [ ] Placeholder estático com ícone ao invés de vídeo
- [ ] Inputs "Carga extra (kg)" e "Reps" pré-preenchidos
- [ ] "Concluir série" registra e abre rest timer
- [ ] Rest timer mostra contagem regressiva; botões -30s / Pular / +30s funcionam
- [ ] Ao zerar: vibra o celular + aparece notificação Android ("Descanso acabou")
- [ ] Próxima série aparece automaticamente
- [ ] Última série do último exercício → navega para Resumo
- [ ] Botões ◀ Anterior / Próximo ▶ navegam entre exercícios
- [ ] "Pular exercício" avança sem registrar
- [ ] "X" no header abre menu "Continuar / Finalizar agora / Descartar"
- [ ] "Descartar" volta pra lista (nada salvo)
- [ ] "Finalizar agora" vai pra Resumo com o que foi feito
- [ ] Resumo mostra duração + séries + campo Notas + botão Concluir
- [ ] Concluir salva e volta pra lista de Treinos
- [ ] Durante execução: tela não apaga (keep-awake)
- [ ] Fechar e abrir app: treinos persistem; sessão não (esperado — em memória)

- [ ] **Step 4: Se tudo OK:** celebrar. Se algo falhar, triagem via `adb logcat -d | grep -iE 'reactnative|fatal|error' | tail -40`.

---

## Notas para implementação

- **Notifee requires native code** — `pnpm android` após instalar vai linkar automaticamente. Se falhar, investigar via logs de gradle.
- **Permissão POST_NOTIFICATIONS** — Android 13+ mostra dialog ao usuário na primeira chamada de `notifee.displayNotification`. Usuário pode negar; app funciona sem notificação.
- **Keep-awake customizado** — testar que `activate()` / `deactivate()` são chamados no ciclo mount/unmount. Se não funcionar, verificar logcat por erros Kotlin.
- **Migration v2 em device que já tinha v1 aplicada** — sistema de migrations pula v1, aplica só v2. Validar que treinos existentes ficam com `is_favorite = 0`.
- **Timer drift** — `useIntervalTimer` usa `Date.now()` como fonte da verdade, então trocar de app e voltar continua o timer certo.
- **Vídeo permanece placeholder** — known issue documentada em `docs/superpowers/plans/2026-04-17-fix-video-playback.md` segue aberto.
