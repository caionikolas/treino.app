# CRUD de Treinos (Fase 3) — Design

**Data:** 2026-04-18
**Escopo:** Criar, editar, duplicar e apagar treinos; adicionar, configurar, reordenar e remover exercícios dentro de um treino.
**Referência:** `CLAUDE.md` (spec geral) + `docs/superpowers/specs/2026-04-17-fundacao-biblioteca-exercicios-design.md` (fase anterior).

## Objetivo

Tab "Treinos" 100% funcional: usuário cria treinos personalizados combinando exercícios da biblioteca, define séries/reps/descanso, reordena, salva, edita, duplica e apaga. Entrega a base para a Fase 4 (Execução do treino).

## Fora de escopo

- Tela de execução de treino (Fase 4)
- Histórico e gráficos de evolução (Fase 5)
- Player de música (Fase 6)
- Fix da reprodução de vídeo (plano dedicado `2026-04-17-fix-video-playback.md`)

## Decisões (confirmadas com o usuário)

| Tópico | Decisão |
|---|---|
| Defaults ao adicionar exercício | 4 séries × 12 reps × 90s de descanso |
| Reorder de exercícios | Botões ▲/▼ em cada linha (sem drag-and-drop) |
| Cor do treino | Paleta fixa de 10 cores (grid 5×2 de círculos) |
| Duplicar treino | Auto com sufixo `(cópia)`, abre direto no form |
| Picker de exercícios | Reusa padrão da biblioteca (lista + busca + filtros), modo multi-add (fica aberto até "Concluído") |
| Save | Explícito com botão "Salvar". Sair sujo dispara alerta "Descartar alterações?" |
| Card na lista | Minimalista: nome + fundo na cor + contagem de exercícios |

## Arquitetura

```
App
├── Navigation
│   └── WorkoutStack  (substitui o placeholder da tab Treinos)
│       ├── WorkoutListScreen           — lista de cards coloridos
│       ├── WorkoutFormScreen           — criar/editar (nome, cor, exercícios)
│       ├── ExercisePickerScreen        — modal para adicionar exercícios em batch
│       └── ExerciseInWorkoutScreen     — editar séries/reps/descanso de um exercício
├── State (Zustand)
│   ├── useWorkoutStore                 — lista resumida em memória + CRUD
│   └── useWorkoutDraftStore            — rascunho em memória durante edição
└── Data
    └── workoutRepository               — CRUD em workouts + workout_exercises
```

## Modelo de dados

Tabelas já criadas na migration v1. **Nenhuma migration nova necessária.**

**`workouts`** — armazena cada treino:
- `color` guarda string hex (ex: `#E94560`). Limitado à paleta fixa, mas armazenado como hex livre.
- `description` fica opcional (não é exposto no UI desta fase; reserva pra anotações futuras).

**`workout_exercises`** — linhas de exercícios dentro de um treino:
- `order_index` define ordem na tela (0-based, contínuo)
- `reps` é TEXT para aceitar valores como `"12"`, `"8-12"`, `"até falha"`
- `rest_seconds` é INTEGER (segundos)
- `notes` fica opcional (não exposto no UI; reserva futura)
- `ON DELETE CASCADE` no `workout_id` garante limpeza ao apagar treino

## Convenções

- Defaults para novo exercício no treino: `sets = 4`, `reps = "12"`, `rest_seconds = 90`.
- Paleta de 10 cores definida em `src/constants/workoutColors.ts`:
  ```
  #E94560, #3282B8, #6A4C93, #F39C12, #00B894,
  #FD79A8, #FDCB6E, #A29BFE, #00CEC9, #E17055
  ```
  Primeira cor (`#E94560`, accent do tema) é o default ao criar.
- Cor aplicada ao card tem versão translúcida (alpha ~0.85) para manter legibilidade do texto branco.

## Estrutura de pastas adicionada

```
src/
├── components/
│   └── workout/
│       ├── WorkoutCard.tsx            — card da lista
│       ├── WorkoutExerciseRow.tsx     — linha de exercício no form (com ▲▼✏🗑)
│       ├── ColorPicker.tsx            — grid 5×2 de círculos
│       └── WorkoutFormFields.tsx      — agrupa nome + color picker (testável isolado)
├── screens/
│   └── workout/
│       ├── WorkoutListScreen.tsx
│       ├── WorkoutFormScreen.tsx
│       ├── ExercisePickerScreen.tsx
│       └── ExerciseInWorkoutScreen.tsx
├── navigation/
│   └── WorkoutStack.tsx               — substitui o placeholder em AppNavigator
├── store/
│   ├── useWorkoutStore.ts             — lista resumida + CRUD
│   └── useWorkoutDraftStore.ts        — rascunho durante edição
├── database/
│   └── repositories/
│       └── workoutRepository.ts       — CRUD em workouts + workout_exercises
├── types/
│   └── workout.ts                     — Workout, WorkoutExercise
└── constants/
    └── workoutColors.ts               — paleta fixa
```

## Tipos

```typescript
// src/types/workout.ts
export interface Workout {
  id: string;
  name: string;
  description: string | null;
  color: string;       // hex
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

// Para a lista de treinos (resumido, com count)
export interface WorkoutSummary {
  id: string;
  name: string;
  color: string;
  exerciseCount: number;
  updatedAt: number;
}

// Durante edição (junta exercise snapshot para exibir nome sem join)
export interface DraftExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
}
```

## Screens

### WorkoutListScreen

- Header: título "Treinos"
- `FlatList` de `WorkoutCard` (ou `EmptyState` "Nenhum treino ainda. Toque em + para criar.")
- **FAB** circular no canto inferior direito com ícone `+`, abre `WorkoutFormScreen` em modo "novo"
- Tocar num card abre `WorkoutFormScreen` em modo "editar"
- Long-press num card (ou ícone de menu na borda do card) abre um pequeno menu: **Duplicar** / **Apagar**
  - Apagar dispara `Alert` nativo com "Apagar treino?" + "Esta ação não pode ser desfeita" + botões Cancelar/Apagar

### WorkoutFormScreen

- Header: botão voltar (esquerda), título ("Novo treino" ou nome atual), botão "Salvar" (direita)
- Corpo (scroll):
  - Campo nome (Input com `label="Nome"`)
  - `ColorPicker` (label "Cor")
  - Seção "Exercícios" com contador
  - Lista de `WorkoutExerciseRow` (drag handle NÃO; usa ▲/▼)
  - Botão "Adicionar exercício" → navega para `ExercisePickerScreen`
- Botão "Salvar" desabilitado se nome vazio
- Ao pressionar back (ou botão header esquerdo): se `isDirty`, `Alert` "Descartar alterações?" — Cancelar / Descartar
- Ao salvar: persiste via `workoutRepository`, atualiza `useWorkoutStore`, navega back

### ExercisePickerScreen

- Praticamente a mesma UI de `ExerciseLibraryScreen` (busca + filtros + FlatList), reusa os componentes `MuscleGroupFilter`, `CategoryFilter`, `ExerciseCard`.
- **Diferença:** tocar num card **adiciona o exercício ao draft imediatamente** (com defaults 4×12×90s) e mostra um pequeno toast/banner "Adicionado: {nome}".
- Header: botão voltar (X) + título "Adicionar exercícios" + botão "Concluído" (direita) que volta ao form
- Exercícios já adicionados ao draft mostram um checkmark ou opacity reduzida no card (feedback visual de "já está no treino")
- Tocar num exercício já adicionado **não faz nada** (evita duplicar).

### ExerciseInWorkoutScreen

- Aberto via ícone ✏ em `WorkoutExerciseRow`.
- Pequena tela com 3 inputs:
  - Séries (numérico, default 4)
  - Repetições (texto, default "12")
  - Descanso em segundos (numérico, default 90)
- Header: botão voltar (X) + título (nome do exercício) + botão "Salvar" (ou "Aplicar")
- Salvar volta ao form, atualiza `useWorkoutDraftStore`.

## Componentes

### `WorkoutCard`
```
props: { workout: WorkoutSummary; onPress: () => void; onLongPress: () => void }
```
- Background na cor do workout (com leve escurecimento para contraste)
- Texto branco: nome (heading) + subtítulo "{N} exercícios"
- MinHeight 96dp, margin bottom pequena

### `WorkoutExerciseRow`
```
props: {
  exercise: DraftExercise;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
}
```
- Layout em linha: info do exercício (nome + "4x12 • 90s") à esquerda, 4 ícones à direita (▲ ▼ ✏ 🗑)
- ▲ desabilitado se `index === 0`, ▼ desabilitado se `index === total - 1`

### `ColorPicker`
```
props: { value: string; onChange: (hex: string) => void; colors?: string[] }
```
- Default colors = palette de `constants/workoutColors.ts`
- Grid 5×2 de círculos (tocáveis ~44dp)
- Ring ao redor do selecionado

### `WorkoutFormFields`
Agrupa Input (nome) + ColorPicker. Props: `name, color, onNameChange, onColorChange`. Extraído para ser testável isolado e permitir reuso.

## Fluxo de dados

### Criar treino
1. Usuário na `WorkoutListScreen` toca FAB
2. Navega para `WorkoutFormScreen({ mode: "new" })`
3. `useEffect`: `draftStore.loadNew()` — inicializa `{ name: "", color: #E94560, exercises: [] }`
4. Usuário digita nome, escolhe cor → `draftStore.updateName` / `draftStore.updateColor`
5. Toca "Adicionar exercício" → navega para `ExercisePickerScreen`
6. No picker, cada tap em exercício → `draftStore.addExercise(exercise)` — adiciona com defaults
7. Toca "Concluído" → back para form, exercícios aparecem na lista
8. Toca ícone ✏ num exercício → navega para `ExerciseInWorkoutScreen({ index })`
9. Usuário edita sets/reps/rest, salva → `draftStore.updateExerciseConfig(index, {...})` + back
10. Usuário toca ▲/▼ para reordenar → `draftStore.moveUp(index)` / `moveDown(index)`
11. Toca "Salvar" no header → `workoutRepository.insert(workout, exercises)` → `workoutStore.load()` → navigation.goBack()

### Editar treino
1. `WorkoutListScreen` → tap num card → `WorkoutFormScreen({ mode: "edit", id })`
2. `useEffect`: `draftStore.loadExisting(id)` — carrega workout + exercises via repository
3. `originalSnapshot` é salvo para calcular `isDirty`
4. Edição segue igual a criar
5. "Salvar" chama `workoutRepository.update(id, workout, exercises)` (delete-all + insert-all em transação)

### Duplicar
1. `WorkoutListScreen` → long-press no card → menu "Duplicar"
2. `workoutStore.duplicate(id)`:
   - Lê via repository
   - Gera novo UUID
   - Nome: `${original.name} (cópia)`
   - Mesmos exercícios, mesma cor, mesmos configs
   - Insere via repository
   - Recarrega lista
3. Navega imediatamente para `WorkoutFormScreen({ mode: "edit", id: newId })` para permitir ajuste

### Apagar
1. Long-press → menu "Apagar" → `Alert` confirmação
2. Confirmado: `workoutStore.remove(id)` → repository `delete` (cascade limpa exercícios)
3. Recarrega lista

## Repository

```typescript
// src/database/repositories/workoutRepository.ts
export const workoutRepository = {
  async findAllSummaries(): Promise<WorkoutSummary[]> {
    // SELECT w.id, w.name, w.color, w.updated_at, COUNT(we.id) as count
    // FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
    // GROUP BY w.id ORDER BY w.updated_at DESC
  },

  async findById(id: string): Promise<{ workout: Workout; exercises: WorkoutExercise[] } | null>,

  async insert(workout: Workout, exercises: WorkoutExercise[]): Promise<void> {
    // db.transaction: insert workout, insert all workout_exercises
  },

  async update(id: string, workout: Workout, exercises: WorkoutExercise[]): Promise<void> {
    // db.transaction:
    //   UPDATE workouts SET ... WHERE id = ?
    //   DELETE FROM workout_exercises WHERE workout_id = ?
    //   INSERT all new exercises
  },

  async delete(id: string): Promise<void>,
};
```

Estratégia delete-all+insert-all no update: mais simples que diffing; performance aceitável (treinos têm <30 exercícios tipicamente).

## Store

### `useWorkoutStore`
```typescript
interface WorkoutState {
  summaries: WorkoutSummary[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (workout: Workout, exercises: WorkoutExercise[]) => Promise<void>;
  duplicate: (id: string) => Promise<string>;  // retorna novo id
  remove: (id: string) => Promise<void>;
}
```

### `useWorkoutDraftStore`
```typescript
interface DraftState {
  id: string | null;        // null quando novo
  name: string;
  color: string;
  exercises: DraftExercise[];
  originalSnapshot: string;  // JSON.stringify da versão original (para isDirty)

  loadNew: () => void;
  loadExisting: (id: string) => Promise<void>;
  updateName: (name: string) => void;
  updateColor: (color: string) => void;
  addExercise: (exerciseId: string, exerciseName: string, muscleGroup: string) => void;  // usa defaults
  removeExercise: (index: number) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  updateExerciseConfig: (index: number, patch: Partial<Pick<DraftExercise, 'sets' | 'reps' | 'restSeconds'>>) => void;
  isDirty: () => boolean;
  hasExercise: (exerciseId: string) => boolean;  // para feedback no picker
  toPersist: () => { workout: Workout; exercises: WorkoutExercise[] };  // transforma em objetos para salvar
  reset: () => void;
}
```

## Testes

Unitários (Jest):

- **`workoutRepository`** — insert + findById + update + delete com SQLite em memória. Verifica cascata.
- **`useWorkoutDraftStore`**:
  - `addExercise` aplica defaults (4, "12", 90)
  - `moveUp(0)` é no-op; `moveDown(last)` é no-op
  - `moveUp(1)` troca itens 0 e 1
  - `isDirty` detecta: mudança de nome, mudança de cor, add/remove/reorder de exercício
  - `hasExercise` retorna true/false corretamente
- **`useWorkoutStore.duplicate`** — mocka o repository, valida sufixo "(cópia)" no nome

Testes de UI / snapshot: fora de escopo.

## Erros e bordas

- **Salvar sem nome:** botão "Salvar" desabilitado + placeholder/hint "Nome é obrigatório"
- **Salvar sem exercícios:** permitido (usuário pode montar esqueleto e preencher depois)
- **Sair de `WorkoutFormScreen` sujo:** `Alert` "Descartar alterações?" com Cancelar/Descartar
- **Back do Android:** intercepta com `BackHandler` para disparar o mesmo alerta
- **Reorder nas pontas:** botões ▲/▼ desabilitados adequadamente
- **Exercício removido da biblioteca no futuro:** a biblioteca é read-only nesta fase, sem risco
- **Duplicar nome já com "(cópia)":** vira "(cópia) (cópia)" — aceitável, simples
- **Picker aberto em edição, exercício já no treino:** card aparece com opacity baixa + checkmark, tap é no-op
- **Navegar direto para `ExerciseInWorkoutScreen` sem draft carregado:** não é possível pelo fluxo; mas como guarda, a tela mostra fallback "Exercício não encontrado" e volta

## Entregáveis ao fim da fase

1. Tab "Treinos" funcional substituindo o placeholder
2. Criar, editar, duplicar, apagar treinos
3. Adicionar/remover/reordenar/configurar exercícios dentro de um treino
4. Lista de cards coloridos com contagem
5. Picker de exercícios reusando a biblioteca com feedback visual
6. Persistência em SQLite via repository + cascade no delete
7. Testes unitários para repository, draft store e duplicate logic

## Próximas fases (fora deste escopo)

- Fase 4: Tela de execução (timer, séries, cronômetro, keep-awake) — usa treinos desta fase
- Fase 5: Histórico + gráficos de evolução
- Fase 6: Player de música
- Fase 7: APK assinado de release
