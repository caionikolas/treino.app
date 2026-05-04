# Redesign — Criação de Treino e Configuração de Exercício

**Data:** 2026-05-04
**Branch:** feat/planos
**Escopo:** Tela de criação/edição de treino, tela de configuração de exercício no treino, e modais auxiliares (cor, sets, rest).

---

## Contexto

Hoje a tela `WorkoutFormScreen` mistura campos do treino (nome, cor) com a lista de exercícios e seu botão de adicionar. A configuração por exercício (`ExerciseInWorkoutScreen`) é minimalista: três inputs (séries, reps, descanso).

O usuário forneceu mockups (`assets/examples/treino1.png`, `treino2.png`, `treino3.png`, `treino4.png`) que pedem um redesign completo dessas telas. As decisões de modelo e fluxo abaixo foram alinhadas em sessão de brainstorm.

---

## Decisões de design

1. **Peso fica só na execução.** Template guarda apenas `reps_per_set`. A coluna "Weight" da treino2.png é placeholder visual ("—") durante o planejamento.
2. **Sets default por treino.** Treino tem `default_sets` e `default_rest_seconds` — usados ao adicionar novo exercício; cada exercício pode ter overrides.
3. **Warm-up por exercício** = uma série especial opcional, com `reps` próprio (sem tempo). Toggle no/off.
4. **Descanso por exercício** = toggle (ativar/desativar) + tempo configurável.
5. **Lista de exercícios sai da tela de criação** e vai para `WorkoutPreviewScreen`.
6. **Itens "Rep Type", "Planning", "Add to home"** que aparecem na imagem são ignorados (YAGNI).

---

## Modelo de dados

### Migração v2

**Tabela `workouts`** — adicionar:
- `default_sets INTEGER NOT NULL DEFAULT 3`
- `default_rest_seconds INTEGER NOT NULL DEFAULT 90`

**Tabela `workout_exercises`** — adicionar:
- `warmup_enabled INTEGER NOT NULL DEFAULT 0`
- `warmup_reps INTEGER` (nullable; só usado se warmup_enabled=1)
- `rest_enabled INTEGER NOT NULL DEFAULT 1`
- `reps_per_set TEXT NOT NULL DEFAULT '[]'` — JSON array, ex: `[30,30,30]`

**Migração de dados existentes:** popular `reps_per_set` a partir de `sets` + `reps`. Para `sets=4, reps="12"` → `[12,12,12,12]`. Se `reps` não for numérico (ex: "8-12"), usa o limite superior (12); fallback 10.

**Campo `sets` legado:** mantido na tabela por compatibilidade com leitura de versões antigas, mas não é mais escrito pela aplicação. Derivado de `reps_per_set.length` em runtime.

### Tipos TypeScript

```ts
// types/workout.ts
interface Workout {
  id: string;
  name: string;
  description: string | null;
  color: string;
  defaultSets: number;
  defaultRestSeconds: number;
  createdAt: number;
  updatedAt: number;
}

interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  orderIndex: number;
  repsPerSet: number[];
  restSeconds: number;
  restEnabled: boolean;
  warmupEnabled: boolean;
  warmupReps: number | null;
  notes: string | null;
}
```

`DraftExercise` (no store) reflete a mesma estrutura.

---

## Fluxo de navegação

```
WorkoutList
  ├── (+) → WorkoutForm[new]            ← só campos do treino
  │           └── salvar → WorkoutPreview[id criado]
  └── tap   → WorkoutPreview
                ├── "Editar"          → WorkoutForm[edit]
                ├── "Adicionar"       → ExercisePicker → volta
                ├── tap exercício     → ExerciseInWorkout (treino2.png)
                └── "Iniciar treino"  → fluxo de sessão (sem mudança)
```

`ExerciseInWorkout` mantém o nome atual (`ExerciseInWorkoutScreen`).

---

## Componentes

### Novos

| Componente | Responsabilidade |
|---|---|
| `SettingRow` | Linha "ícone + label / valor + chevron", clicável. |
| `StepperModal` | Bottom-sheet com `[-] valor [+] Save`. Aceita `min`, `max`, `step`, `formatter`, `title`, `description`. |
| `ColorPickerModal` | Bottom-sheet com grid de cores; anel branco no selecionado; Save. |
| `WorkoutNameField` | Input grande, accent, bold, com label "Novo treino" acima. |
| `Toggle` | Switch reutilizável. |
| `SetRow` | Linha `Set | Reps | Weight` com input editável de reps. |

### Modificados

- `WorkoutFormFields` — reescrito para usar `SettingRow` + abrir os modais de cor/sets/rest. Não mostra mais lista de exercícios.
- `WorkoutFormScreen` — perde lista de exercícios e botão "Adicionar exercício". Botão "Criar treino"/"Salvar" no rodapé. Após criar, navega para `WorkoutPreview`.
- `WorkoutPreviewScreen` — ganha botão "Adicionar exercício" (abre picker existente). Tap em exercício da lista → `ExerciseInWorkout`.
- `ExerciseInWorkoutScreen` — redesign completo (treino2.png).
- `useWorkoutDraftStore` — novos campos: `defaultSets`, `defaultRest` (já no draft), `warmupEnabled`, `warmupReps`, `restEnabled`, `repsPerSet` (no draft de exercício). Métodos: `updateSetReps(exIndex, setIndex, reps)`, `addSet(exIndex)`, `removeSet(exIndex, setIndex)`, `toggleWarmup(exIndex)`, `setWarmupReps(exIndex, reps)`, `toggleRest(exIndex)`, `updateRestSeconds(exIndex, seconds)`.

---

## Layout das telas

### `WorkoutFormScreen` (treino1.png)

```
┌───────────────────────────────┐
│ Novo treino                ✕  │  ← label pequeno
│                               │
│ Push up                       │  ← input grande accent
│                               │
│ ─────────────────────────     │
│ 🎨 Cor              [swatch]> │  ← SettingRow
│ ⚙️  Séries          3 séries> │
│ ⏱  Descanso        1:30   >   │
│                               │
│         [Criar treino]        │  ← botão grande
└───────────────────────────────┘
```

### `ExerciseInWorkoutScreen` (treino2.png)

```
┌───────────────────────────────┐
│ Push-up               🕒 00:00│
│                               │
│ [3:00 rest]   Warm-up  ◯─●    │
│ [Descanso]              ●─◯   │
│                               │
│ Set    Reps     Weight        │
│  ⚡    [10]      —            │  ← warm-up se enabled
│  1     [30]      —            │
│  2     [30]      —            │
│  3     [30]      —            │
│                               │
│ [+ Adicionar série]           │
│                               │
│       [Iniciar treino]        │
└───────────────────────────────┘
```

### `ColorPickerModal` (treino4.png)

Bottom-sheet altura ~50%. Título "Cor", subtítulo "Escolha uma cor para este treino". Grid 6 colunas × N linhas. Swatch selecionado tem anel branco. Botão "Salvar" no rodapé.

### `StepperModal` (treino3.png)

Bottom-sheet altura ~40%. Título customizável. Subtítulo descritivo. Linha central: `[-] grande_valor [+]`. Botão "Salvar" no rodapé.

---

## Critérios de aceite

- Tela `WorkoutForm` (new/edit) renderiza visualmente como treino1.png.
- Tap em "Cor" abre `ColorPickerModal`. Salvar atualiza a swatch.
- Tap em "Séries" abre `StepperModal` (min=1, max=10, valor inicial = `defaultSets`).
- Tap em "Descanso" abre `StepperModal` com formatador `mm:ss`, step=15s, min=0, max=600s.
- Botão "Criar treino" só ativa com nome preenchido. Salvar redireciona para `WorkoutPreview`.
- `WorkoutPreview` mostra botão "Adicionar exercício" e cada exercício é tapável.
- `ExerciseInWorkout` renderiza como treino2.png.
- Warm-up toggle on → linha extra no topo da lista com ícone raio na coluna Set.
- Rest toggle off → badge de tempo aparece desativada visualmente.
- Adicionar/remover séries reflete em `repsPerSet`.
- Migração v2 roda no primeiro boot e popula `reps_per_set` sem perda de dados.
- "Iniciar treino" do `ExerciseInWorkout` ou `WorkoutPreview` chama o mesmo fluxo de sessão atual.

## Fora de escopo

- Cronômetro real na tela do exercício (só placeholder visual).
- Drag-and-drop para reordenar (mantém os botões up/down).
- "Rep Type", "Planning", "Add to home".
- Mudanças em player de música, histórico, biblioteca de exercícios.
