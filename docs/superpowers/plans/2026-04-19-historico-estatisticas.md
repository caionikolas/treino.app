# Histórico + Estatísticas (Fase 5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar tab "Histórico" com calendário mensal de sessões, detalhe da sessão com botão "Repetir treino", e tela de estatísticas gerais básicas.

**Architecture:** Adiciona `HistoryStack` (substitui `ComingSoonScreen` da tab Histórico) com 4 screens (top-tabs + detalhe + screens de execução compartilhadas). Expande `sessionRepository` com 4 métodos novos. Novo `useHistoryStore` cacheia sessões por mês + estatísticas, invalidado após cada sessão salva. Usa `react-native-calendars` pro calendário e `@react-navigation/material-top-tabs` pro toggle Histórico/Estatísticas.

**Tech Stack:** React Native 0.85.1, TypeScript, op-sqlite (async), Zustand, react-native-calendars, @react-navigation/material-top-tabs, react-native-pager-view (peer de top-tabs).

**Spec de referência:** `docs/superpowers/specs/2026-04-19-historico-estatisticas-design.md`

**Convenções:**
- Código em inglês, UI em PT-BR
- Locale para calendário: `pt-br` (dias da semana em português)
- Data format `YYYY-MM-DD` para chaves do calendário

---

## Task 1: Types — `src/types/history.ts`

**Files:**
- Create: `src/types/history.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import { WorkoutSession, SessionSet } from '@/types/session';

export interface StatsData {
  sessionsThisMonth: number;
  avgSessionsPerWeek: number;
  avgDurationSeconds: number;
  totalSessions: number;
}

export interface SessionWithMeta {
  session: WorkoutSession;
  workoutName: string;
  workoutColor: string;
}

export interface SessionDetail {
  session: WorkoutSession;
  workoutName: string;   // "Treino removido" se workout não existe
  workoutColor: string;  // cor default se workout não existe
  workoutExists: boolean;
  setsByExercise: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    sets: SessionSet[];
  }>;
}
```

- [ ] **Step 2: Verify tsc**

Run: `pnpm tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/types/history.ts
git commit -m "feat: add history types (StatsData, SessionWithMeta, SessionDetail)"
```

---

## Task 2: sessionRepository — findByDateRange + findDatesWithSessions (TDD)

**Files:**
- Modify: `src/database/repositories/sessionRepository.ts`
- Modify: `__tests__/unit/sessionRepository.test.ts`

- [ ] **Step 1: Adicionar testes ao fim do `describe('sessionRepository', ...)` em `__tests__/unit/sessionRepository.test.ts`**

```typescript
  it('findByDateRange returns sessions within range ordered desc', async () => {
    await sessionRepository.insert(makeSession({ id: 's-1', startedAt: 1_000_000 }), []);
    await sessionRepository.insert(makeSession({ id: 's-2', startedAt: 2_000_000 }), []);
    await sessionRepository.insert(makeSession({ id: 's-3', startedAt: 3_000_000 }), []);

    const result = await sessionRepository.findByDateRange(1_500_000, 2_500_000);
    expect(result.map(s => s.id)).toEqual(['s-2']);

    const all = await sessionRepository.findByDateRange(0, 5_000_000);
    expect(all.map(s => s.id)).toEqual(['s-3', 's-2', 's-1']);
  });

  it('findDatesWithSessions returns distinct YYYY-MM-DD strings', async () => {
    // Mar 15 local date in epoch ms (use fixed UTC to keep test deterministic)
    const d1 = new Date('2026-03-15T10:00:00Z').getTime();
    const d1b = new Date('2026-03-15T20:00:00Z').getTime(); // same day
    const d2 = new Date('2026-03-20T05:00:00Z').getTime();

    await sessionRepository.insert(makeSession({ id: 's-1', startedAt: d1 }), []);
    await sessionRepository.insert(makeSession({ id: 's-2', startedAt: d1b }), []);
    await sessionRepository.insert(makeSession({ id: 's-3', startedAt: d2 }), []);

    const dates = await sessionRepository.findDatesWithSessions(
      new Date('2026-03-01').getTime(),
      new Date('2026-04-01').getTime(),
    );
    // Not asserting exact date because of timezone; but should have 2 distinct days
    expect(dates.length).toBe(2);
    dates.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });
```

- [ ] **Step 2: Rodar `pnpm test sessionRepository` — novos tests FAIL.**

- [ ] **Step 3: Adicionar métodos em `src/database/repositories/sessionRepository.ts`**

No objeto `sessionRepository`, após `findRecent`, adicione:

```typescript
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
```

- [ ] **Step 4: `pnpm test sessionRepository` — 5 tests pass (3 antigos + 2 novos).**

- [ ] **Step 5: `pnpm tsc --noEmit` clean.**

- [ ] **Step 6: Commit**

```bash
git add src/database/repositories/sessionRepository.ts __tests__/unit/sessionRepository.test.ts
git commit -m "feat: add findByDateRange and findDatesWithSessions to sessionRepository"
```

---

## Task 3: sessionRepository — findById (detalhe) + getStats (TDD)

**Files:**
- Modify: `src/database/repositories/sessionRepository.ts`
- Modify: `__tests__/unit/sessionRepository.test.ts`

- [ ] **Step 1: Adicionar testes no fim do describe**

```typescript
  it('findById returns SessionDetail with grouped sets', async () => {
    const session = makeSession();
    const sets: SessionSet[] = [
      { id: 'ss-1', sessionId: 's-1', exerciseId: 'ex-1', setNumber: 1, reps: 12, weightKg: 80, completed: 1, notes: null },
      { id: 'ss-2', sessionId: 's-1', exerciseId: 'ex-1', setNumber: 2, reps: 10, weightKg: 85, completed: 1, notes: null },
    ];
    await sessionRepository.insert(session, sets);

    const detail = await sessionRepository.findById('s-1');
    expect(detail).not.toBeNull();
    expect(detail!.session.id).toBe('s-1');
    expect(detail!.workoutName).toBe('Treino');
    expect(detail!.workoutExists).toBe(true);
    expect(detail!.setsByExercise.length).toBe(1);
    expect(detail!.setsByExercise[0].exerciseName).toBe('Test');
    expect(detail!.setsByExercise[0].sets.length).toBe(2);
  });

  it('findById returns workoutExists=false when workout was deleted', async () => {
    await sessionRepository.insert(makeSession(), [makeSet()]);
    const { getDb } = require('@/database/connection');
    await getDb().execute('DELETE FROM workouts WHERE id = ?', ['w-1']);

    const detail = await sessionRepository.findById('s-1');
    expect(detail).not.toBeNull();
    expect(detail!.workoutExists).toBe(false);
    expect(detail!.workoutName).toBe('Treino removido');
  });

  it('findById returns null for unknown session id', async () => {
    expect(await sessionRepository.findById('does-not-exist')).toBeNull();
  });

  it('getStats returns zeros when no sessions', async () => {
    const stats = await sessionRepository.getStats();
    expect(stats).toEqual({
      sessionsThisMonth: 0,
      avgSessionsPerWeek: 0,
      avgDurationSeconds: 0,
      totalSessions: 0,
    });
  });

  it('getStats computes basic metrics with sessions', async () => {
    const now = Date.now();
    // 2 sessions this month
    await sessionRepository.insert(
      makeSession({ id: 's-1', startedAt: now - 1000, finishedAt: now, durationSeconds: 1800 }),
      [],
    );
    await sessionRepository.insert(
      makeSession({ id: 's-2', startedAt: now - 2000, finishedAt: now, durationSeconds: 2400 }),
      [],
    );

    const stats = await sessionRepository.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.sessionsThisMonth).toBeGreaterThanOrEqual(2);
    expect(stats.avgDurationSeconds).toBeCloseTo(2100, 0);
    expect(stats.avgSessionsPerWeek).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Rodar `pnpm test sessionRepository` — 5 new fail.**

- [ ] **Step 3: Implementar `findById` e `getStats` em `sessionRepository.ts`**

Primeiro, ATUALIZE o import no topo do arquivo:

```typescript
import { getDb } from '../connection';
import { WorkoutSession, SessionSet } from '@/types/session';
import { SessionDetail, StatsData } from '@/types/history';
```

Adicione interfaces auxiliares no começo (após as interfaces de row existentes):

```typescript
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
```

Adicione os métodos no objeto `sessionRepository`:

```typescript
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
```

- [ ] **Step 4: `pnpm test sessionRepository` — 10 tests pass.**

- [ ] **Step 5: `pnpm tsc --noEmit` clean.**

- [ ] **Step 6: Commit**

```bash
git add src/database/repositories/sessionRepository.ts __tests__/unit/sessionRepository.test.ts
git commit -m "feat: add findById (detail) and getStats to sessionRepository"
```

---

## Task 4: `useHistoryStore`

**Files:**
- Create: `src/store/useHistoryStore.ts`

- [ ] **Step 1: Criar `src/store/useHistoryStore.ts`**

```typescript
import { create } from 'zustand';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { SessionWithMeta, StatsData } from '@/types/history';

interface HistoryState {
  sessionsByMonth: Record<string, SessionWithMeta[]>;
  datesByMonth: Record<string, string[]>;
  stats: StatsData | null;

  loadMonth: (yearMonth: string) => Promise<void>;
  loadStats: () => Promise<void>;
  invalidate: () => void;
}

function monthRange(yearMonth: string): { start: number; end: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();
  return { start, end };
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  sessionsByMonth: {},
  datesByMonth: {},
  stats: null,

  loadMonth: async (yearMonth) => {
    const { start, end } = monthRange(yearMonth);
    const [sessions, dates] = await Promise.all([
      sessionRepository.findByDateRange(start, end),
      sessionRepository.findDatesWithSessions(start, end),
    ]);

    const summaries = await workoutRepository.findAllSummaries();
    const nameById = new Map(summaries.map(s => [s.id, { name: s.name, color: s.color }]));

    const enriched: SessionWithMeta[] = sessions.map(s => {
      const meta = nameById.get(s.workoutId);
      return {
        session: s,
        workoutName: meta?.name ?? 'Treino removido',
        workoutColor: meta?.color ?? '#8E8E93',
      };
    });

    set(state => ({
      sessionsByMonth: { ...state.sessionsByMonth, [yearMonth]: enriched },
      datesByMonth: { ...state.datesByMonth, [yearMonth]: dates },
    }));
  },

  loadStats: async () => {
    const stats = await sessionRepository.getStats();
    set({ stats });
  },

  invalidate: () => {
    set({ sessionsByMonth: {}, datesByMonth: {}, stats: null });
  },
}));
```

- [ ] **Step 2: Verify tsc → clean.**

- [ ] **Step 3: Commit**

```bash
git add src/store/useHistoryStore.ts
git commit -m "feat: add useHistoryStore with cache per month + stats"
```

---

## Task 5: Instalar libs

**Files:**
- Modify: `package.json` / `pnpm-lock.yaml`

- [ ] **Step 1: Instalar calendars + material-top-tabs + pager-view**

Run:
```bash
pnpm add react-native-calendars @react-navigation/material-top-tabs react-native-pager-view
```

- [ ] **Step 2: Verify tsc → clean.**

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install react-native-calendars and material-top-tabs"
```

---

## Task 6: Componente `SessionCard`

**Files:**
- Create: `src/components/history/SessionCard.tsx`

- [ ] **Step 1: Criar**

```typescript
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { SessionWithMeta } from '@/types/history';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  item: SessionWithMeta;
  onPress: () => void;
}

function formatHhMm(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const mm = Math.floor(seconds / 60);
  return mm > 0 ? `${mm} min` : `${seconds}s`;
}

export function SessionCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.bar, { backgroundColor: item.workoutColor }]} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.workoutName}</Text>
        <Text style={styles.sub}>
          {formatHhMm(item.session.startedAt)} • {formatDuration(item.session.durationSeconds)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  bar: { width: 6 },
  body: { flex: 1, padding: spacing.md },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Verify tsc → clean.**

- [ ] **Step 3: Commit**

```bash
git add src/components/history/SessionCard.tsx
git commit -m "feat: add SessionCard component"
```

---

## Task 7: Componente `StatsCard` + `ExerciseLogGroup` + barrel

**Files:**
- Create: `src/components/history/StatsCard.tsx`
- Create: `src/components/history/ExerciseLogGroup.tsx`
- Create: `src/components/history/index.ts`

- [ ] **Step 1: Criar `src/components/history/StatsCard.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  label: string;
  value: string;
}

export function StatsCard({ label, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  value: { ...typography.title, color: colors.accent, fontSize: 32, fontWeight: '700' },
  label: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Criar `src/components/history/ExerciseLogGroup.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge } from '@/components/common';
import { SessionSet } from '@/types/session';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exerciseName: string;
  muscleGroup: string;
  sets: SessionSet[];
}

function formatSet(set: SessionSet): string {
  const w = set.weightKg == null ? '' : `@${set.weightKg}kg`;
  return `${set.reps}${w}`;
}

export function ExerciseLogGroup({ exerciseName, muscleGroup, sets }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{exerciseName}</Text>
        {muscleGroup ? <Badge label={labelForMuscleGroup(muscleGroup)} /> : null}
      </View>
      <Text style={styles.sets}>
        {sets.map(formatSet).join(', ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  sets: { ...typography.body, color: colors.textSecondary },
});
```

- [ ] **Step 3: Criar `src/components/history/index.ts`**

```typescript
export { SessionCard } from './SessionCard';
export { StatsCard } from './StatsCard';
export { ExerciseLogGroup } from './ExerciseLogGroup';
```

- [ ] **Step 4: Verify tsc → clean.**

- [ ] **Step 5: Commit**

```bash
git add src/components/history/
git commit -m "feat: add StatsCard, ExerciseLogGroup, and history barrel"
```

---

## Task 8: `HistoryCalendarScreen`

**Files:**
- Create: `src/screens/history/HistoryCalendarScreen.tsx`

- [ ] **Step 1: Criar**

```typescript
import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SessionCard } from '@/components/history';
import { EmptyState } from '@/components/common';
import { useHistoryStore } from '@/store/useHistoryStore';
import { HistoryStackParamList } from '@/navigation/HistoryStack';
import { colors, spacing, typography } from '@/theme';

LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
};
LocaleConfig.defaultLocale = 'pt-br';

type Props = any;  // tipo simples porque está dentro de top tabs

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function toIsoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export function HistoryCalendarScreen({ navigation }: Props) {
  const today = new Date();
  const [currentYearMonth, setCurrentYearMonth] = useState(toYearMonth(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sessionsByMonth = useHistoryStore(s => s.sessionsByMonth);
  const datesByMonth = useHistoryStore(s => s.datesByMonth);
  const loadMonth = useHistoryStore(s => s.loadMonth);

  useEffect(() => {
    loadMonth(currentYearMonth);
  }, [currentYearMonth, loadMonth]);

  const markedDates = useMemo(() => {
    const dates = datesByMonth[currentYearMonth] ?? [];
    const marks: Record<string, any> = {};
    dates.forEach(d => {
      marks[d] = { marked: true, dotColor: colors.accent };
    });
    if (selectedDay) {
      marks[selectedDay] = { ...(marks[selectedDay] ?? {}), selected: true, selectedColor: colors.accent };
    }
    return marks;
  }, [datesByMonth, currentYearMonth, selectedDay]);

  const sessionsOfDay = useMemo(() => {
    if (!selectedDay) return [];
    const all = sessionsByMonth[currentYearMonth] ?? [];
    return all.filter(s => toIsoDay(s.session.startedAt) === selectedDay);
  }, [sessionsByMonth, currentYearMonth, selectedDay]);

  return (
    <SafeAreaView style={styles.container}>
      <Calendar
        current={currentYearMonth + '-01'}
        onMonthChange={(m: any) => setCurrentYearMonth(toYearMonth(new Date(m.year, m.month - 1, 1)))}
        onDayPress={(d: any) => setSelectedDay(d.dateString)}
        markedDates={markedDates}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textSecondary,
          dayTextColor: colors.textPrimary,
          todayTextColor: colors.accent,
          selectedDayBackgroundColor: colors.accent,
          selectedDayTextColor: colors.textPrimary,
          monthTextColor: colors.textPrimary,
          arrowColor: colors.accent,
          textDisabledColor: colors.border,
        }}
      />

      <View style={styles.listSection}>
        {selectedDay == null ? (
          <Text style={styles.hint}>Selecione um dia para ver sessões</Text>
        ) : sessionsOfDay.length === 0 ? (
          <EmptyState icon="event-busy" title="Nenhum treino neste dia" />
        ) : (
          <FlatList
            data={sessionsOfDay}
            keyExtractor={item => item.session.id}
            renderItem={({ item }) => (
              <SessionCard
                item={item}
                onPress={() => navigation.navigate('SessionDetail', { id: item.session.id })}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listSection: { flex: 1, padding: spacing.md },
  hint: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  listContent: { paddingBottom: spacing.xxl },
});
```

- [ ] **Step 2: Verify tsc → clean.**

- [ ] **Step 3: Commit**

```bash
git add src/screens/history/HistoryCalendarScreen.tsx
git commit -m "feat: add HistoryCalendarScreen with calendar + session list"
```

---

## Task 9: `StatsScreen`

**Files:**
- Create: `src/screens/history/StatsScreen.tsx`

- [ ] **Step 1: Criar**

```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatsCard } from '@/components/history';
import { EmptyState } from '@/components/common';
import { useHistoryStore } from '@/store/useHistoryStore';
import { colors, spacing } from '@/theme';

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const mm = Math.round(seconds / 60);
  return `${mm} min`;
}

export function StatsScreen() {
  const stats = useHistoryStore(s => s.stats);
  const loadStats = useHistoryStore(s => s.loadStats);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (stats == null) {
    return <SafeAreaView style={styles.container} />;
  }

  if (stats.totalSessions === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="insights"
          title="Nenhum treino ainda"
          subtitle="Complete um treino para ver suas estatísticas"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <StatsCard label="Treinos este mês" value={String(stats.sessionsThisMonth)} />
        <StatsCard label="Frequência semanal" value={stats.avgSessionsPerWeek.toFixed(1)} />
        <StatsCard label="Duração média" value={formatDuration(stats.avgDurationSeconds)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
});
```

- [ ] **Step 2: Verify tsc → clean.**

- [ ] **Step 3: Commit**

```bash
git add src/screens/history/StatsScreen.tsx
git commit -m "feat: add StatsScreen with 3 basic stats cards"
```

---

## Task 10: `SessionDetailScreen`

**Files:**
- Create: `src/screens/history/SessionDetailScreen.tsx`

- [ ] **Step 1: Criar**

```typescript
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, EmptyState } from '@/components/common';
import { ExerciseLogGroup } from '@/components/history';
import { sessionRepository } from '@/database/repositories/sessionRepository';
import { workoutRepository } from '@/database/repositories/workoutRepository';
import { useActiveSessionStore } from '@/store/useActiveSessionStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { SessionDetail } from '@/types/history';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { HistoryStackParamList } from '@/navigation/HistoryStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<HistoryStackParamList, 'SessionDetail'>;

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm} min ${ss.toString().padStart(2, '0')}s`;
}

export function SessionDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const start = useActiveSessionStore(s => s.start);
  const allExercises = useExerciseStore(s => s.all);

  useEffect(() => {
    (async () => {
      const d = await sessionRepository.findById(id);
      setDetail(d);
      setLoading(false);
    })();
  }, [id]);

  const onRepeat = async () => {
    if (!detail || !detail.workoutExists) {
      Alert.alert('Treino original não existe mais');
      return;
    }
    const workoutData = await workoutRepository.findById(detail.session.workoutId);
    if (!workoutData) {
      Alert.alert('Treino original não existe mais');
      return;
    }
    const enriched = workoutData.exercises.map(e => {
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
    start(workoutData.workout.id, enriched);
    navigation.navigate('WorkoutExecution');
  };

  if (loading) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Sessão não encontrada" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: detail.workoutColor }]}>
          <Text style={styles.name}>{detail.workoutName}</Text>
          <Text style={styles.sub}>
            {formatDate(detail.session.startedAt)} • {formatDuration(detail.session.durationSeconds)}
          </Text>
        </View>

        {detail.session.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notas</Text>
            <Text style={styles.notesText}>{detail.session.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Exercícios</Text>
        {detail.setsByExercise.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhum exercício registrado nesta sessão</Text>
        ) : (
          detail.setsByExercise.map(group => (
            <ExerciseLogGroup
              key={group.exerciseId}
              exerciseName={group.exerciseName}
              muscleGroup={group.muscleGroup}
              sets={group.sets}
            />
          ))
        )}

        <Button
          label="Repetir treino"
          onPress={onRepeat}
          disabled={!detail.workoutExists}
          style={styles.repeatBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  name: { ...typography.title, color: colors.textPrimary, fontWeight: '700' },
  sub: { ...typography.body, color: colors.textPrimary, opacity: 0.9, marginTop: spacing.xs, textTransform: 'capitalize' },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  notesText: { ...typography.body, color: colors.textPrimary },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyHint: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg },
  repeatBtn: { marginTop: spacing.lg },
});
```

- [ ] **Step 2: Verify tsc — vai dar erro porque `HistoryStack` ainda não existe. Isso é esperado. Será corrigido no Task 11.**

- [ ] **Step 3: Commit**

```bash
git add src/screens/history/SessionDetailScreen.tsx
git commit -m "feat: add SessionDetailScreen with Repetir treino button"
```

---

## Task 11: `HistoryTabsScreen` + `HistoryStack`

**Files:**
- Create: `src/screens/history/HistoryTabsScreen.tsx`
- Create: `src/navigation/HistoryStack.tsx`

- [ ] **Step 1: Criar `src/screens/history/HistoryTabsScreen.tsx`**

```typescript
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { HistoryCalendarScreen } from './HistoryCalendarScreen';
import { StatsScreen } from './StatsScreen';
import { colors, typography } from '@/theme';

const Tab = createMaterialTopTabNavigator();

export function HistoryTabsScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.primary },
        tabBarIndicatorStyle: { backgroundColor: colors.accent },
        tabBarLabelStyle: { ...typography.body, fontWeight: '600', textTransform: 'none' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Calendar" component={HistoryCalendarScreen} options={{ title: 'Histórico' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Estatísticas' }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 2: Criar `src/navigation/HistoryStack.tsx`**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryTabsScreen } from '@/screens/history/HistoryTabsScreen';
import { SessionDetailScreen } from '@/screens/history/SessionDetailScreen';
import { WorkoutExecutionScreen } from '@/screens/workout/WorkoutExecutionScreen';
import { WorkoutSummaryScreen } from '@/screens/workout/WorkoutSummaryScreen';
import { colors } from '@/theme';

export type HistoryStackParamList = {
  HistoryTabs: undefined;
  SessionDetail: { id: string };
  WorkoutExecution: undefined;
  WorkoutSummary: undefined;
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="HistoryTabs"
        component={HistoryTabsScreen}
        options={{ title: 'Histórico' }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Sessão' }}
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
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Verify tsc → deve resolver erros anteriores do `HistoryStackParamList`. Erro restante: `WorkoutExecutionScreen` e `WorkoutSummaryScreen` importam `WorkoutStackParamList` — via `NativeStackScreenProps<WorkoutStackParamList, ...>`. Quando navegadas do `HistoryStack`, as props da route ainda são tipadas contra `WorkoutStackParamList`, não `HistoryStackParamList`. A navegação via `navigation.navigate('WorkoutSummary')` dentro dessas screens continua funcionando porque o ParamList é resolvido em runtime. **Não precisa mudar nada** — a única diferença é que o TypeScript não captura esse cross-stack call de forma estática, mas o comportamento é idêntico.**

Run `pnpm tsc --noEmit` → esperado: clean.

- [ ] **Step 4: Commit**

```bash
git add src/screens/history/HistoryTabsScreen.tsx src/navigation/HistoryStack.tsx
git commit -m "feat: add HistoryTabsScreen and HistoryStack"
```

---

## Task 12: Wire `HistoryStack` em `AppNavigator` + invalidar cache após salvar

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/screens/workout/WorkoutSummaryScreen.tsx`

- [ ] **Step 1: Substituir `HistoryPlaceholder` por `HistoryStack` em `AppNavigator.tsx`**

Abra `src/navigation/AppNavigator.tsx`. READ primeiro.

1. Adicione import:
```typescript
import { HistoryStack } from './HistoryStack';
```

2. Remova a linha `const HistoryPlaceholder = () => <ComingSoonScreen title="Histórico" />;`

3. Troque a `<Tab.Screen>` de `name="History"`:
```typescript
<Tab.Screen name="History" component={HistoryStack} options={{ title: 'Histórico' }} />
```

- [ ] **Step 2: Invalidar cache no `WorkoutSummaryScreen`**

Abra `src/screens/workout/WorkoutSummaryScreen.tsx`. READ primeiro.

1. Adicione import:
```typescript
import { useHistoryStore } from '@/store/useHistoryStore';
```

2. No componente, adicione:
```typescript
  const invalidateHistory = useHistoryStore(s => s.invalidate);
```

3. No `onFinish`, após o `await sessionRepository.insert(session, sets);` e antes de `reset();`, adicione:
```typescript
    invalidateHistory();
```

- [ ] **Step 3: Verify tsc → clean.**

- [ ] **Step 4: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/screens/workout/WorkoutSummaryScreen.tsx
git commit -m "feat: wire HistoryStack into AppNavigator and invalidate history cache after save"
```

---

## Task 13: Smoke test + rebuild

**Files:** nenhum (validação)

- [ ] **Step 1: Rodar suite de testes**

Run: `pnpm test`
Expected: todos os testes passam (generateId, mediaResolver, workoutRepository, useWorkoutDraftStore, sessionRepository com métodos novos, useActiveSessionStore).

- [ ] **Step 2: Rebuild Android (libs nativas novas: calendars, pager-view)**

```bash
cd android && ./gradlew clean && cd ..
pnpm start  # em outro terminal
export PATH=$PATH:$HOME/Android/Sdk/platform-tools
adb reverse tcp:8081 tcp:8081
pnpm android
```

- [ ] **Step 3: Smoke test no device — checklist**

- [ ] Tab "Histórico" mostra top tabs "Histórico" e "Estatísticas"
- [ ] Na tab "Histórico": calendário mensal em português (mês atual)
- [ ] Dias com treino têm ponto colorido
- [ ] Tocar num dia sem treino: mostra "Nenhum treino neste dia"
- [ ] Tocar num dia com treino: mostra lista de sessões (cores do treino)
- [ ] Tocar numa sessão: abre detalhe com nome, data, duração, notas (se houver), exercícios com séries
- [ ] Botão "Repetir treino": inicia execução do mesmo workout
- [ ] Navegar pra mês anterior/próximo no calendário: marcadores atualizam
- [ ] Na tab "Estatísticas": 3 cards (treinos este mês, frequência semanal, duração média)
- [ ] Se ainda não há sessões: mostra EmptyState "Nenhum treino ainda"
- [ ] Após completar um novo treino: cache do histórico invalidado, próxima abertura do Histórico recarrega

- [ ] **Step 4: Se algum bug, diagnose via `adb logcat -d | grep -iE 'reactnative|fatal|calendars' | tail -40`.**

---

## Notas para implementação

- **`react-native-calendars`** é uma lib JS-puro no core; pouca chance de problema com Fabric. Se faltar registrar algo: `cd android && ./gradlew clean && cd .. && pnpm android`.
- **`@react-navigation/material-top-tabs`** precisa de `react-native-pager-view` (lib nativa, já instalada no Task 5). Rebuild após instalar.
- **`LocaleConfig.locales['pt-br']`** — registra localização na primeira import. É feito ao topo do `HistoryCalendarScreen.tsx`; executa uma vez quando o módulo é carregado.
- **Cross-stack navigation** (Repetir treino de History → WorkoutExecution): funciona em runtime pq RN Navigation acha a screen pelo nome. TypeScript não flagra. Aceito.
- **Date format:** calendário usa `YYYY-MM-DD` (padrão ISO date). Helper `toIsoDay` aplica formato.
- **Mês changes no calendário:** `onMonthChange` recebe `{year, month}` (month 1-based); convertido para ym string.
- **`findDatesWithSessions`**: usa `date(.., 'localtime')` do SQLite — precisa do device estar com horário correto, senão os dias podem desalinhar. Aceito.
- **Sem testes de UI**: mantém escopo enxuto.
