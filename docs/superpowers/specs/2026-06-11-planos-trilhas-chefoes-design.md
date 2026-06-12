# Spec — Aba "Planos" → Trilhas de Chefões (Calistenia)

**Data:** 2026-06-11
**Status:** Design aprovado, pronto pra plano de implementação
**Escopo desta etapa:** redesenho conceitual e de UI da aba Planos. Apenas o
chefão **Pull-up** será implementado, para validação. Os treinos de cada
progressão ficam para uma etapa futura (serão definidos junto com a aba Treinos).

---

## 1. Visão geral

A aba **Planos** deixa de ser um agendador de sequência de treinos e passa a ser
uma **trilha de progressão rumo a uma skill-alvo da calistenia** ("chefão"). O
app perde o foco de academia/musculação e foca em calistenia.

Cada chefão (ex: Pull-up, Muscle Up, Handstand, Front Lever) tem uma sequência
**linear** de progressões que levam até dominá-lo. O usuário evolui cada
progressão por níveis de maestria e marca seu próprio progresso — sem testes
automáticos, câmera ou cobrança.

### Princípios

- **Conteúdo curado**, embutido no app. Sem criação/edição in-app nesta etapa.
- **Progresso é o gancho**, não notificação. Sem frequência semanal nem lembrete
  diário (removidos do conceito antigo).
- **Offline-first**, igual ao resto do app. Banco local é a fonte de verdade do
  progresso do usuário.

---

## 2. Modelo de domínio

### Chefão (Boss)

| Campo        | Tipo              | Notas                                  |
|--------------|-------------------|----------------------------------------|
| id           | string            | estável (ex: `boss_pull_up`)           |
| name         | string            | "Pull-up"                              |
| icon         | string            | emoji ou nome de ícone                 |
| color        | string (hex)      | cor-tema do chefão na UI               |
| description  | string \| null    | opcional                               |
| orderIndex   | number            | ordem na lista de chefões              |
| progressions | Progression[]     | ordenadas, fácil → chefão              |

### Progressão (Progression)

| Campo        | Tipo                  | Notas                                       |
|--------------|-----------------------|---------------------------------------------|
| id           | string                | estável (ex: `pull_up_australian`)          |
| bossId       | string                | a qual chefão pertence                      |
| orderIndex   | number                | posição na trilha (0 = mais fácil)          |
| name         | string                | "Australian Pull-up"                        |
| kind         | `reps` \| `isometric` | define qual escala de alvo exibir           |

### Nível de maestria (estado do usuário)

`masteryLevel: 0..3` por progressão:

| Nível | Valor | Alvo (reps) | Alvo (isometric) |
|-------|-------|-------------|------------------|
| Não começou  | 0 | —         | —     |
| Aprendido    | 1 | 1 limpa   | 3s    |
| Dominado     | 2 | 3 limpas  | 10s   |
| Masterizado  | 3 | 10 limpas | 15s   |

A escala é **global** — igual para todas as progressões do mesmo `kind`.

---

## 3. Regras de progressão

- **Desbloqueio em paralelo.** Uma progressão fica *bloqueada* enquanto a
  anterior estiver no nível 0. Assim que a anterior atinge **Aprendido (≥1)**, a
  próxima desbloqueia. Como basta 1 rep/3s, o usuário pode treinar várias
  progressões ao mesmo tempo e subir o nível de cada uma no seu ritmo.
  A 1ª progressão da trilha já começa desbloqueada.
- **Edição livre do nível.** O usuário pode subir ou corrigir o nível para baixo
  a qualquer momento (marcou por engano, regrediu, etc.).
- **Progresso do chefão** = soma dos níveis de todas as progressões ÷
  (nº de progressões × 3). Ex.: 4 progressões → máximo 12 pontos. Exibido como
  "nível X/12" + barra de porcentagem.
- **O chefão é a última progressão.** Como o chefão Pull-up e a última
  progressão "Pull-up" são a mesma coisa, não existe um nó separado para o
  chefão. A última progressão carrega os marcos de conquista.
- **Dois marcos de conquista** (na última progressão):
  - **Aprendido (nível 1)** → "🎉 Skill desbloqueada! Seu primeiro pull-up."
  - **Masterizado (nível 3)** → "🏆 Chefão dominado!"
  - Esses marcos disparam um destaque/celebração na UI quando atingidos.

---

## 4. Conteúdo inicial (curado) — Chefão Pull-up

Trilha "Pull-up", progressões em ordem fácil → chefão:

| # | Progressão               | kind | Observação                          |
|---|--------------------------|------|-------------------------------------|
| 1 | Progressão de escápula   | reps | scapular pulls                      |
| 2 | Australian Pull-up       | reps | remada horizontal na barra baixa    |
| 3 | Negativa de Pull-up      | reps | descida lenta e controlada          |
| 4 | Pull-up                  | reps | o chefão — pull-up completo         |

**Identidade do chefão Pull-up:**
- `color`: `#3282B8` (azul, da paleta existente `WORKOUT_COLORS`).
- `icon`: MaterialIcons `fitness-center` (ícones do app já usam
  `react-native-vector-icons/MaterialIcons`).
- `kind` de todas as 4 progressões: `reps` (inclusive Progressão de escápula).

---

## 5. Arquitetura de dados

**Decisão:** separar **conteúdo curado** (em código) de **progresso do usuário**
(em SQLite).

- **Conteúdo** (chefões + progressões) vive como *seed/constantes em código*
  (ex.: `src/database/seeds/bosses.ts` ou `src/constants/bosses.ts`), pois é
  curado e não editável. Mesma filosofia de `defaultExercises`.
- **Progresso** vive no SQLite, guardando apenas o nível por progressão:

```sql
CREATE TABLE progression_progress (
  progression_id TEXT PRIMARY KEY,   -- referencia o id curado em código
  mastery_level INTEGER NOT NULL DEFAULT 0,  -- 0..3
  updated_at INTEGER NOT NULL
);
```

A camada de leitura compõe o conteúdo curado + a tabela de progresso para montar
a trilha com os níveis atuais e o estado bloqueado/desbloqueado (derivado em
runtime a partir da regra de desbloqueio).

### Migração

As tabelas e dados do conceito antigo de "planos" (`plans`, `plan_workouts`,
lembretes/frequência relacionados) podem ser **removidos** — estamos
reformulando. A migração:
1. Dropa as tabelas antigas de planos.
2. Cria `progression_progress`.
3. (Conteúdo é seed em código, não precisa de seed em banco.)

---

## 6. Telas

### Tela 1 — Lista de chefões (landing da aba)

Lista de cards, um por chefão, com progresso (nível X/máx + barra) e a próxima
progressão a atacar. **Sem botão "novo"** (conteúdo curado).

```
┌─────────────────────────────────────┐
│  Sua jornada                         │
│  Chefões                             │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🏋 PULL-UP            nível 6/12 │ │
│ │ ▓▓▓▓▓▓░░░░░░  50%               │ │
│ │ Foco: Australian Pull-up         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Estados de card: em progresso (mostra foco atual), conquistado (skill
desbloqueada / masterizado com selo). Como só haverá Pull-up nesta etapa, a
lista terá 1 card.

### Tela 2 — Trilha do chefão (tela principal)

Timeline vertical (fácil → chefão). Cada progressão é uma linha com **3 pips**
de maestria. A linha lateral e os pips usam a **cor do chefão**.

```
┌─────────────────────────────────────┐
│ ←        Pull-up         nível 6/12  │
│          ▓▓▓▓▓▓░░░░░░  50%           │
├─────────────────────────────────────┤
│  ●●●                                 │
│   │   Progressão de escápula         │
│   │   Masterizado · 10 reps          │
│   │                                  │
│  ●●○                                 │
│   │   Australian Pull-up             │
│   │   Dominado                       │
│   │                                  │
│  ●○○                                 │
│   │   Negativa de Pull-up            │
│   │   Aprendido                      │
│   │                                  │
│  🔒                                  │
│       Pull-up · o chefão             │
│       bloqueado                      │
└─────────────────────────────────────┘
```

- **Progressão bloqueada:** cadeado, sem pips, texto esmaecido, não clicável.
- **Progressão desbloqueada:** clicável → abre a folha de marcação de nível.

### Folha de marcação de nível (bottom sheet)

Aberta ao tocar numa progressão desbloqueada. Mostra os 3 níveis com seus alvos
(reps ou segundos conforme `kind`) e o nível atual selecionado.

```
   ╭─────────────────────────────────╮
   │  Australian Pull-up             │
   │  ───────────────────────────    │
   │  ●  Aprendido     1 rep limpa   │
   │  ●  Dominado      3 reps limpas │
   │  ○  Masterizado   10 reps limpas│
   │                                 │
   │  (toque num nível pra marcar)   │
   ╰─────────────────────────────────╯
```

- Tocar num nível define `masteryLevel` (inclusive permite descer).
- Tocar abaixo do nível atual reduz; é permitido (correção/regressão).
- Ao marcar, recalcula desbloqueios e progresso, e dispara celebração se um
  marco de conquista foi atingido.

---

## 7. Celebrações / marcos

- Ao atingir **Aprendido na última progressão**: destaque "🎉 Skill
  desbloqueada — seu primeiro Pull-up!".
- Ao atingir **Masterizado na última progressão**: destaque "🏆 Chefão
  dominado!".
- Implementação visual (modal, confete, toast) a detalhar no plano; manter
  simples e offline.

---

## 8. Fora de escopo (nesta etapa)

- Treinos por progressão (lista de exercícios) — virá com a aba Treinos.
- Criação/edição de chefões e progressões in-app.
- Demais chefões além do Pull-up.
- Lembretes/agenda.
- Redesenho das outras abas (será tratado depois, tab por tab).

---

## 9. Pendências menores

- Forma visual exata da celebração de marcos (modal/confete/toast) — a detalhar
  no plano de implementação, mantendo simples e offline.
