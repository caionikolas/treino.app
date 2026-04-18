# Fundação + Biblioteca de Exercícios — Design

**Data:** 2026-04-17
**Escopo:** Fase 1 (fundação do projeto) + Fase 2 (biblioteca de exercícios) do app Treino.app
**Referência:** `CLAUDE.md` (spec geral do projeto)

## Objetivo

Entregar um app React Native navegável, com tema escuro, SQLite configurado, schema completo criado, e a tab "Exercícios" 100% funcional (lista, busca, filtros, detalhe com vídeo). Serve de base para as fases seguintes (treinos, execução, histórico, música).

## Fora de escopo

- Criação e execução de treinos
- Histórico e gráficos de evolução
- Player de música
- Geração de APK assinado de release
- CRUD de exercícios via UI (biblioteca é read-only)

## Decisões técnicas

| Tópico | Decisão | Observação |
|---|---|---|
| Framework | React Native CLI (sem Expo) | Conforme spec |
| Linguagem | TypeScript | |
| Gerenciador de pacotes | pnpm | |
| SQLite | `op-sqlite` | Mais rápido e mantido ativamente que `react-native-sqlite-storage` |
| Mídia de exercícios | `react-native-video` em loop silencioso | MP4, não GIF — ~10x menor no bundle |
| Estado | Zustand | |
| Navegação | React Navigation (Bottom Tabs) | |
| minSdkVersion | 26 (Android 8.0) | Cobre ~97% dos devices |
| targetSdkVersion | 34 (Android 14) | |
| JDK | 17 | |
| Ambiente de build | Android Studio | |

### Renomeação do schema

O campo `gif_filename` da tabela `exercises` (definido no `CLAUDE.md`) passa a se chamar **`media_filename`**, pois armazena arquivos MP4 e não GIFs. Todas as demais tabelas permanecem idênticas ao spec.

### Convenção de nomes: assets em inglês, UI em PT-BR

- **Assets:** pastas e filenames em inglês `snake_case` (ex: `assets/media/chest/dumbbell_bench_press.mp4`)
- **Banco:** `muscle_group` e `category` armazenam chaves em inglês (`chest`, `back`, `shoulders`, `biceps`, `triceps`, `legs`, `core`, `full_body`; `strength`, `calisthenics`, `both`)
- **UI:** mapa em `src/constants/muscleGroups.ts` traduz chave → label PT-BR (ex: `chest` → "Peito"). Mesma ideia para categoria.
- **Correção de typo:** a pasta `assets/media/chess/` (adicionada antes desta decisão) deve ser renomeada para `assets/media/chest/` como primeiro passo da implementação.

## Arquitetura

```
App
├── Navigation (Bottom Tabs)
│   ├── Tab "Exercícios"  [FUNCIONAL]
│   ├── Tab "Treinos"     [placeholder "em breve"]
│   ├── Tab "Histórico"   [placeholder]
│   └── Tab "Música"      [placeholder]
├── State (Zustand)
│   └── useExerciseStore — lista em memória, filtros ativos, termo de busca
├── Data
│   ├── SQLite (op-sqlite) — schema completo criado via migração v1
│   └── Assets bundle — assets/media/<grupo>/<arquivo>.mp4
└── Theme — dark, paleta do spec
```

## Fluxo de dados

1. **Primeira execução:** migrações v1 criam todas as tabelas do spec → seed popula `exercises` com ~60 linhas.
2. **Execuções subsequentes:** app carrega exercícios do SQLite para o `useExerciseStore` na inicialização.
3. **Filtros e busca:** aplicados em memória sobre o array do store (lista pequena, sem necessidade de requery).
4. **Exercício sem MP4 disponível:** renderiza `ExerciseMedia` com placeholder (ícone + nome), sem erro.

## Modelo de dados

Todas as tabelas listadas no `CLAUDE.md` são criadas já na migração v1, mesmo que apenas `exercises` seja usada nesta fase. Isso evita migrações adicionais nas próximas fases.

Mudança em relação ao spec: `exercises.gif_filename` → `exercises.media_filename`.

### Sistema de migrações

- Tabela `schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER)`
- Array de migrações ordenadas em `database/migrations.ts`
- Na inicialização: lê versão atual, aplica pendentes em ordem, dentro de transação

## Estrutura de pastas (subset entregue nesta fase)

```
treino.app/
├── android/                              [gerado pelo RN CLI]
├── assets/
│   └── media/                            [MP4s organizados por grupo muscular, em inglês]
│       ├── chest/dumbbell_bench_press.mp4
│       ├── back/dumbbell_kneeling_single_arm_row.mp4
│       └── ...
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── EmptyState.tsx
│   │   └── exercise/
│   │       ├── ExerciseCard.tsx
│   │       ├── ExerciseMedia.tsx
│   │       ├── MuscleGroupFilter.tsx
│   │       └── CategoryFilter.tsx
│   ├── screens/
│   │   ├── exercise/
│   │   │   ├── ExerciseLibraryScreen.tsx
│   │   │   └── ExerciseDetailScreen.tsx
│   │   └── placeholders/
│   │       └── ComingSoonScreen.tsx      [reutilizada por Treinos/Histórico/Música]
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── ExerciseStack.tsx
│   ├── store/
│   │   └── useExerciseStore.ts
│   ├── database/
│   │   ├── connection.ts
│   │   ├── migrations.ts
│   │   ├── repositories/
│   │   │   └── exerciseRepository.ts
│   │   ├── seeds/
│   │   │   └── defaultExercises.ts
│   │   └── mediaResolver.ts              [mapa filename → require(asset)]
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   ├── types/
│   │   └── exercise.ts
│   ├── utils/
│   │   └── generateId.ts                 [UUID v4]
│   ├── constants/
│   │   └── muscleGroups.ts
│   └── App.tsx
├── __tests__/
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## Componentes

### Common

- **`Button`** — variantes: `primary` (accent), `secondary` (surface), `ghost` (sem fundo); tamanho mínimo 48dp; feedback tátil via `Pressable`.
- **`Card`** — container com `surface` + bordas arredondadas + padding padrão.
- **`Input`** — TextInput estilizado; label opcional; variantes numérica e texto.
- **`Badge`** — chip pequeno para grupo muscular/categoria.
- **`EmptyState`** — ícone + título + subtítulo, para listas vazias ou placeholders.

### Exercise

- **`ExerciseCard`** — linha da lista: thumbnail (via `ExerciseMedia` em modo paused no primeiro frame), nome, badge do grupo muscular.
- **`ExerciseMedia`** — wrapper de `react-native-video`. Props: `filename`, `loop` (default true), `paused` (default false), `muted` (sempre true). Se `filename` não existe no resolver → renderiza placeholder (ícone + nome).
- **`MuscleGroupFilter`** — `ScrollView` horizontal de chips (Todos, Peito, Costas, Ombros, Bíceps, Tríceps, Pernas, Core, Corpo Inteiro). Estado controlado.
- **`CategoryFilter`** — três botões toggle (Todos / Musculação / Calistenia). Estado controlado.

## Telas

- **`ExerciseLibraryScreen`**
  - Header com barra de busca
  - `MuscleGroupFilter` + `CategoryFilter` logo abaixo
  - `FlatList` de `ExerciseCard`, filtrada em memória
  - Tap no card → navega para `ExerciseDetailScreen` com `exerciseId`

- **`ExerciseDetailScreen`**
  - `ExerciseMedia` grande no topo (loop, ~70% da largura, aspect-ratio 1:1)
  - Nome do exercício (título)
  - Badges: grupo muscular + categoria
  - Texto de instruções
  - Sem botões de ação (read-only nesta fase)

- **`ComingSoonScreen`** — tela única reutilizada pelas tabs não implementadas; mostra `EmptyState` com mensagem "Em breve".

## Media resolver

```typescript
// src/database/mediaResolver.ts
const mediaMap: Record<string, number> = {
  'dumbbell_bench_press.mp4': require('../../assets/media/chest/dumbbell_bench_press.mp4'),
  // ...mantido à mão, sincronizado com assets/media/
};

export function resolveMedia(filename: string | null): number | null {
  if (!filename) return null;
  return mediaMap[filename] ?? null;
}
```

Decisão: mapa mantido à mão nesta fase (lista pequena, varredura dinâmica não é suportada pelo bundler do React Native). Se o arquivo não está no mapa, `ExerciseMedia` cai no placeholder.

## Seed data

Arquivo `database/seeds/defaultExercises.ts` com lista estática de ~60 exercícios. Aplicado apenas quando a tabela `exercises` está vazia (primeira execução ou após reinstalação). Cada entrada:

```typescript
{
  id: string;           // UUID v4 estável (gerado uma vez e fixado no arquivo)
  name: string;         // PT-BR, ex: "Supino Reto com Halteres"
  muscle_group: string; // chave em inglês (chest, back, shoulders, ...)
  category: string;     // "strength" | "calisthenics" | "both"
  media_filename: string; // "dumbbell_bench_press.mp4"
  instructions: string; // 2-4 frases em PT-BR
}
```

Cobertura alvo:
- Peito (6), Costas (6), Ombros (5), Bíceps (5), Tríceps (5), Pernas (7), Core (5) — 39 de musculação
- Calistenia: empurrar (5), puxar (4), pernas (5), core (5), corpo inteiro (4) — 23 de calistenia
- **Total: ~62 exercícios**

## Tema e paleta

Conforme `CLAUDE.md`. Centralizado em `src/theme/` e consumido via hook `useTheme()` (wrapper simples em torno de um objeto estático — sem troca dinâmica de tema nesta fase).

## Testes

Unitários com Jest (default do RN CLI):

- **`exerciseRepository`** — CRUD básico contra SQLite em memória
- **`generateId`** — formato UUID v4
- **`mediaResolver`** — retorna `null` para filename desconhecido; retorna valor numérico para conhecido
- **`useExerciseStore`** — aplicação de filtros + busca em dataset fixo

Testes de UI (snapshot ou integração) ficam fora desta fase.

## Erros e estados de borda

- **SQLite falha ao abrir:** exibe tela de erro fatal com botão "Reiniciar app"; loga no console
- **Seed falha:** idem (estado do app inválido sem exercícios)
- **MP4 ausente:** `ExerciseMedia` renderiza placeholder; não é erro
- **Lista vazia após filtro:** `EmptyState` com mensagem "Nenhum exercício encontrado"

## Known Issues

### Reprodução de vídeo não funciona nesta fase

**Sintoma:** Na tela de detalhe do exercício, o vídeo (`MP4`) não é renderizado visualmente. A view fica com o fundo do placeholder (`colors.primaryLight`).

**Causa raiz:** `react-native-video@6.19.1` não tem suporte completo a Fabric (new architecture). React Native 0.85.1 torna a new arch obrigatória — o flag `newArchEnabled=false` é ignorado. Sem codegen adequado, o ViewManager da lib emite warning `Could not find generated setter for class com.brentvatne.exoplayer.ReactExoplayerViewManager` e props (inclusive `style` com dimensões) não chegam na view nativa → view renderiza com tamanho 0, invisível. Confirmado inclusive que `onLoad` e `onReadyForDisplay` disparam (player processa o vídeo), mas `controls={true}` também não aparece.

**Mitigação nesta fase:** `ExerciseMedia` passa a renderizar apenas um **placeholder com ícone** (sem tentar carregar `<Video>`), evitando overhead e confusão visual. Exercícios com MP4 disponível usam ícone `play-circle-outline`; sem MP4 usam `fitness-center`.

**Resolução planejada:** plano dedicado `docs/superpowers/plans/2026-XX-XX-fix-video-playback.md` — opções: (A) migrar para `react-native-video@7` quando estabilizar (atualmente em beta), (B) downgrade controlado para RN 0.76 (que suporta arquitetura antiga). Executar após v7 estabilizar OU como parte da Fase 4 (Execução), onde vídeo em loop durante séries é mais útil.

## Entregáveis ao fim da fase

1. Projeto React Native CLI inicializado, rodando em device físico e emulador
2. Git inicializado com `.gitignore` adequado
3. Android Studio configurado, build de debug funcionando
4. Tema escuro aplicado, componentes base funcionais
5. Bottom Tab Navigator com 4 tabs; 3 como placeholder
6. SQLite + schema completo + seed de ~62 exercícios
7. Tab "Exercícios" funcional: lista, busca, filtros, tela de detalhe com vídeo em loop
8. MP4s organizados em `assets/media/<grupo>/` (os que o usuário já tem; resto com placeholder)
9. Testes unitários rodando via `pnpm test`

## Próximas fases (referência, fora deste escopo)

- **Fase 3:** CRUD de treinos (usa biblioteca desta fase)
- **Fase 4:** Tela de execução (timer, séries, cronômetro, keep-awake)
- **Fase 5:** Histórico e gráficos de evolução
- **Fase 6:** Player de música
- **Fase 7:** APK assinado de release
