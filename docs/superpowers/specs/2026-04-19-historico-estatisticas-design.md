# Histórico + Estatísticas (Fase 5) — Design

**Data:** 2026-04-19
**Escopo:** Tab "Histórico" com calendário de sessões, detalhe da sessão (com botão "Repetir treino"), e tela de estatísticas gerais básicas.
**Referência:** `CLAUDE.md` seção "Histórico e Evolução" (subset — sem gráficos de evolução nem PRs nesta fase).

## Objetivo

Transformar o tab "Histórico" (hoje placeholder) em funcionalidade real: usuário vê no calendário quais dias treinou, toca num dia pra listar sessões, toca numa sessão pra ver o detalhe, e consegue repetir um treino a partir daí. Uma aba de estatísticas separada mostra 3 métricas básicas.

## Fora de escopo (explicitamente recusado pelo usuário)

- Gráficos de evolução por exercício
- Recordes pessoais (PRs)
- Estatísticas avançadas (volume acumulado, exercício mais frequente, etc.)
- Filtro de período na tela de estatísticas

## Decisões

| Tópico | Decisão |
|---|---|
| Layout da lista de histórico | Calendário mensal com `react-native-calendars`; dias com sessão marcados; tap num dia mostra sessões daquele dia |
| Detalhe da sessão | Minimalista: nome do treino, data, duração, notas, exercícios com séries. Mais um botão "Repetir treino". |
| Posição de estatísticas | Tela separada, navegada via top tabs (Histórico / Estatísticas) |
| Estatísticas mostradas | Treinos este mês, frequência semanal média, duração média. Sem filtro de período. |

## Arquitetura

```
HistoryStack (substitui ComingSoonScreen na tab Histórico)
├── HistoryTabsScreen         [NOVO] — container com top tabs Histórico / Estatísticas
│   ├── HistoryCalendarScreen [NOVO] — calendário + lista do dia selecionado
│   └── StatsScreen           [NOVO] — 3 cards de estatísticas
├── SessionDetailScreen       [NOVO] — detalhe + "Repetir treino"
├── WorkoutExecutionScreen    [existe, reusada via re-registro no stack]
└── WorkoutSummaryScreen      [existe, reusada via re-registro no stack]

Store:
└── useHistoryStore           [NOVO] — cache de sessões por mês + stats

Repository:
└── sessionRepository         [expandir com findByDateRange, findById, findDatesWithSessions, getStats]

Libs novas:
└── react-native-calendars

Hooks novos: nenhum (reuso das abstrações existentes).
```

## Decisão de navegação — integração com a execução

A tela de execução (`WorkoutExecutionScreen`) vive hoje no `WorkoutStack`. Como o botão "Repetir treino" no detalhe da sessão precisa navegar pra execução, temos duas opções:

1. **Re-registrar** `WorkoutExecutionScreen` e `WorkoutSummaryScreen` no `HistoryStack` (importar componentes existentes, registrar como `<Stack.Screen>`). Solução local, sem reestruturação.
2. Mover execução pra um stack modal global acessível de qualquer tab.

**Decisão:** opção 1. Sem reestruturação. As screens de execução são registradas também no HistoryStack. Elas compartilham o mesmo store (`useActiveSessionStore`), então não há duplicação de state.

`HistoryStackParamList` inclui: `HistoryTabs`, `SessionDetail`, `WorkoutExecution`, `WorkoutSummary`.

## Modelo de dados

**Sem migrations novas.** Usa tabelas `workout_sessions` e `session_sets` (já preenchidas pelas execuções da Fase 4). Também consulta `workouts` (nome + cor) e `exercises` (nome + grupo muscular) para enriquecer a exibição.

## Tipos

```typescript
// src/types/history.ts — NOVO
import { WorkoutSession, SessionSet } from '@/types/session';

export interface StatsData {
  sessionsThisMonth: number;
  avgSessionsPerWeek: number;
  avgDurationSeconds: number;
  totalSessions: number;  // usado para decidir empty state
}

export interface SessionWithMeta {
  session: WorkoutSession;
  workoutName: string;
  workoutColor: string;
}

export interface SessionDetail {
  session: WorkoutSession;
  workoutName: string;
  workoutColor: string;
  setsByExercise: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    sets: SessionSet[];
  }>;
}
```

## Fluxo de dados

### Abrir tab Histórico
1. Navega para `HistoryTabsScreen` com top-tabs "Histórico" / "Estatísticas". Começa em "Histórico".
2. `HistoryCalendarScreen` monta: `historyStore.loadMonth(currentYearMonth)` carrega sessões do mês atual.
3. Calendário renderiza marcadores nos dias que têm sessões (vindo de `datesWithSessions[yearMonth]`).
4. Usuário toca num dia → filtra lista de sessões do mês pelos com `started_at` nesse dia. Lista mostra cards com hora, nome do treino, duração, cor do treino.
5. Trocar de mês (swipe/botão do calendário) → `loadMonth(newYearMonth)` busca sessões desse mês.

### Abrir sessão (detalhe)
1. Tap num card de sessão → navega para `SessionDetailScreen({ id })`.
2. Screen chama `sessionRepository.findById(id)` que retorna session + sets + workout meta.
3. Monta `SessionDetail` agrupando sets por exercício (ordenados por `set_number`).
4. Renderiza: header colorido (nome + data formatada + duração), notas (se existem), lista de exercícios com "Supino Reto: 12@80kg, 10@82kg, ...", botão "Repetir treino".

### Repetir treino
1. Tap "Repetir treino" → verifica se o workout original ainda existe (via `workoutRepository.findById(session.workoutId)`).
2. Se não existe: `Alert.alert('Treino original não existe mais')` e fica na tela.
3. Se existe: chama `activeSessionStore.start(workout, enrichedExercises)` (mesmo padrão do Preview) e navega para `WorkoutExecution`.

### Estatísticas
1. Trocar pra top-tab "Estatísticas" → `StatsScreen` monta e chama `historyStore.loadStats()`.
2. `getStats()` faz queries:
   - `sessionsThisMonth`: `SELECT COUNT(*) FROM workout_sessions WHERE started_at >= ?` (início do mês)
   - `avgSessionsPerWeek`: `total_sessions / weeks_since_first_session`. Se 0 sessões, retorna 0. Semanas com ceiling para evitar fração < 1 dia.
   - `avgDurationSeconds`: `SELECT AVG(duration_seconds) FROM workout_sessions WHERE finished_at IS NOT NULL`
   - `totalSessions`: count total pra decidir empty state
3. Renderiza 3 cards grandes. Se `totalSessions === 0`: empty state "Nenhum treino ainda".

## Repository — expansões em `sessionRepository`

```typescript
async findByDateRange(startMs: number, endMs: number): Promise<WorkoutSession[]> {
  const result = await db.execute(
    'SELECT * FROM workout_sessions WHERE started_at >= ? AND started_at < ? ORDER BY started_at DESC',
    [startMs, endMs],
  );
  // ...
}

async findById(id: string): Promise<SessionDetail | null> {
  // Join workout_sessions + workouts + session_sets + exercises
  // Returns structure with setsByExercise grouping
}

async findDatesWithSessions(startMs: number, endMs: number): Promise<string[]> {
  // Uses date(started_at / 1000, 'unixepoch', 'localtime') for local date
  // Returns distinct dates as 'YYYY-MM-DD'
}

async getStats(): Promise<StatsData> {
  // Computes the 4 metrics above
}
```

## Store — `useHistoryStore`

```typescript
interface HistoryState {
  sessionsByMonth: Record<string, SessionWithMeta[]>;   // "YYYY-MM" -> sessions
  datesByMonth: Record<string, string[]>;               // "YYYY-MM" -> ["YYYY-MM-DD", ...]
  stats: StatsData | null;

  loadMonth: (yearMonth: string) => Promise<void>;
  loadStats: () => Promise<void>;
  invalidate: () => void;                               // chamado após nova sessão salva
}
```

## Nova tab top navigator

Usa `@react-navigation/material-top-tabs` (instalar). Contém apenas `HistoryCalendarScreen` e `StatsScreen`. Labels em PT-BR: "Histórico" e "Estatísticas".

Alternativa se Material Top Tabs der problema com Fabric: toggle custom de 2 botões no topo + `state` simples. Se precisar dessa alternativa, avisar.

## Estrutura de pastas adicionada

```
src/
├── screens/
│   └── history/                           [NOVO]
│       ├── HistoryTabsScreen.tsx
│       ├── HistoryCalendarScreen.tsx
│       ├── StatsScreen.tsx
│       └── SessionDetailScreen.tsx
├── components/
│   └── history/                           [NOVO]
│       ├── SessionCard.tsx                — card de sessão na lista do dia
│       ├── StatsCard.tsx                  — card grande com label + valor
│       └── ExerciseLogGroup.tsx           — bloco no detalhe: nome + séries
├── navigation/
│   └── HistoryStack.tsx                   [NOVO]
├── store/
│   └── useHistoryStore.ts                 [NOVO]
└── types/
    └── history.ts                         [NOVO]
```

`src/navigation/AppNavigator.tsx` é modificado: substitui `HistoryPlaceholder` por `HistoryStack`.

## Componentes

### `SessionCard`
Props: `{ session: WorkoutSession; workoutName: string; workoutColor: string; onPress: () => void }`
Layout: linha com barra lateral na cor do workout, hora (HH:mm), nome do workout, duração.

### `StatsCard`
Props: `{ label: string; value: string; icon?: string }`
Layout: card grande, valor destacado em tipografia grande + label pequeno.

### `ExerciseLogGroup`
Props: `{ exerciseName: string; muscleGroup: string; sets: SessionSet[] }`
Layout: nome do exercício + badge do grupo + lista horizontal/vertical de "N@Wkg" para cada set (mostrando peso=NULL como sem carga).

## Invalidação de cache

Quando uma sessão é salva (`WorkoutSummaryScreen.onFinish`), chamar `useHistoryStore.getState().invalidate()` após `sessionRepository.insert`. Invalida `sessionsByMonth`, `datesByMonth`, `stats`. Próxima entrada no Histórico recarrega.

## Erros e bordas

- **Mês sem sessões:** calendário sem marcações, lista vazia com `EmptyState` "Nenhum treino neste dia"
- **Primeira vez sem sessões:** `StatsScreen` mostra `EmptyState` "Complete um treino pra ver suas estatísticas"
- **`avgSessionsPerWeek` com 0 sessões:** retorna 0 (não dividir por zero)
- **`avgSessionsPerWeek` com sessões no mesmo dia:** `weeksSinceFirst = Math.max(1, Math.ceil(daysSinceFirst/7))`
- **Sessão sem `duration_seconds`** (abandono antigo?): ignorada no cálculo de duração média
- **Workout deletado após sessão:** `findById` join `LEFT JOIN` retorna workout nulo; UI mostra "Treino removido" no nome, cor default; botão "Repetir" desabilitado + `Alert.alert('Treino original não existe mais')`
- **Horário do device mudou:** `date(...)` usa horário local do device; não há correção temporal
- **Mudança de mês no calendário:** cache persiste (dict crescente); sem limite de memória pra MVP

## Testes unitários (Jest)

- `sessionRepository.findByDateRange` — round trip com 3 sessões em datas diferentes
- `sessionRepository.findDatesWithSessions` — retorna datas distintas
- `sessionRepository.findById` — monta `SessionDetail` correto agrupando sets por exercício
- `sessionRepository.getStats`:
  - Com 0 sessões retorna `{0, 0, 0, 0}` (sem NaN)
  - Com sessões no mesmo dia retorna `avgSessionsPerWeek >= 1`
  - `avgDurationSeconds` ignora sessões com `finished_at = NULL`
- `useHistoryStore.invalidate` limpa os 3 caches

## Entregáveis ao fim da fase

1. Tab "Histórico" funcional substituindo placeholder
2. Calendário mensal marca dias com treino
3. Tap num dia lista sessões; tap em sessão abre detalhe
4. Detalhe mostra exercícios + séries registrados + botão Repetir
5. "Repetir treino" inicia execução do mesmo workout
6. Aba Estatísticas com 3 cards (treinos do mês, freq semanal, duração média)
7. Invalidação de cache após salvar nova sessão
8. Testes unitários para repository e store

## Próximas fases (fora deste escopo)

- Fase 6: Player de música
- Fase 7: APK assinado
- **Backlog opcional:** gráficos de evolução, PRs, estatísticas avançadas (filtro de período, volume acumulado). Podem virar "Fase 5.5" ou incorporados em fases posteriores se o usuário pedir.
