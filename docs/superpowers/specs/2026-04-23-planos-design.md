# Spec: Feature "Planos"

**Data:** 2026-04-23
**Status:** Aprovado para implementação

## Objetivo

Adicionar uma nova tab "Planos" ao app que permite ao usuário agrupar treinos numa sequência ordenada executada ao longo de vários dias, com sugestão diária do próximo treino e lembrete opcional por notificação local.

## Modelo conceitual

Um **plano** é uma sequência ordenada de treinos existentes (referência a `workouts.id`) que o usuário roda ao longo de vários dias.

### Regras

- **Frequência configurável** por plano: `daily` (todo dia) / `mon_to_sat` (seg a sáb) / `mon_to_fri` (seg a sex). Em dia "off" pela frequência, nenhum treino é sugerido.
- **Múltiplos planos ativos** simultaneamente, cada um com progresso e lembrete independentes.
- **Ponteiro de progresso** só avança quando o treino sugerido é concluído. Qualquer sessão concluída do `workout_id` sugerido conta — não importa se foi iniciada pela tab Planos ou pela tab Treinos.
- Se hoje é dia útil pela frequência mas o sugerido **não foi feito**, amanhã segue sugerindo o **mesmo** treino (não avança).
- Ao concluir o último treino da sequência, plano vira `completed`, mostra estatísticas e pode ser reiniciado manualmente.
- **Lembrete opcional** por plano: notificação local diária em horário fixo configurável, com nome do treino sugerido do dia. Suprimida em dia de descanso ou plano `completed`.

### Liberdade do usuário

A qualquer momento o usuário pode ver os treinos de qualquer plano e iniciar qualquer um deles diretamente. Isso só conta como "avanço do ponteiro" se coincidir com o treino sugerido do dia.

## Modelo de dados (SQLite)

Duas tabelas novas, adicionadas via nova migração em `src/database/migrations.ts`:

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  frequency TEXT NOT NULL,                  -- 'daily' | 'mon_to_sat' | 'mon_to_fri'
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,                       -- 'HH:MM' (NULL se desabilitado)
  status TEXT NOT NULL DEFAULT 'idle',      -- 'idle' | 'active' | 'completed'
  current_index INTEGER NOT NULL DEFAULT 0, -- ponteiro em plan_workouts
  started_at INTEGER,                       -- timestamp início (NULL antes de iniciar)
  completed_at INTEGER,                     -- timestamp conclusão
  last_advanced_at INTEGER,                 -- usado p/ não consumir 2x mesma sessão
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE plan_workouts (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL REFERENCES workouts(id),
  order_index INTEGER NOT NULL
);
CREATE INDEX idx_plan_workouts_plan ON plan_workouts(plan_id, order_index);
```

### Notas

- `current_index` aponta posição em `plan_workouts` ordenado por `order_index`.
- `status='idle'` antes de iniciar; `'active'` após "Iniciar plano"; `'completed'` ao terminar.
- Estatísticas pós-conclusão são derivadas de `workout_sessions` (filtra por `started_at` entre `plans.started_at` e `completed_at`, e por `workout_id ∈ plan_workouts`). Sem tabela extra.
- `last_advanced_at` evita contar a mesma sessão duas vezes: só sessões com `finished_at > last_advanced_at` são candidatas a avançar o ponteiro.

## Lógica do treino sugerido e reconciliação

### `getSuggestedWorkout(plan, today)` — função pura

1. Se `plan.status !== 'active'` → `null`
2. Se `today` é dia "off" pela `plan.frequency` → `null` (descanso)
3. Caso contrário → `plan_workouts[plan.current_index]`

### `reconcilePlanProgress(plan)` — efeito colateral

Avança o ponteiro se o treino sugerido foi concluído desde a última reconciliação.

- Pega o `workout_id` em `current_index`.
- Busca sessão concluída (`finished_at NOT NULL`) desse `workout_id` com `finished_at > plan.last_advanced_at`.
- Se existe → `current_index += 1`, `last_advanced_at = finished_at` da sessão. Se atingir o fim → `status='completed'`, `completed_at=now`, cancela lembrete.
- Loop até não haver mais avanço (cobre o caso raro de várias sessões em sequência).

### Quando reconciliar

- **Ao abrir a tab Planos** ou `PlanDetailScreen`: para cada plano `active`, executa `reconcilePlanProgress`.
- **Ao finalizar uma sessão** (em `WorkoutExecutionScreen` no save): chama `reconcileAllActivePlans(workoutId)` para todos os planos ativos que contêm aquele `workout_id`.

## Lembretes (notificações locais)

**Biblioteca:** `@notifee/react-native` — notificações locais com agendamento recorrente, sem servidor nem Firebase. Mantém o "100% offline".

### Comportamento

- Ao habilitar lembrete (toggle + horário): agenda trigger diário recorrente em `reminder_time`.
- Conteúdo (nome do treino sugerido) resolvido no momento do disparo: o callback consulta `plans` + `getSuggestedWorkout` no instante da notificação. Em dia de descanso ou plano `completed`, suprime (não exibe).
- Tap na notificação → abre `PlanDetailScreen` daquele plano (deep link interno).
- Desabilitar lembrete / completar plano / deletar plano → cancela o trigger.

### Permissão

Android 13+ exige `POST_NOTIFICATIONS`. Pedir runtime na primeira vez que o usuário ativa um lembrete em qualquer plano.

### Persistência

- Triggers ficam no SO via Notifee.
- No startup do app, `syncReminders()` lê todos os planos com `reminder_enabled=1` e re-agenda (idempotente). Cobre boot do device, reinstall e mudanças de timezone.

## Navegação e telas

Adicionar uma 5ª tab "Planos" no `BottomTabNavigator` (em `AppNavigator.tsx`), com seu próprio stack `PlanStack.tsx`:

```
Tab "Planos"
├── PlanListScreen          → Lista de planos (cards coloridos com status/progresso)
├── PlanFormScreen          → Criar/editar plano (nome, cor, frequência, lembrete)
├── PlanWorkoutPickerScreen → Selecionar e ordenar treinos do plano
└── PlanDetailScreen        → Detalhe + ações (iniciar/reiniciar/executar treino)
```

### PlanListScreen

- Lista todos os planos. Card mostra: nome, cor, status (`Em andamento` / `Não iniciado` / `Concluído`), progresso (`3/8 treinos`), próximo treino sugerido (se ativo).
- FAB "+" para criar novo plano.

### PlanFormScreen

- Campos: nome, descrição (opcional), cor, frequência (radio com 3 opções), toggle de lembrete + time picker.
- Em modo edição de plano `active`, mudanças de frequência/lembrete são imediatas; mudanças que afetam progresso (remover/reordenar treinos) ficam no `PlanWorkoutPickerScreen` com confirmação.

### PlanWorkoutPickerScreen

- Lista treinos disponíveis (de `workouts`), permite seleção múltipla e drag-to-reorder dos selecionados.

### PlanDetailScreen

Topo varia por status:

- **`active` + sugestão hoje**: card grande "Treino de hoje: **Treino A**" + botão `▶ Iniciar treino` (abre `WorkoutExecutionScreen`).
- **`active` + dia de descanso**: "Hoje é dia de descanso 💤"
- **`idle`**: botão grande `Iniciar plano`.
- **`completed`**: card de estatísticas (total de sessões feitas dentro do período do plano, dias de duração, treinos da sequência completados) + botão `Reiniciar plano`.

Abaixo: lista ordenada de todos os treinos do plano, com indicador visual de qual é o atual. Tocar em qualquer um abre o `WorkoutExecutionScreen` daquele treino livremente.

### Integração com execução

`WorkoutExecutionScreen` ao salvar a sessão chama `reconcileAllActivePlans(workoutId)`. Sem mudança visual no execution screen.

## Estrutura de arquivos nova

```
src/
├── navigation/PlanStack.tsx
├── screens/plan/
│   ├── PlanListScreen.tsx
│   ├── PlanFormScreen.tsx
│   ├── PlanWorkoutPickerScreen.tsx
│   └── PlanDetailScreen.tsx
├── components/plan/
│   ├── PlanCard.tsx
│   ├── PlanProgressBar.tsx
│   ├── SuggestedWorkoutCard.tsx
│   └── PlanStatsCard.tsx
├── store/usePlanStore.ts
├── database/repositories/planRepository.ts
├── services/reminderService.ts          (Notifee wrapper + syncReminders)
├── hooks/usePlanReconciliation.ts
├── types/plan.ts
└── utils/planSchedule.ts                (frequency → isRestDay(date))
```

E alterações em:

- `src/navigation/AppNavigator.tsx` — adicionar tab.
- `src/database/migrations.ts` — bump de versão + migração das novas tabelas.
- `src/screens/workout/WorkoutExecutionScreen.tsx` — chamar `reconcileAllActivePlans` no save.
- `App.tsx` — chamar `syncReminders()` no startup; configurar listeners do Notifee.

## Edge cases

- **Plano vazio** (sem treinos): bloqueia botão "Iniciar plano".
- **Editar plano ativo:** nome/cor/frequência/lembrete podem mudar. Remover ou reordenar treinos pede confirmação. Após reorder, `current_index` é ajustado para apontar para o mesmo `workout_id` se ainda existir; senão é clamped no novo tamanho.
- **Deletar treino que está num plano:** o repository de workouts faz checagem e bloqueia o delete com mensagem "este treino faz parte de N planos".
- **Timezone/data do device:** usar `new Date()` local consistentemente em `isRestDay` e comparações de "mesmo dia".
- **Múltiplos planos sugerindo o mesmo `workout_id` no mesmo dia:** uma sessão concluída avança o ponteiro de todos os planos ativos cujo `current_index` aponta para esse `workout_id`. Comportamento desejado.
- **Reiniciar plano completed:** zera `current_index`, `started_at=now`, `completed_at=null`, `last_advanced_at=now`, `status='active'`. Re-agenda lembrete se habilitado.

## Testes (Jest)

- `planSchedule.test.ts`: `isRestDay` para cada `frequency` × dias da semana.
- `reconcilePlanProgress.test.ts`: avança 1, avança múltiplos numa só passada, não avança em dia off, não avança sem sessão, não conta sessão anterior a `last_advanced_at`, completa plano no fim da sequência.
- `planRepository.test.ts`: CRUD básico + cascade ao deletar plano.

## Dependências novas

- `@notifee/react-native` — notificações locais com agendamento recorrente, sem servidor nem Firebase.

## Fora de escopo (YAGNI)

- Frequência custom além das 3 opções (dá para estender depois).
- Múltiplos lembretes por plano.
- Snooze de notificação.
- Sincronização entre devices (app é offline single-user).
