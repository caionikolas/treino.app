# Execução do Treino + Favoritar (Fase 4) — Design

**Data:** 2026-04-19
**Escopo:** Tela de execução do treino (timer, log de séries, navegação entre exercícios, resumo pós-treino) + toggle de favoritar treinos com ordenação.
**Referência:** `CLAUDE.md` (seção "Execução do Treino") + `docs/superpowers/specs/2026-04-18-crud-treinos-design.md` (Fase 3 — CRUD de treinos).

## Objetivo

Permitir que o usuário execute um treino criado na Fase 3: mostra exercício atual, registra carga/reps por série, dispara timer de descanso com vibração/som/notificação, navega entre exercícios, e salva a sessão completa (ou parcial) em `workout_sessions` + `session_sets`. Também adiciona favoritar treinos com ordenação.

## Fora de escopo

- Tela de histórico e gráficos (Fase 5)
- Player de música (Fase 6)
- Fix de reprodução de vídeo (plano dedicado `2026-04-17-fix-video-playback.md`)
- Persistência intermediária da sessão ativa (se o app morrer no meio, perde state)

## Decisões (confirmadas com o usuário)

| Tópico | Decisão |
|---|---|
| Entry point da execução | Tap no card → `WorkoutPreviewScreen` (intermediária) com botões "Iniciar" / "Editar" |
| Mídia do exercício durante execução | Placeholder estático (icon `fitness-center`) — mesmo da tela de detalhe |
| Alerta fim do descanso | Vibração + som + notificação do sistema (via `@notifee/react-native`) |
| Input de série | Inline, carga e reps pré-preenchidos com última série registrada; fallback: target do treino (reps) e 0 (carga) |
| Navegação exercícios | Auto-advance ao completar + botões "◀ Anterior / Próximo ▶" |
| Sair durante execução | Menu com 3 opções: Continuar / Finalizar agora (salva parcial) / Descartar treino |
| Resumo final | Minimalista: duração total + séries completadas + campo de notas + botão Concluir |
| Exercícios de calistenia | Campo "Carga extra (kg)" sempre visível, opcional (pode ficar vazio → NULL no DB) |
| Favoritar | Star icon no `WorkoutCard`, toggle simples; favoritos aparecem primeiro na lista |

## Arquitetura

```
WorkoutStack (expandida — 3 telas novas)
├── WorkoutListScreen           [existe — ganha sort por favorito, WorkoutCard ganha ★]
├── WorkoutPreviewScreen        [NOVO]
├── WorkoutExecutionScreen      [NOVO]
├── WorkoutSummaryScreen        [NOVO]
├── WorkoutFormScreen           [sem mudança]
├── ExercisePickerScreen        [sem mudança]
└── ExerciseInWorkoutScreen     [sem mudança]

Stores:
├── useWorkoutStore             [ganha toggleFavorite]
└── useActiveSessionStore       [NOVO — sessão ativa em memória]

Repositories:
├── workoutRepository           [ganha toggleFavorite + sort]
└── sessionRepository           [NOVO — insert + findRecent]

Libs novas:
├── @notifee/react-native       [notificação + som + vibração]
└── @sayem314/react-native-keep-awake  [tela acesa durante treino]

Hooks novos:
├── useKeepAwake                [wrapper sobre lib]
└── useIntervalTimer            [setInterval com base Date.now() pra evitar drift]
```

## Migration v2

```sql
ALTER TABLE workouts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
```

Aplicada pelo sistema de migrations existente (`src/database/migrations.ts`). Todos os treinos existentes ficam com `is_favorite = 0`.

## Tipos

```typescript
// src/types/workout.ts — additions
export interface WorkoutSummary {
  id: string;
  name: string;
  color: string;
  exerciseCount: number;
  updatedAt: number;
  isFavorite: boolean;   // NEW
}

// src/types/session.ts — NEW
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
  setNumber: number;     // 1-based
  reps: number;
  weightKg: number | null;
  completed: number;     // 1 = completed, 0 = skipped
  notes: string | null;
}

// In-memory types used during execution
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
  completed: boolean;   // sempre true nesta fase; skip gera 0 sets do exercício
  loggedAt: number;
}
```

## Fluxo de dados

### Start
1. `WorkoutListScreen` → tap no card → `navigation.navigate('WorkoutPreview', { id })`
2. `WorkoutPreviewScreen` chama `workoutRepository.findById(id)` e mostra preview (nome, cor, lista resumida dos exercícios)
3. Tap "Iniciar" → `activeSessionStore.start(workout, exercises, exerciseLookup)` inicializa state em memória + navega pra `WorkoutExecutionScreen`

### Execução — loop principal
1. Montou → `useKeepAwake()` ativa, `useIntervalTimer` começa
2. Mostra exercício atual (`activeExercises[currentExerciseIndex]`) e série atual (`currentSetNumber` de `targetSets`)
3. Pré-preenche carga/reps:
   - Última série do mesmo exercício nesta sessão → usa esses valores
   - Senão → `weightKg = 0` (usuário ajusta), `reps = target` (ex: "12" → 12)
4. Usuário ajusta + toca "Concluir série":
   - Valida reps > 0
   - `activeSessionStore.logSet({ reps, weightKg })`
   - Se era a última série do exercício: incrementa `currentExerciseIndex`, reseta `currentSetNumber = 1`
   - Senão: incrementa `currentSetNumber`
   - Inicia `restTimer` com `restSeconds` do exercício atual (anterior, pois já avançou)
5. `restTimer` decrementa a cada segundo. Botões -30s / Pular / +30s ajustam.
6. Ao zerar: dispara `Vibration.vibrate(300)` + `notifee.displayNotification(...)` (com som embutido). Rest timer some. Usuário continua próxima série.
7. Fim de todos exercícios: navega pra `WorkoutSummaryScreen` automaticamente.

### Navegação manual
- Botão "◀ Anterior": decrementa `currentExerciseIndex`, recalcula `currentSetNumber = (séries já logadas desse exercício) + 1`, limpa rest timer
- Botão "Próximo ▶": incrementa `currentExerciseIndex`, `currentSetNumber = (séries já logadas do próximo) + 1` (começa em 1 se novo), limpa rest timer
- Botão "Pular exercício": mesma lógica de Próximo. Exercício pulado simplesmente fica sem sets logados (0 entradas em `loggedSets` pra esse `exerciseId`)
- Voltar a um exercício já iniciado e logar mais séries: funciona, só continua do próximo set number

### Sair durante execução (menu)
Usuário toca "X" no header → `Alert.alert` com 3 botões:
- "Continuar" — fecha o menu
- "Finalizar agora" — navega pra `WorkoutSummaryScreen` com o state atual
- "Descartar treino" — `activeSessionStore.reset()` + `navigation.popToTop()` (volta pra lista)

### Fim — Summary screen
1. `WorkoutSummaryScreen` mostra:
   - Duração total (do `sessionStartedAt` até agora)
   - Séries completadas: `N de M` (sum de `targetSets` vs `loggedSets.length`)
   - Campo `Input` multiline para notas
   - Botão "Concluir treino"
2. Ao tocar "Concluir":
   - `sessionRepository.insert(session, loggedSets)` — transação
   - `activeSessionStore.reset()`
   - `navigation.popToTop()` pra `WorkoutListScreen`

## Estrutura de pastas adicionada

```
src/
├── components/
│   ├── session/
│   │   ├── RestTimer.tsx
│   │   ├── WorkoutTimer.tsx
│   │   ├── SetLogRow.tsx
│   │   └── ExerciseProgress.tsx
│   └── workout/
│       └── FavoriteButton.tsx           [novo]
├── screens/
│   └── workout/
│       ├── WorkoutPreviewScreen.tsx
│       ├── WorkoutExecutionScreen.tsx
│       └── WorkoutSummaryScreen.tsx
├── store/
│   └── useActiveSessionStore.ts
├── hooks/
│   ├── useKeepAwake.ts
│   └── useIntervalTimer.ts
├── database/
│   ├── migrations.ts                    [atualiza com migration v2]
│   └── repositories/
│       └── sessionRepository.ts
└── types/
    └── session.ts
```

## Stores

### `useActiveSessionStore`

```typescript
interface ActiveSessionState {
  sessionId: string | null;
  workoutId: string | null;
  startedAt: number | null;               // timestamp (Date.now()) ao iniciar
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetNumber: number;               // 1-based
  loggedSets: LoggedSet[];
  restEndsAt: number | null;              // timestamp quando rest acaba (null = sem rest ativo)

  start: (
    workoutId: string,
    exercises: Array<{ exerciseId: string; exerciseName: string; muscleGroup: MuscleGroupKey; sets: number; reps: string; restSeconds: number }>,
  ) => void;

  logSet: (reps: number, weightKg: number | null) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  skipExercise: () => void;

  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;

  setNotes: (notes: string) => void;      // usado só no summary screen

  finalize: () => { session: WorkoutSession; sets: SessionSet[] };
  reset: () => void;

  // Derived
  currentExercise: () => ActiveExercise | null;
  currentExerciseSets: () => LoggedSet[];
  lastSetForExercise: (exerciseId: string) => LoggedSet | undefined;
  isLastSetOfLastExercise: () => boolean;
}
```

### `useWorkoutStore` — adição

```typescript
toggleFavorite: (id: string) => Promise<void>;
```

Chama `workoutRepository.toggleFavorite(id)` e recarrega `summaries`.

## Repositories

### `workoutRepository` — adições

```typescript
async toggleFavorite(id: string): Promise<void> {
  const db = getDb();
  // Toggle em uma única query: flipa o bit
  await db.execute(
    `UPDATE workouts SET is_favorite = CASE is_favorite WHEN 0 THEN 1 ELSE 0 END,
     updated_at = ? WHERE id = ?`,
    [Date.now(), id],
  );
}
```

`findAllSummaries` atualiza o `ORDER BY` para `is_favorite DESC, updated_at DESC`. `SELECT` inclui `is_favorite` na projeção. Linha vira `WorkoutSummary` com `isFavorite: row.is_favorite === 1`.

### `sessionRepository` (novo)

```typescript
export const sessionRepository = {
  async insert(session: WorkoutSession, sets: SessionSet[]): Promise<void> {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.execute(
        `INSERT INTO workout_sessions (id, workout_id, started_at, finished_at, duration_seconds, notes)
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
          `INSERT INTO session_sets (id, session_id, exercise_id, set_number, reps, weight_kg, completed, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.sessionId, s.exerciseId, s.setNumber, s.reps, s.weightKg, s.completed, s.notes],
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
    return (result.rows ?? []).map(/* row→WorkoutSession */);
  },
};
```

## Componentes

### `RestTimer`
Props: `{ secondsRemaining: number; onAdjust: (delta: number) => void; onSkip: () => void }`
Layout: número grande centralizado "MM:SS" + botões -30s / Pular / +30s.

### `WorkoutTimer`
Props: `{ startedAt: number }`
Renderiza "MM:SS" crescente desde `startedAt` usando `useIntervalTimer`.

### `SetLogRow`
Props: `{ weight: string; reps: string; onWeightChange; onRepsChange; onConfirm; disabled?: boolean }`
Dois inputs numéricos + botão grande "Concluir série". Botão desabilitado enquanto `reps` estiver vazio ou 0.

### `ExerciseProgress`
Props: `{ currentSet: number; totalSets: number; exerciseName: string }`
Mostra: "Supino Reto com Halteres" + "Série 2 de 4".

### `FavoriteButton`
Props: `{ isFavorite: boolean; onToggle: () => void }`
Ícone ★/☆ 32dp tocável. Cor accent quando favorito, textSecondary quando não.

## Hooks

### `useKeepAwake`
```typescript
import { activateKeepAwakeAsync, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';
import { useEffect } from 'react';

export function useKeepAwake(tag = 'treino-app') {
  useEffect(() => {
    activateKeepAwakeAsync(tag);
    return () => deactivateKeepAwake(tag);
  }, [tag]);
}
```

Se a lib falhar com Fabric (como vídeo), vira known issue secundária; usuário precisa manter interação ou usar timeout longo. Fix por lib alternativa depois.

### `useIntervalTimer`
```typescript
export function useIntervalTimer(tickMs: number, onTick: (now: number) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handle = setInterval(() => onTick(Date.now()), tickMs);
    return () => clearInterval(handle);
  }, [enabled, tickMs, onTick]);
}
```

## Notifee — configuração

Inicialização única em `App.tsx` bootstrap:
```typescript
await notifee.createChannel({
  id: 'rest-timer',
  name: 'Fim do descanso',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});
```

Ao fim do descanso:
```typescript
await notifee.displayNotification({
  title: 'Descanso acabou',
  body: `${currentExercise.exerciseName} — Série ${currentSetNumber}`,
  android: {
    channelId: 'rest-timer',
    pressAction: { id: 'default' },
    ongoing: false,
    autoCancel: true,
  },
});
```

Notificação some automaticamente se usuário abrir o app. Som + vibração disparam independente de estar em foreground.

## AndroidManifest — permissões adicionais

Já temos WAKE_LOCK e VIBRATE. Notifee pode exigir também:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

(Android 13+). Pedir permissão via `notifee.requestPermission()` no primeiro start de execução.

## Erros e bordas

- **Reps = 0 / vazio:** "Concluir série" desabilitado.
- **Carga vazia:** salva como NULL (calistenia OK).
- **App morre durante execução:** state em memória perdido. Aceito como compromisso.
- **Mudou de tela para background durante descanso:** timer continua via `Date.now()` baseline; notificação dispara de qualquer forma.
- **Back do Android durante execução:** intercepta e abre o menu de 3 opções.
- **Usuário não concede permissão de notificação:** timer ainda funciona visualmente + vibração (fallback). Notificação simplesmente não aparece.
- **Keep-awake falha:** tela pode apagar; fallback é manter interação (ou corrigir depois).
- **Sessão com 0 séries completadas:** permitido. Insert com `duration_seconds` real e `sets = []`.
- **Carga negativa ou NaN:** parseada como 0 (válido) ou NULL.
- **Treino favorito é apagado:** cascade já limpa tudo; favorito some da lista.

## Testes

Unitários (Jest):

- **`workoutRepository.toggleFavorite`** — flipa valor, atualiza `updated_at`, altera sort.
- **`workoutRepository.findAllSummaries`** — com 2 workouts, um favorito e um não, retorna favorito primeiro.
- **`sessionRepository.insert`** — round-trip com session + sets, transação.
- **`useActiveSessionStore`**:
  - `start()` inicializa state correto
  - `logSet()` adiciona set com número correto, avança série/exercício
  - `nextExercise()` / `previousExercise()` / `skipExercise()` ajustam index corretamente
  - `adjustRest(+30)` muda `restEndsAt`
  - `finalize()` retorna session + sets bem formados
- **Migration v2**: aplicação incremental funciona (migration 1 → 2 sem reset), novos workouts vêm com `is_favorite = 0`.

Testes de UI: fora de escopo.

## Entregáveis ao fim da fase

1. Migration v2 aplicada em runtime
2. Favoritar treinos funcional: toggle + sort na lista
3. `WorkoutPreviewScreen` com preview do treino + botões Iniciar/Editar
4. `WorkoutExecutionScreen`:
   - Cronômetro geral no topo
   - Exercício atual + série atual
   - Inputs pré-preenchidos
   - "Concluir série" → rest timer
   - Rest timer com -30/Pular/+30
   - Vibração + som + notificação ao fim do descanso
   - Botões Anterior / Próximo / Pular
   - Menu "X" com 3 opções
   - Keep-awake ativo
5. `WorkoutSummaryScreen` com duração + séries + notas + Concluir
6. Persistência em `workout_sessions` + `session_sets`
7. Testes unitários cobrindo repository, store, migration

## Próximas fases

- Fase 5: Histórico + gráficos de evolução (usa `workout_sessions` + `session_sets` desta fase)
- Fase 6: Player de música (mini-player pode ser sobreposto à tela de execução em iteração futura)
- Fase 7: APK assinado de release
