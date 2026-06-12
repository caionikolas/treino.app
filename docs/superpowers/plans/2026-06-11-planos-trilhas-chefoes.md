# Aba Planos → Trilhas de Chefões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o sistema antigo de "planos" (sequência de treinos agendados) por **Trilhas de Chefões** de calistenia, onde cada chefão tem progressões lineares com 3 níveis de maestria que o usuário marca para evoluir.

**Architecture:** Conteúdo dos chefões é **curado em código** (constantes); o progresso do usuário (nível de maestria por progressão) persiste no SQLite. Uma camada de serviço puro compõe conteúdo + progresso e deriva bloqueios/progresso/marcos. UI nova (lista de chefões + tela de trilha com folha de marcação de nível) na aba Planos. O sistema antigo de planos é removido por completo, inclusive sua integração na Home e no resumo pós-treino.

**Tech Stack:** React Native 0.76, TypeScript, Zustand, op-sqlite (produção) / better-sqlite3 in-memory (testes), Jest, react-native-vector-icons (MaterialIcons).

**Spec:** `docs/superpowers/specs/2026-06-11-planos-trilhas-chefoes-design.md`

---

## File Structure

**Criar:**
- `src/types/boss.ts` — tipos de domínio (Boss, Progression, MasteryLevel, views derivadas)
- `src/constants/mastery.ts` — escala global de níveis (labels + alvos reps/isometria)
- `src/constants/bosses.ts` — conteúdo curado (chefão Pull-up) + helper `findBoss`
- `src/database/repositories/progressionProgressRepository.ts` — leitura/escrita do nível por progressão
- `src/services/bossProgressService.ts` — função pura que monta a "view" do chefão
- `src/store/useBossStore.ts` — store Zustand da aba
- `src/components/boss/MasteryPips.tsx` — 3 pips de nível
- `src/components/boss/ProgressionRow.tsx` — linha da timeline
- `src/components/boss/MasteryLevelSheet.tsx` — bottom sheet de marcação
- `src/components/boss/BossCard.tsx` — card da lista
- `src/screens/boss/BossListScreen.tsx` — landing da aba
- `src/screens/boss/BossDetailScreen.tsx` — trilha do chefão
- `src/navigation/BossStack.tsx` — stack da aba
- `__tests__/unit/progressionProgressRepository.test.ts`
- `__tests__/unit/bossProgressService.test.ts`
- `__tests__/unit/useBossStore.test.ts`

**Modificar:**
- `src/database/migrations.ts` — migration v6 (cria `progression_progress`) e v7 (dropa tabelas antigas de planos)
- `src/navigation/AppNavigator.tsx` — apontar a aba para `BossStack`
- `App.tsx` — remover bootstrap de lembretes de plano
- `src/screens/home/HomeScreen.tsx` — remover bloco de "plano ativo"
- `src/screens/workout/WorkoutSummaryScreen.tsx` — remover reconcile/sync de planos

**Deletar (sistema antigo de planos):**
- `src/screens/plan/PlanListScreen.tsx`, `PlanFormScreen.tsx`, `PlanDetailScreen.tsx`, `PlanWorkoutPickerScreen.tsx`
- `src/components/plan/PlanCard.tsx`, `PlanFormFields.tsx`, `FrequencyPickerModal.tsx`, `TimePickerModal.tsx`
- `src/store/usePlanStore.ts`
- `src/database/repositories/planRepository.ts`
- `src/services/planProgressService.ts`, `src/services/reminderService.ts`
- `src/utils/planSchedule.ts`
- `src/types/plan.ts`
- `src/navigation/PlanStack.tsx`
- `__tests__/unit/planRepository.test.ts`, `planProgressService.test.ts`, `planSchedule.test.ts`

---

## Task 1: Tipos de domínio

**Files:**
- Create: `src/types/boss.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

```typescript
export type ProgressionKind = 'reps' | 'isometric';

// 0 = não começou, 1 = Aprendido, 2 = Dominado, 3 = Masterizado
export type MasteryLevel = 0 | 1 | 2 | 3;

export interface Progression {
  id: string;
  bossId: string;
  orderIndex: number;
  name: string;
  kind: ProgressionKind;
}

export interface Boss {
  id: string;
  name: string;
  icon: string; // nome de ícone MaterialIcons
  color: string; // hex
  description: string | null;
  orderIndex: number;
  progressions: Progression[];
}

// Progressão + estado derivado do usuário
export interface ProgressionView extends Progression {
  masteryLevel: MasteryLevel;
  locked: boolean;
}

// Chefão + progresso composto
export interface BossView {
  boss: Boss;
  progressions: ProgressionView[];
  progressPoints: number; // soma dos níveis
  maxPoints: number; // nº de progressões * 3
  skillUnlocked: boolean; // última progressão >= Aprendido
  mastered: boolean; // última progressão == Masterizado
  focusName: string | null; // 1ª progressão desbloqueada e não masterizada
}
```

- [ ] **Step 2: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros novos; o projeto antigo ainda compila)

- [ ] **Step 3: Commit**

```bash
git add src/types/boss.ts
git commit -m "feat(boss): tipos de domínio das trilhas de chefões"
```

---

## Task 2: Escala de maestria e conteúdo curado

**Files:**
- Create: `src/constants/mastery.ts`
- Create: `src/constants/bosses.ts`

- [ ] **Step 1: Criar a escala de maestria**

`src/constants/mastery.ts`:

```typescript
import { MasteryLevel, ProgressionKind } from '@/types/boss';

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: 'Não começou',
  1: 'Aprendido',
  2: 'Dominado',
  3: 'Masterizado',
};

// Alvo textual por nível (1..3), conforme o tipo da progressão
export const MASTERY_TARGETS: Record<ProgressionKind, Record<1 | 2 | 3, string>> = {
  reps: { 1: '1 rep limpa', 2: '3 reps limpas', 3: '10 reps limpas' },
  isometric: { 1: '3 segundos', 2: '10 segundos', 3: '15 segundos' },
};
```

- [ ] **Step 2: Criar o conteúdo curado (chefão Pull-up)**

`src/constants/bosses.ts`:

```typescript
import { Boss } from '@/types/boss';

export const BOSSES: Boss[] = [
  {
    id: 'boss_pull_up',
    name: 'Pull-up',
    icon: 'fitness-center',
    color: '#3282B8',
    description: 'Domine a barra: da escápula ao pull-up completo.',
    orderIndex: 0,
    progressions: [
      { id: 'pull_up_scapula', bossId: 'boss_pull_up', orderIndex: 0, name: 'Progressão de escápula', kind: 'reps' },
      { id: 'pull_up_australian', bossId: 'boss_pull_up', orderIndex: 1, name: 'Australian Pull-up', kind: 'reps' },
      { id: 'pull_up_negative', bossId: 'boss_pull_up', orderIndex: 2, name: 'Negativa de Pull-up', kind: 'reps' },
      { id: 'pull_up_full', bossId: 'boss_pull_up', orderIndex: 3, name: 'Pull-up', kind: 'reps' },
    ],
  },
];

export function findBoss(id: string): Boss | undefined {
  return BOSSES.find(b => b.id === id);
}
```

- [ ] **Step 3: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/constants/mastery.ts src/constants/bosses.ts
git commit -m "feat(boss): escala de maestria e chefão Pull-up curado"
```

---

## Task 3: Serviço de composição (função pura) — TDD

**Files:**
- Create: `src/services/bossProgressService.ts`
- Test: `__tests__/unit/bossProgressService.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`__tests__/unit/bossProgressService.test.ts`:

```typescript
import { buildBossView } from '@/services/bossProgressService';
import { Boss } from '@/types/boss';

function makeBoss(): Boss {
  return {
    id: 'b', name: 'Pull-up', icon: 'fitness-center', color: '#3282B8',
    description: null, orderIndex: 0,
    progressions: [
      { id: 'p0', bossId: 'b', orderIndex: 0, name: 'Escápula', kind: 'reps' },
      { id: 'p1', bossId: 'b', orderIndex: 1, name: 'Australian', kind: 'reps' },
      { id: 'p2', bossId: 'b', orderIndex: 2, name: 'Negativa', kind: 'reps' },
      { id: 'p3', bossId: 'b', orderIndex: 3, name: 'Pull-up', kind: 'reps' },
    ],
  };
}

describe('buildBossView', () => {
  it('1ª progressão desbloqueada; demais bloqueadas sem progresso', () => {
    const v = buildBossView(makeBoss(), {});
    expect(v.progressions[0].locked).toBe(false);
    expect(v.progressions[1].locked).toBe(true);
    expect(v.progressions[3].locked).toBe(true);
    expect(v.progressPoints).toBe(0);
    expect(v.maxPoints).toBe(12);
    expect(v.skillUnlocked).toBe(false);
    expect(v.mastered).toBe(false);
    expect(v.focusName).toBe('Escápula');
  });

  it('Aprendido (1) na anterior desbloqueia a próxima', () => {
    const v = buildBossView(makeBoss(), { p0: 1 });
    expect(v.progressions[1].locked).toBe(false);
    expect(v.progressions[2].locked).toBe(true);
    expect(v.progressPoints).toBe(1);
  });

  it('focusName é a 1ª desbloqueada e não masterizada', () => {
    const v = buildBossView(makeBoss(), { p0: 3, p1: 1 });
    // p0 masterizada -> pula; p1 desbloqueada e nível 1 -> foco
    expect(v.focusName).toBe('Australian');
  });

  it('marco skillUnlocked quando a última >= 1', () => {
    const v = buildBossView(makeBoss(), { p0: 1, p1: 1, p2: 1, p3: 1 });
    expect(v.skillUnlocked).toBe(true);
    expect(v.mastered).toBe(false);
  });

  it('marco mastered quando a última == 3; focusName null', () => {
    const v = buildBossView(makeBoss(), { p0: 3, p1: 3, p2: 3, p3: 3 });
    expect(v.mastered).toBe(true);
    expect(v.progressPoints).toBe(12);
    expect(v.focusName).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx jest __tests__/unit/bossProgressService.test.ts -v`
Expected: FAIL com "Cannot find module '@/services/bossProgressService'"

- [ ] **Step 3: Implementar o serviço**

`src/services/bossProgressService.ts`:

```typescript
import { Boss, BossView, MasteryLevel, ProgressionView } from '@/types/boss';

export function buildBossView(
  boss: Boss,
  levels: Record<string, MasteryLevel>,
): BossView {
  const progressions: ProgressionView[] = boss.progressions
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(p => ({ ...p, masteryLevel: (levels[p.id] ?? 0) as MasteryLevel, locked: false }));

  for (let i = 0; i < progressions.length; i++) {
    progressions[i].locked = i === 0 ? false : progressions[i - 1].masteryLevel < 1;
  }

  const progressPoints = progressions.reduce((sum, p) => sum + p.masteryLevel, 0);
  const maxPoints = progressions.length * 3;
  const last = progressions[progressions.length - 1];
  const focus = progressions.find(p => !p.locked && p.masteryLevel < 3) ?? null;

  return {
    boss,
    progressions,
    progressPoints,
    maxPoints,
    skillUnlocked: !!last && last.masteryLevel >= 1,
    mastered: !!last && last.masteryLevel >= 3,
    focusName: focus ? focus.name : null,
  };
}

export function buildBossViews(
  bosses: Boss[],
  levels: Record<string, MasteryLevel>,
): BossView[] {
  return bosses
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(b => buildBossView(b, levels));
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx jest __tests__/unit/bossProgressService.test.ts -v`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/services/bossProgressService.ts __tests__/unit/bossProgressService.test.ts
git commit -m "feat(boss): serviço de composição de progresso do chefão"
```

---

## Task 4: Migration v6 (cria progression_progress)

**Files:**
- Modify: `src/database/migrations.ts:124-131` (após a migration v5, dentro do array `MIGRATIONS`)

- [ ] **Step 1: Adicionar a migration v6**

Em `src/database/migrations.ts`, dentro do array `MIGRATIONS`, logo após o objeto da `version: 5` (que termina em `},` na linha ~131) e antes do fechamento `]` do array, inserir:

```typescript
  {
    version: 6,
    up: [
      `CREATE TABLE IF NOT EXISTS progression_progress (
        progression_id TEXT PRIMARY KEY,
        mastery_level INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )`,
    ],
  },
```

- [ ] **Step 2: Verificar que tipa e que os testes existentes ainda passam**

Run: `npx jest __tests__/unit/planRepository.test.ts -v`
Expected: PASS (a migration v6 só adiciona tabela; nada antigo quebra ainda)

- [ ] **Step 3: Commit**

```bash
git add src/database/migrations.ts
git commit -m "feat(boss): migration v6 cria tabela progression_progress"
```

---

## Task 5: Repositório de progresso — TDD

**Files:**
- Create: `src/database/repositories/progressionProgressRepository.ts`
- Test: `__tests__/unit/progressionProgressRepository.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`__tests__/unit/progressionProgressRepository.test.ts`:

```typescript
import { runMigrations } from '@/database/migrations';
import { progressionProgressRepository } from '@/database/repositories/progressionProgressRepository';

jest.mock('@/database/connection', () => {
  const Database = require('better-sqlite3');
  let inst: any = null;
  return {
    getDb: () => {
      if (!inst) {
        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
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
          executeSync: (sql: string) => db.exec(sql),
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
  const { __resetDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
});

describe('progressionProgressRepository', () => {
  it('getAllLevels vazio quando nada salvo', async () => {
    const levels = await progressionProgressRepository.getAllLevels();
    expect(levels).toEqual({});
  });

  it('setLevel insere e getAllLevels devolve o nível', async () => {
    await progressionProgressRepository.setLevel('pull_up_scapula', 2);
    const levels = await progressionProgressRepository.getAllLevels();
    expect(levels.pull_up_scapula).toBe(2);
  });

  it('setLevel faz upsert (atualiza no conflito)', async () => {
    await progressionProgressRepository.setLevel('pull_up_scapula', 1);
    await progressionProgressRepository.setLevel('pull_up_scapula', 3);
    const levels = await progressionProgressRepository.getAllLevels();
    expect(levels.pull_up_scapula).toBe(3);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx jest __tests__/unit/progressionProgressRepository.test.ts -v`
Expected: FAIL com "Cannot find module '.../progressionProgressRepository'"

- [ ] **Step 3: Implementar o repositório**

`src/database/repositories/progressionProgressRepository.ts`:

```typescript
import { getDb } from '../connection';
import { MasteryLevel } from '@/types/boss';

interface Row {
  progression_id: string;
  mastery_level: number;
}

export const progressionProgressRepository = {
  async getAllLevels(): Promise<Record<string, MasteryLevel>> {
    const db = getDb();
    const result = await db.execute(
      'SELECT progression_id, mastery_level FROM progression_progress',
    );
    const out: Record<string, MasteryLevel> = {};
    for (const r of (result.rows ?? []) as unknown as Row[]) {
      out[r.progression_id] = r.mastery_level as MasteryLevel;
    }
    return out;
  },

  async setLevel(progressionId: string, level: MasteryLevel): Promise<void> {
    const db = getDb();
    await db.execute(
      `INSERT INTO progression_progress (progression_id, mastery_level, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(progression_id)
       DO UPDATE SET mastery_level = excluded.mastery_level, updated_at = excluded.updated_at`,
      [progressionId, level, Date.now()],
    );
  },
};
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx jest __tests__/unit/progressionProgressRepository.test.ts -v`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/database/repositories/progressionProgressRepository.ts __tests__/unit/progressionProgressRepository.test.ts
git commit -m "feat(boss): repositório de progresso por progressão"
```

---

## Task 6: Store da aba — TDD

**Files:**
- Create: `src/store/useBossStore.ts`
- Test: `__tests__/unit/useBossStore.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

`__tests__/unit/useBossStore.test.ts`:

```typescript
import { runMigrations } from '@/database/migrations';
import { useBossStore } from '@/store/useBossStore';

jest.mock('@/database/connection', () => {
  const Database = require('better-sqlite3');
  let inst: any = null;
  return {
    getDb: () => {
      if (!inst) {
        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        inst = {
          execute: async (sql: string, params?: any[]) => {
            const trimmed = sql.trim().toLowerCase();
            if (trimmed.startsWith('select')) {
              return { rows: db.prepare(sql).all(...(params ?? [])) };
            }
            db.prepare(sql).run(...(params ?? []));
            return { rows: [] };
          },
          executeSync: (sql: string) => db.exec(sql),
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
  const { __resetDb } = require('@/database/connection');
  __resetDb();
  await runMigrations();
  useBossStore.setState({ views: [], loaded: false });
});

describe('useBossStore', () => {
  it('load monta a view do chefão Pull-up com progresso zero', async () => {
    await useBossStore.getState().load();
    const views = useBossStore.getState().views;
    expect(views.length).toBe(1);
    expect(views[0].boss.id).toBe('boss_pull_up');
    expect(views[0].progressPoints).toBe(0);
    expect(views[0].progressions[0].locked).toBe(false);
  });

  it('setLevel persiste e recompõe a view', async () => {
    await useBossStore.getState().load();
    await useBossStore.getState().setLevel('pull_up_scapula', 1);
    const view = useBossStore.getState().getView('boss_pull_up');
    expect(view!.progressPoints).toBe(1);
    expect(view!.progressions[1].locked).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx jest __tests__/unit/useBossStore.test.ts -v`
Expected: FAIL com "Cannot find module '@/store/useBossStore'"

- [ ] **Step 3: Implementar a store**

`src/store/useBossStore.ts`:

```typescript
import { create } from 'zustand';
import { BossView, MasteryLevel } from '@/types/boss';
import { BOSSES } from '@/constants/bosses';
import { progressionProgressRepository } from '@/database/repositories/progressionProgressRepository';
import { buildBossViews } from '@/services/bossProgressService';

interface BossState {
  views: BossView[];
  loaded: boolean;
  load: () => Promise<void>;
  setLevel: (progressionId: string, level: MasteryLevel) => Promise<void>;
  getView: (bossId: string) => BossView | undefined;
}

export const useBossStore = create<BossState>((set, get) => ({
  views: [],
  loaded: false,

  load: async () => {
    const levels = await progressionProgressRepository.getAllLevels();
    set({ views: buildBossViews(BOSSES, levels), loaded: true });
  },

  setLevel: async (progressionId, level) => {
    await progressionProgressRepository.setLevel(progressionId, level);
    await get().load();
  },

  getView: bossId => get().views.find(v => v.boss.id === bossId),
}));
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx jest __tests__/unit/useBossStore.test.ts -v`
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/store/useBossStore.ts __tests__/unit/useBossStore.test.ts
git commit -m "feat(boss): store da aba de chefões"
```

---

## Task 7: Componente MasteryPips

**Files:**
- Create: `src/components/boss/MasteryPips.tsx`

- [ ] **Step 1: Implementar o componente**

`src/components/boss/MasteryPips.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MasteryLevel } from '@/types/boss';

interface Props {
  level: MasteryLevel;
  color: string;
}

export function MasteryPips({ level, color }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.pip,
            { borderColor: color },
            level >= i && { backgroundColor: color },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  pip: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
```

- [ ] **Step 2: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/MasteryPips.tsx
git commit -m "feat(boss): componente MasteryPips"
```

---

## Task 8: Componente ProgressionRow

**Files:**
- Create: `src/components/boss/ProgressionRow.tsx`

- [ ] **Step 1: Implementar o componente**

`src/components/boss/ProgressionRow.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProgressionView } from '@/types/boss';
import { MASTERY_LABELS } from '@/constants/mastery';
import { MasteryPips } from './MasteryPips';
import { colors } from '@/theme';

interface Props {
  progression: ProgressionView;
  color: string;
  isLast: boolean;
  onPress: () => void;
}

export function ProgressionRow({ progression, color, isLast, onPress }: Props) {
  const { locked, masteryLevel, name } = progression;
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      disabled={locked}
      style={({ pressed }) => [styles.row, pressed && !locked && { opacity: 0.85 }]}
    >
      <View style={styles.gutter}>
        {locked ? (
          <View style={styles.lockCircle}>
            <Icon name="lock" size={14} color={colors.textSecondary} />
          </View>
        ) : (
          <MasteryPips level={masteryLevel} color={color} />
        )}
        {!isLast ? (
          <View
            style={[styles.connector, { backgroundColor: locked ? colors.border : color }]}
          />
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, locked && styles.lockedText]} numberOfLines={1}>
          {isLast ? `${name} · o chefão` : name}
        </Text>
        <Text style={[styles.sub, locked && styles.lockedText]}>
          {locked ? 'bloqueado' : MASTERY_LABELS[masteryLevel]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', minHeight: 64 },
  gutter: { width: 40, alignItems: 'center' },
  lockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  body: { flex: 1, paddingBottom: 20, paddingLeft: 4 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  lockedText: { opacity: 0.5 },
});
```

- [ ] **Step 2: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/ProgressionRow.tsx
git commit -m "feat(boss): componente ProgressionRow (linha da timeline)"
```

---

## Task 9: Componente MasteryLevelSheet

**Files:**
- Create: `src/components/boss/MasteryLevelSheet.tsx`

- [ ] **Step 1: Implementar o componente**

`src/components/boss/MasteryLevelSheet.tsx`:

```tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MasteryLevel, ProgressionView } from '@/types/boss';
import { MASTERY_LABELS, MASTERY_TARGETS } from '@/constants/mastery';
import { colors, spacing } from '@/theme';

interface Props {
  progression: ProgressionView | null;
  color: string;
  onSelect: (level: MasteryLevel) => void;
  onClose: () => void;
}

const LEVELS: Array<1 | 2 | 3> = [1, 2, 3];

export function MasteryLevelSheet({ progression, color, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={progression !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {progression ? (
            <>
              <View style={styles.handle} />
              <Text style={styles.title}>{progression.name}</Text>
              {LEVELS.map(lvl => {
                const selected = progression.masteryLevel >= lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => onSelect(lvl)}
                    style={({ pressed }) => [styles.levelRow, pressed && { opacity: 0.7 }]}
                  >
                    <Icon
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={selected ? color : colors.textSecondary}
                    />
                    <Text style={styles.levelLabel}>{MASTERY_LABELS[lvl]}</Text>
                    <Text style={styles.levelTarget}>
                      {MASTERY_TARGETS[progression.kind][lvl]}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => onSelect(0)}
                style={({ pressed }) => [styles.resetRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.resetText}>Ainda não comecei</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  levelLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 },
  levelTarget: { color: colors.textSecondary, fontSize: 13 },
  resetRow: { paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  resetText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 2: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/MasteryLevelSheet.tsx
git commit -m "feat(boss): bottom sheet de marcação de nível"
```

---

## Task 10: Componente BossCard

**Files:**
- Create: `src/components/boss/BossCard.tsx`

- [ ] **Step 1: Implementar o componente**

`src/components/boss/BossCard.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BossView } from '@/types/boss';
import { colors, spacing } from '@/theme';

interface Props {
  view: BossView;
  onPress: () => void;
}

export function BossCard({ view, onPress }: Props) {
  const { boss, progressPoints, maxPoints, focusName, mastered, skillUnlocked } = view;
  const pct = maxPoints > 0 ? Math.round((progressPoints / maxPoints) * 100) : 0;
  const statusText = mastered
    ? 'Chefão dominado 🏆'
    : focusName
      ? `Foco: ${focusName}`
      : skillUnlocked
        ? 'Skill desbloqueada 🎉'
        : 'Comece a treinar';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: boss.color }]}>
          <Icon name={boss.icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.name} numberOfLines={1}>{boss.name}</Text>
        <Text style={styles.level}>nível {progressPoints}/{maxPoints}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: boss.color }]} />
      </View>
      <Text style={styles.status} numberOfLines={1}>{statusText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1, color: colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  level: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  status: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm },
});
```

- [ ] **Step 2: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/boss/BossCard.tsx
git commit -m "feat(boss): componente BossCard"
```

---

## Task 11: BossListScreen

**Files:**
- Create: `src/screens/boss/BossListScreen.tsx`

> Nota: o tipo `BossStackParamList` é criado na Task 13 (BossStack). Esta tela importa dele; portanto, após criar este arquivo, `tsc` só passará 100% depois da Task 13. O passo de verificação aqui usa `jest` (lógica) e adia o `tsc` completo para a Task 13.

- [ ] **Step 1: Implementar a tela**

`src/screens/boss/BossListScreen.tsx`:

```tsx
import React, { useCallback } from 'react';
import { FlatList, StyleSheet, SafeAreaView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBossStore } from '@/store/useBossStore';
import { BossCard } from '@/components/boss/BossCard';
import { BossStackParamList } from '@/navigation/BossStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<BossStackParamList, 'BossList'>;

export function BossListScreen({ navigation }: Props) {
  const views = useBossStore(s => s.views);
  const load = useBossStore(s => s.load);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Sua jornada</Text>
        <Text style={styles.title}>Chefões</Text>
      </View>
      <FlatList
        data={views}
        keyExtractor={item => item.boss.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum chefão disponível.</Text>}
        renderItem={({ item }) => (
          <BossCard
            view={item}
            onPress={() => navigation.navigate('BossDetail', { id: item.boss.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: 2 },
  eyebrow: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  title: { ...typography.heading, color: colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 64 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/boss/BossListScreen.tsx
git commit -m "feat(boss): tela de lista de chefões"
```

---

## Task 12: BossDetailScreen

**Files:**
- Create: `src/screens/boss/BossDetailScreen.tsx`

> Mesma nota da Task 11: o `tsc` completo só fecha na Task 13.

- [ ] **Step 1: Implementar a tela**

`src/screens/boss/BossDetailScreen.tsx`:

```tsx
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BossStackParamList } from '@/navigation/BossStack';
import { MasteryLevel, ProgressionView } from '@/types/boss';
import { useBossStore } from '@/store/useBossStore';
import { ProgressionRow } from '@/components/boss/ProgressionRow';
import { MasteryLevelSheet } from '@/components/boss/MasteryLevelSheet';
import { EmptyState } from '@/components/common';
import { colors, spacing, typography } from '@/theme';

type Nav = NativeStackNavigationProp<BossStackParamList, 'BossDetail'>;
type Rt = RouteProp<BossStackParamList, 'BossDetail'>;

export function BossDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { id } = route.params;

  const load = useBossStore(s => s.load);
  const setLevel = useBossStore(s => s.setLevel);
  const view = useBossStore(s => s.views.find(v => v.boss.id === id));

  const [sheetProg, setSheetProg] = useState<ProgressionView | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: view?.boss.name ?? 'Chefão' });
  }, [navigation, view]);

  if (!view) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Chefão não encontrado" />
      </SafeAreaView>
    );
  }

  const { boss, progressions, progressPoints, maxPoints } = view;
  const pct = maxPoints > 0 ? Math.round((progressPoints / maxPoints) * 100) : 0;

  const onSelect = async (level: MasteryLevel) => {
    if (!sheetProg) return;
    const before = useBossStore.getState().getView(id);
    await setLevel(sheetProg.id, level);
    const after = useBossStore.getState().getView(id);
    setSheetProg(null);
    if (before && after) {
      if (!before.mastered && after.mastered) {
        Alert.alert('🏆 Chefão dominado!', `Você masterizou o ${boss.name}!`);
      } else if (!before.skillUnlocked && after.skillUnlocked) {
        Alert.alert('🎉 Skill desbloqueada!', `Seu primeiro ${boss.name}!`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={[styles.headerName, { color: boss.color }]} numberOfLines={2}>
            {boss.name}
          </Text>
          <Text style={styles.headerMeta}>nível {progressPoints}/{maxPoints} · {pct}%</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: boss.color }]} />
          </View>
          {boss.description ? <Text style={styles.headerDesc}>{boss.description}</Text> : null}
        </View>

        <View style={styles.timeline}>
          {progressions.map((p, i) => (
            <ProgressionRow
              key={p.id}
              progression={p}
              color={boss.color}
              isLast={i === progressions.length - 1}
              onPress={() => setSheetProg(p)}
            />
          ))}
        </View>
      </ScrollView>

      <MasteryLevelSheet
        progression={sheetProg}
        color={boss.color}
        onSelect={onSelect}
        onClose={() => setSheetProg(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerName: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  headerMeta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  headerDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  timeline: { paddingLeft: spacing.xs },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/boss/BossDetailScreen.tsx
git commit -m "feat(boss): tela de trilha do chefão com marcação de nível"
```

---

## Task 13: BossStack + wiring no AppNavigator

**Files:**
- Create: `src/navigation/BossStack.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (linhas 8, 42, 94)

- [ ] **Step 1: Criar o BossStack**

`src/navigation/BossStack.tsx`:

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BossListScreen } from '@/screens/boss/BossListScreen';
import { BossDetailScreen } from '@/screens/boss/BossDetailScreen';
import { colors } from '@/theme';

export type BossStackParamList = {
  BossList: undefined;
  BossDetail: { id: string };
};

const Stack = createNativeStackNavigator<BossStackParamList>();

export function BossStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="BossList" component={BossListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BossDetail" component={BossDetailScreen} options={{ title: 'Chefão' }} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Atualizar o AppNavigator — trocar o import**

Em `src/navigation/AppNavigator.tsx` linha 8, substituir:

```tsx
import { PlanStack } from './PlanStack';
```

por:

```tsx
import { BossStack } from './BossStack';
```

- [ ] **Step 3: Atualizar o ícone da aba**

Em `src/navigation/AppNavigator.tsx` linha 42, substituir:

```tsx
  Plans: 'event-note',
```

por:

```tsx
  Plans: 'emoji-events',
```

- [ ] **Step 4: Atualizar a Tab.Screen**

Em `src/navigation/AppNavigator.tsx` linha 94, substituir:

```tsx
        <Tab.Screen name="Plans" component={PlanStack} options={{ title: 'Planos' }} />
```

por:

```tsx
        <Tab.Screen name="Plans" component={BossStack} options={{ title: 'Chefões' }} />
```

- [ ] **Step 5: Verificar que tipa (agora completo, BossList/BossDetail já têm o stack)**

Run: `npx tsc --noEmit`
Expected: PASS (o app antigo de planos ainda existe e compila; só a aba foi trocada)

- [ ] **Step 6: Commit**

```bash
git add src/navigation/BossStack.tsx src/navigation/AppNavigator.tsx
git commit -m "feat(boss): stack da aba e wiring no AppNavigator"
```

---

## Task 14: Migration v7 — dropar tabelas antigas de planos

**Files:**
- Modify: `src/database/migrations.ts` (adicionar v7 no array `MIGRATIONS`)

> Esta migration vem junto com a remoção do código antigo (Task 15). Como os testes do sistema antigo de planos serão deletados na Task 15, rode os passos 1–2 desta task imediatamente antes de deletar (ou execute Task 15 logo após sem rodar a suíte completa entre elas). Sequência segura: aplicar este patch e a deleção da Task 15, depois rodar a suíte inteira na Task 16.

- [ ] **Step 1: Adicionar a migration v7**

Em `src/database/migrations.ts`, no array `MIGRATIONS`, após o objeto `version: 6`, inserir:

```typescript
  {
    version: 7,
    up: [
      `DROP TABLE IF EXISTS plan_workouts`,
      `DROP TABLE IF EXISTS plans`,
    ],
  },
```

- [ ] **Step 2: Commit (será verificado em conjunto na Task 16)**

```bash
git add src/database/migrations.ts
git commit -m "feat(boss): migration v7 remove tabelas antigas de planos"
```

---

## Task 15: Remover o sistema antigo de planos

**Files:**
- Delete: telas, componentes, store, repo, services, utils, types e testes de plano (lista abaixo)
- Modify: `App.tsx`, `src/screens/home/HomeScreen.tsx`, `src/screens/workout/WorkoutSummaryScreen.tsx`

- [ ] **Step 1: Deletar os arquivos do sistema antigo**

```bash
git rm \
  src/screens/plan/PlanListScreen.tsx \
  src/screens/plan/PlanFormScreen.tsx \
  src/screens/plan/PlanDetailScreen.tsx \
  src/screens/plan/PlanWorkoutPickerScreen.tsx \
  src/components/plan/PlanCard.tsx \
  src/components/plan/PlanFormFields.tsx \
  src/components/plan/FrequencyPickerModal.tsx \
  src/components/plan/TimePickerModal.tsx \
  src/store/usePlanStore.ts \
  src/database/repositories/planRepository.ts \
  src/services/planProgressService.ts \
  src/services/reminderService.ts \
  src/utils/planSchedule.ts \
  src/types/plan.ts \
  src/navigation/PlanStack.tsx \
  __tests__/unit/planRepository.test.ts \
  __tests__/unit/planProgressService.test.ts \
  __tests__/unit/planSchedule.test.ts
```

- [ ] **Step 2: Limpar o bootstrap em App.tsx**

Em `App.tsx`, remover a linha 12:

```tsx
import { setupPlanReminderChannel, syncAllReminders } from '@/services/reminderService';
```

E remover as duas linhas de chamada (28–29) dentro do `useEffect`:

```tsx
        await setupPlanReminderChannel();
        await syncAllReminders();
```

(Mantém `setupNotificationChannel()` na linha 27.)

- [ ] **Step 3: Limpar o WorkoutSummaryScreen**

Em `src/screens/workout/WorkoutSummaryScreen.tsx`, remover os imports (linhas 9–10):

```tsx
import { reconcileAllActivePlans } from '@/services/planProgressService';
import { syncAllReminders } from '@/services/reminderService';
```

E remover as duas chamadas dentro de `onFinish` (linhas 43–44):

```tsx
    await reconcileAllActivePlans(session.workoutId);
    await syncAllReminders();
```

- [ ] **Step 4: Reescrever o HomeScreen sem a integração de planos**

Substituir TODO o conteúdo de `src/screens/home/HomeScreen.tsx` por:

```tsx
import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { colors, spacing } from '@/theme';
import { HomeStackParamList } from '@/navigation/HomeStack';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const WEEKDAY_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function getMondayBasedWeek(today: Date): Date[] {
  const day = today.getDay();
  const offsetToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offsetToMon);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const username = useSettingsStore(s => s.username);
  const loadSettings = useSettingsStore(s => s.load);
  const summaries = useWorkoutStore(s => s.summaries);
  const loadWorkouts = useWorkoutStore(s => s.load);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadWorkouts();
    }, [loadSettings, loadWorkouts]),
  );

  const week = useMemo(() => getMondayBasedWeek(new Date()), []);
  const todayKey = new Date().toDateString();

  const recentWorkouts = useMemo(
    () => [...summaries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [summaries],
  );

  const greetName = username.trim() || 'atleta';

  const goWorkout = (workoutId: string) => {
    (navigation.getParent() as any)?.navigate('Workouts', {
      screen: 'WorkoutPreview',
      params: { id: workoutId },
      initial: false,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingHi}>Olá, </Text>
            <Text style={styles.greetingName}>{greetName}</Text>
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [styles.gearBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Icon name="settings" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {week.map(d => {
            const isToday = d.toDateString() === todayKey;
            return (
              <View key={d.toISOString()} style={[styles.dayCol, isToday && styles.dayColActive]}>
                <Text style={[styles.dayNum, isToday && styles.dayNumActive]}>{d.getDate()}</Text>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                  {WEEKDAY_ABBR[d.getDay()]}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Treinos recentes</Text>
        {recentWorkouts.length === 0 ? (
          <Text style={styles.empty}>Nenhum treino criado ainda.</Text>
        ) : (
          recentWorkouts.map(w => (
            <Pressable
              key={w.id}
              onPress={() => goWorkout(w.id)}
              style={({ pressed }) => [styles.recentCard, pressed && { opacity: 0.9 }]}
            >
              <View style={[styles.recentIconCircle, { backgroundColor: w.color }]}>
                <Icon name="fitness-center" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentLabel}>Treino</Text>
                <Text style={styles.recentName} numberOfLines={1}>{w.name}</Text>
              </View>
              <Text style={styles.recentMeta} numberOfLines={1}>
                {w.exerciseCount} {w.exerciseCount === 1 ? 'exercício' : 'exercícios'}
              </Text>
              <Icon name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  greeting: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  greetingHi: { color: colors.textPrimary },
  greetingName: { color: colors.textSecondary, fontWeight: '700' },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2, borderRadius: 16 },
  dayColActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayNum: { color: colors.textSecondary, fontSize: 18, fontWeight: '700' },
  dayNumActive: { color: colors.textPrimary },
  dayLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  dayLabelActive: { color: colors.textSecondary },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  recentCard: {
    backgroundColor: '#1F1F36',
    borderRadius: 28,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  recentIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  recentLabel: { color: '#FFFFFF', opacity: 0.55, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  recentName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  recentMeta: { color: '#FFFFFF', opacity: 0.65, fontSize: 11, fontWeight: '600', marginRight: 6 },
  empty: { color: colors.textSecondary, fontStyle: 'italic' },
});
```

- [ ] **Step 5: Verificar que nada mais referencia o sistema antigo**

Run: `grep -rn "usePlanStore\|planRepository\|planProgressService\|reminderService\|@/types/plan\|planSchedule\|PlanStack" src App.tsx`
Expected: nenhum resultado

- [ ] **Step 6: Verificar que tipa**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(boss): remover sistema antigo de planos e sua integração"
```

---

## Task 16: Verificação final

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npx jest`
Expected: PASS (todos os testes; os 3 testes antigos de plano foram removidos, 3 novos suites de boss passam)

- [ ] **Step 2: Type check completo**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Lint**

Run: `npx eslint . `
Expected: sem erros novos introduzidos pelas mudanças

- [ ] **Step 4: Commit final (se o lint exigir ajustes)**

```bash
git add -A
git commit -m "chore(boss): ajustes finais de lint/tipos"
```

---

## Self-Review (cobertura do spec)

- Modelo de domínio (Boss/Progression/MasteryLevel) → Task 1.
- Escala global de níveis (reps/isometria) → Task 2.
- Conteúdo curado Pull-up (escápula → australian → negativa → pull-up) → Task 2.
- Desbloqueio em paralelo (Aprendido destrava próxima) → Task 3 (lógica) + testes.
- Progresso do chefão (soma/maxPoints) + dois marcos (skillUnlocked/mastered) → Task 3 + Task 12 (celebração).
- Conteúdo em código + progresso no SQLite → Tasks 2, 4, 5.
- Migração (cria progression_progress; dropa planos) → Tasks 4, 14.
- Tela 1 (lista de chefões, sem "novo") → Tasks 10, 11.
- Tela 2 (timeline com pips) + folha de marcação → Tasks 7, 8, 9, 12.
- Remoção limpa do sistema antigo + Home/WorkoutSummary → Task 15.
- Fora de escopo (treinos por progressão, outros chefões, edição in-app) → não implementado, conforme spec.
