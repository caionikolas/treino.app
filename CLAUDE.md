# CLAUDE.md — App de Treinos Pessoal (Treino.app)

## Visão Geral do Projeto

App de treinos pessoal para Android chamado Treino.app, feito em React Native. O app é de uso exclusivo do desenvolvedor (não será publicado em lojas). Permite criar treinos personalizados de musculação e calistenia, executá-los com cronômetro e controle de descanso, acompanhar evolução de carga/repetições ao longo do tempo, e ouvir músicas locais do celular durante o treino. Tudo funciona 100% offline.

---

## Arquitetura

```
┌──────────────────────────────────────────┐
│              React Native App            │
├──────────────────────────────────────────┤
│  UI Layer (Screens + Components)         │
│  ├── Tela de Treinos (CRUD)             │
│  ├── Tela de Execução (timer/descanso)  │
│  ├── Tela de Histórico (evolução)       │
│  ├── Tela de Exercícios (biblioteca)    │
│  └── Player de Música                    │
├──────────────────────────────────────────┤
│  State Management (Zustand ou Context)   │
├──────────────────────────────────────────┤
│  SQLite (banco local offline)            │
│  Arquivos de GIF (bundled no app)        │
│  Biblioteca de música do Android         │
└──────────────────────────────────────────┘
```

### Princípios

- **100% offline** — nenhuma dependência de internet
- **Uso pessoal** — sem login, sem backend remoto, sem sincronização
- **Instalação via APK** — gerar APK assinado e instalar direto no celular
- **Código em inglês, interface em português brasileiro**

---

## Stack Técnica

| Camada              | Tecnologia                                | Justificativa                                          |
| ------------------- | ----------------------------------------- | ------------------------------------------------------ |
| Framework           | React Native (CLI, sem Expo)              | Acesso nativo a áudio e filesystem                     |
| Linguagem           | TypeScript                                | Tipagem, menos bugs, melhor DX                         |
| Navegação           | React Navigation                          | Padrão do ecossistema, performático                    |
| Banco de dados      | react-native-sqlite-storage ou op-sqlite  | Offline, relacional, performático para queries          |
| Estado global       | Zustand                                   | Leve, simples, sem boilerplate                         |
| Música              | react-native-track-player                 | Player robusto, background playback, controles de lock screen |
| Acesso a mídia      | react-native-media-library ou CameraRoll  | Listar músicas do dispositivo                          |
| GIFs                | react-native-fast-image                   | Cache e performance para GIFs de exercícios            |
| Timer               | Custom hook com useRef + setInterval      | Controle preciso de cronômetro e descanso              |
| Gráficos            | react-native-chart-kit ou Victory Native  | Gráficos de evolução de carga                          |
| Ícones              | react-native-vector-icons (MaterialIcons) | Ícones consistentes                                    |
| Build               | Gradle (Android)                          | Gerar APK assinado para instalação direta              |

---

## Modelo de Dados (SQLite)

### Tabela `exercises` (biblioteca de exercícios)

```sql
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,            -- "Supino Reto"
  muscle_group TEXT NOT NULL,    -- "Peito"
  category TEXT NOT NULL,        -- "musculacao" | "calistenia" | "ambos"
  gif_filename TEXT,             -- "supino_reto.gif" (referência ao asset local)
  instructions TEXT,             -- Descrição textual da execução
  created_at INTEGER NOT NULL    -- timestamp
);
```

### Tabela `workouts` (treinos montados pelo usuário)

```sql
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,            -- "Treino A - Peito e Tríceps"
  description TEXT,              -- Notas opcionais
  color TEXT,                    -- Cor do card (ex: "#E53E3E")
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Tabela `workout_exercises` (exercícios dentro de um treino)

```sql
CREATE TABLE workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL,  -- Ordem do exercício no treino
  sets INTEGER NOT NULL,         -- Número de séries (ex: 4)
  reps TEXT NOT NULL,            -- Repetições alvo (ex: "12" ou "8-12" ou "até falha")
  rest_seconds INTEGER NOT NULL, -- Descanso entre séries em segundos (ex: 90)
  notes TEXT                     -- Observações (ex: "pegar pesado", "unilateral")
);
```

### Tabela `workout_sessions` (treinos realizados)

```sql
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id),
  started_at INTEGER NOT NULL,   -- timestamp início
  finished_at INTEGER,           -- timestamp fim (NULL se abandonado)
  duration_seconds INTEGER,      -- duração total
  notes TEXT                     -- Observações pós-treino
);
```

### Tabela `session_sets` (séries realizadas com carga real)

```sql
CREATE TABLE session_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,   -- 1, 2, 3, 4...
  reps INTEGER NOT NULL,         -- Repetições realizadas
  weight_kg REAL,                -- Carga em kg (NULL para calistenia)
  completed INTEGER NOT NULL DEFAULT 1, -- 0 = pulou, 1 = completou
  notes TEXT
);
```

### Tabela `playlists` (playlists de treino)

```sql
CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,            -- "Playlist Pesada"
  created_at INTEGER NOT NULL
);
```

### Tabela `playlist_tracks` (músicas de uma playlist)

```sql
CREATE TABLE playlist_tracks (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_uri TEXT NOT NULL,       -- URI do arquivo no dispositivo
  track_name TEXT NOT NULL,
  artist_name TEXT,
  duration_ms INTEGER,
  order_index INTEGER NOT NULL
);
```

---

## Funcionalidades

### 1. Biblioteca de Exercícios

- [ ] Lista de exercícios pré-cadastrados com GIF demonstrativo
- [ ] Filtro por grupo muscular (Peito, Costas, Ombros, Bíceps, Tríceps, Pernas, Core, Corpo Inteiro)
- [ ] Filtro por categoria (Musculação, Calistenia, Ambos)
- [ ] Busca por nome do exercício
- [ ] Tela de detalhe com GIF em loop + instrução textual de execução
- [ ] Possibilidade de adicionar exercícios personalizados (sem GIF ou com foto da galeria)

#### GIFs de exercícios

- Os GIFs devem ser incluídos como assets locais no bundle do app (pasta `assets/gifs/`)
- Formato: GIF animado, resolução ~300x300px, loop infinito, fundo transparente ou neutro
- Nomeação: `snake_case` do nome do exercício (ex: `supino_reto.gif`, `agachamento_livre.gif`)
- Fontes gratuitas sugeridas: [MuscleWiki](https://musclewiki.com), [ExerciseDB API](https://exercisedb.io) (baixar e embutir localmente)
- Mínimo sugerido para MVP: 50-80 exercícios cobrindo os grupos musculares principais

### 2. Criação e Gerenciamento de Treinos

- [ ] Criar novo treino com nome e cor personalizada
- [ ] Adicionar exercícios da biblioteca ao treino
- [ ] Definir para cada exercício: séries, repetições alvo, tempo de descanso
- [ ] Reordenar exercícios via drag-and-drop
- [ ] Editar treino existente
- [ ] Duplicar treino
- [ ] Excluir treino (com confirmação)
- [ ] Tela principal: lista de treinos em cards coloridos

### 3. Execução do Treino (tela principal durante o treino)

Esta é a tela mais importante do app. Deve ser clara, com elementos grandes (fácil de tocar com mãos suadas na academia).

- [ ] Exibição do exercício atual: nome + GIF + séries/reps alvo
- [ ] Input de carga (kg) e repetições realizadas para cada série
- [ ] Botão grande "Concluir Série" que inicia automaticamente o timer de descanso
- [ ] **Timer de descanso** com contagem regressiva visual (circular ou barra)
  - Som/vibração ao terminar o descanso
  - Opção de pular descanso
  - Opção de adicionar +30s / -30s ao descanso
- [ ] **Cronômetro geral do treino** (tempo total correndo no topo)
- [ ] Navegação entre exercícios (anterior/próximo) com swipe ou botões
- [ ] Botão de pular exercício
- [ ] Resumo ao finalizar treino (duração total, volume total em kg, exercícios completados)
- [ ] Manter tela ligada durante o treino (`KeepAwake`)

#### Layout da Tela de Execução

```
┌─────────────────────────────────┐
│  ⏱️ 00:45:12     Treino A    ✕  │  ← Cronômetro geral + nome + sair
├─────────────────────────────────┤
│                                 │
│        [GIF do exercício]       │
│                                 │
│     Supino Reto com Barra       │
│     Série 2 de 4 • 12 reps     │
│                                 │
├─────────────────────────────────┤
│  Carga: [  80  ] kg             │
│  Reps:  [  12  ]                │
│                                 │
│  ┌─────────────────────────┐    │
│  │   ✅ CONCLUIR SÉRIE      │    │  ← Botão grande, fácil de apertar
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  ◀ Anterior    2/6    Próximo ▶ │  ← Navegação entre exercícios
├─────────────────────────────────┤
│  🎵 Nome da Música  ▶ ▐▐ ▶▶    │  ← Mini player fixo
└─────────────────────────────────┘

Estado: Timer de Descanso ativo
┌─────────────────────────────────┐
│                                 │
│         ┌───────────┐           │
│         │           │           │
│         │   01:30   │           │  ← Contagem regressiva circular
│         │ descanso  │           │
│         └───────────┘           │
│                                 │
│    [-30s]   Pular   [+30s]      │
│                                 │
│  Próximo: Supino Inclinado      │
│  4x10 • 70kg (última vez)       │  ← Preview do próximo exercício
│                                 │
└─────────────────────────────────┘
```

### 4. Histórico e Evolução

- [ ] Lista de treinos realizados por data (calendário ou lista)
- [ ] Detalhe de cada sessão: exercícios, séries, cargas, duração
- [ ] **Gráfico de evolução por exercício**: eixo X = data, eixo Y = carga máxima ou volume total
- [ ] **Recordes pessoais (PRs)**: destaque quando bater carga máxima em um exercício
- [ ] Estatísticas gerais: total de treinos no mês, frequência semanal, volume total acumulado
- [ ] Filtro por período (última semana, mês, 3 meses, 6 meses, 1 ano, tudo)

#### Tela de Evolução (exemplo)

```
┌─────────────────────────────────┐
│  📊 Supino Reto                  │
│                                 │
│  Recorde: 100kg x 6 (12/mar)   │
│                                 │
│  kg                             │
│  100 ┤          ●               │
│   90 ┤      ●       ●   ●      │
│   80 ┤  ●                  ●   │
│   70 ┤●                        │
│      └──┬──┬──┬──┬──┬──┬──┬──  │
│        jan fev mar abr mai jun  │
│                                 │
│  📈 Tendência: +18% em 6 meses  │
└─────────────────────────────────┘
```

### 5. Player de Música

- [ ] Acessar a biblioteca de música do Android (MediaStore)
- [ ] Listar todas as músicas disponíveis no dispositivo, agrupadas por artista/álbum
- [ ] Criar playlists de treino dentro do app
- [ ] Adicionar/remover músicas das playlists
- [ ] Player com controles: play, pause, próxima, anterior, shuffle, repeat
- [ ] **Mini player fixo** na tela de execução do treino (não atrapalha o treino)
- [ ] Playback em background (continua tocando se sair da tela)
- [ ] Controles na lock screen e na barra de notificação do Android
- [ ] Iniciar playlist automaticamente ao começar um treino (configurável)

#### Permissões Android necessárias

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />       <!-- Android 13+ -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />  <!-- Android 12 e abaixo -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />     <!-- Background playback -->
<uses-permission android:name="android.permission.WAKE_LOCK" />             <!-- Manter tela ligada -->
<uses-permission android:name="android.permission.VIBRATE" />               <!-- Timer de descanso -->
```

---

## Navegação (React Navigation)

```
BottomTabNavigator
├── Tab "Treinos"
│   ├── WorkoutListScreen        → Lista de treinos criados
│   ├── WorkoutFormScreen        → Criar/editar treino
│   ├── ExercisePickerScreen     → Selecionar exercícios para o treino
│   └── WorkoutExecutionScreen   → Tela de execução (stack modal, fullscreen)
│       └── RestTimerModal       → Timer de descanso (overlay)
├── Tab "Exercícios"
│   ├── ExerciseLibraryScreen    → Biblioteca com filtros
│   └── ExerciseDetailScreen     → Detalhe com GIF
├── Tab "Histórico"
│   ├── HistoryListScreen        → Lista de sessões realizadas
│   ├── SessionDetailScreen      → Detalhe de uma sessão
│   └── ProgressChartScreen      → Gráficos de evolução por exercício
└── Tab "Música"
    ├── MusicLibraryScreen       → Músicas do dispositivo
    ├── PlaylistListScreen       → Playlists de treino
    └── PlaylistDetailScreen     → Músicas de uma playlist
```

---

## Estrutura de Pastas

```
workout-app/
├── android/                      # Projeto Android nativo
├── assets/
│   └── gifs/                     # GIFs de exercícios (bundled)
│       ├── supino_reto.gif
│       ├── agachamento_livre.gif
│       └── ...
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── workout/
│   │   │   ├── WorkoutCard.tsx          # Card de treino na lista
│   │   │   ├── ExerciseItem.tsx         # Item de exercício dentro do treino
│   │   │   ├── SetRow.tsx              # Linha de série (carga + reps input)
│   │   │   ├── RestTimer.tsx           # Timer circular de descanso
│   │   │   ├── WorkoutTimer.tsx        # Cronômetro geral do treino
│   │   │   └── WorkoutSummary.tsx      # Resumo pós-treino
│   │   ├── exercise/
│   │   │   ├── ExerciseCard.tsx        # Card na biblioteca
│   │   │   ├── ExerciseGif.tsx         # Wrapper para exibição do GIF
│   │   │   └── MuscleGroupFilter.tsx   # Filtro por grupo muscular
│   │   ├── history/
│   │   │   ├── SessionCard.tsx         # Card de sessão no histórico
│   │   │   ├── ProgressChart.tsx       # Gráfico de evolução
│   │   │   └── PersonalRecord.tsx      # Badge de recorde pessoal
│   │   └── music/
│   │       ├── MiniPlayer.tsx          # Player fixo na tela de execução
│   │       ├── TrackItem.tsx           # Item de música na lista
│   │       └── PlayerControls.tsx      # Controles completos do player
│   ├── screens/
│   │   ├── workout/
│   │   │   ├── WorkoutListScreen.tsx
│   │   │   ├── WorkoutFormScreen.tsx
│   │   │   ├── ExercisePickerScreen.tsx
│   │   │   └── WorkoutExecutionScreen.tsx
│   │   ├── exercise/
│   │   │   ├── ExerciseLibraryScreen.tsx
│   │   │   └── ExerciseDetailScreen.tsx
│   │   ├── history/
│   │   │   ├── HistoryListScreen.tsx
│   │   │   ├── SessionDetailScreen.tsx
│   │   │   └── ProgressChartScreen.tsx
│   │   └── music/
│   │       ├── MusicLibraryScreen.tsx
│   │       ├── PlaylistListScreen.tsx
│   │       └── PlaylistDetailScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── WorkoutStack.tsx
│   │   ├── ExerciseStack.tsx
│   │   ├── HistoryStack.tsx
│   │   └── MusicStack.tsx
│   ├── store/
│   │   ├── useWorkoutStore.ts          # Zustand store para treinos
│   │   ├── useExerciseStore.ts         # Zustand store para exercícios
│   │   ├── useSessionStore.ts          # Zustand store para execução ativa
│   │   ├── useHistoryStore.ts          # Zustand store para histórico
│   │   └── useMusicStore.ts            # Zustand store para player/playlists
│   ├── database/
│   │   ├── connection.ts               # Conexão SQLite
│   │   ├── migrations.ts               # Criação de tabelas e migrações
│   │   ├── repositories/
│   │   │   ├── exerciseRepository.ts
│   │   │   ├── workoutRepository.ts
│   │   │   ├── sessionRepository.ts
│   │   │   └── playlistRepository.ts
│   │   └── seeds/
│   │       └── defaultExercises.ts     # Exercícios pré-cadastrados
│   ├── services/
│   │   ├── musicService.ts             # Interface com react-native-track-player
│   │   ├── mediaLibraryService.ts      # Leitura da biblioteca de mídia do Android
│   │   └── notificationService.ts      # Notificações do timer
│   ├── hooks/
│   │   ├── useTimer.ts                 # Hook de cronômetro
│   │   ├── useRestTimer.ts             # Hook de timer de descanso com vibração
│   │   ├── useExerciseProgress.ts      # Hook para dados de evolução
│   │   └── useKeepAwake.ts             # Hook para manter tela ligada
│   ├── types/
│   │   ├── exercise.ts
│   │   ├── workout.ts
│   │   ├── session.ts
│   │   └── music.ts
│   ├── utils/
│   │   ├── formatTime.ts              # "01:30", "45:12"
│   │   ├── formatWeight.ts            # "80kg", "12.5kg"
│   │   ├── calculateVolume.ts         # peso × reps × sets
│   │   └── generateId.ts             # UUID generator
│   ├── constants/
│   │   ├── muscleGroups.ts            # Lista de grupos musculares
│   │   ├── colors.ts                  # Paleta de cores do app
│   │   └── defaults.ts               # Valores padrão (descanso, séries, etc.)
│   └── App.tsx
├── __tests__/                         # Testes unitários
├── .env
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Design e UX

### Paleta de cores sugerida

| Token                | Hex       | Uso                                    |
| -------------------- | --------- | -------------------------------------- |
| `primary`            | `#1A1A2E` | Fundo principal, headers               |
| `primaryLight`       | `#16213E` | Cards, superfícies elevadas            |
| `accent`             | `#E94560` | Botões primários, destaque, timer      |
| `accentSecondary`    | `#0F3460` | Botões secundários, ícones ativos      |
| `success`            | `#00C851` | Série concluída, recorde pessoal       |
| `warning`            | `#FFBB33` | Alertas, série pulada                  |
| `textPrimary`        | `#FFFFFF` | Texto principal (tema escuro)          |
| `textSecondary`      | `#8E8E93` | Texto secundário, labels               |
| `background`         | `#0A0A14` | Fundo geral do app                     |
| `surface`            | `#1A1A2E` | Cards e containers                     |

> **Tema escuro por padrão** — apps de treino são usados na academia, ambientes com luz variada. Tema escuro reduz brilho e poupa bateria em AMOLED.

### Tipografia

- Títulos: **Bold, 20-24sp** (nativo do sistema)
- Corpo: **Regular, 16sp**
- Números grandes (timer, carga): **Monospace Bold, 48-64sp**
- Usar fonte do sistema (Roboto no Android) para máxima legibilidade

### UX na academia

- **Botões grandes** (mínimo 48dp de área tocável) — mãos suadas, pouca paciência
- **Poucos passos** para registrar uma série — idealmente: digitar carga → digitar reps → apertar "Concluir"
- **Feedback tátil** — vibração ao concluir série e ao terminar descanso
- **Tela sempre ligada** durante execução de treino
- **Gesto de swipe** para navegar entre exercícios

---

## Regras de Implementação

1. **Código em inglês, interface em português brasileiro** — variáveis, funções, componentes e comentários em inglês. Todo texto visível ao usuário em PT-BR
2. **Offline first** — o app nunca deve tentar acessar a internet. Sem analytics, sem crash reporting, sem nada online
3. **SQLite como única fonte de verdade** — todo dado persiste no banco local
4. **Performance** — lazy loading de GIFs, listas com FlatList (não ScrollView), evitar re-renders desnecessários
5. **Sem autenticação** — app pessoal, sem login
6. **Migrações de banco** — usar sistema de versão para evolução do schema SQLite
7. **Sem Expo** — usar React Native CLI para acesso nativo completo (áudio, filesystem, permissões)
8. **Mínimo de dependências** — usar libs consolidadas, evitar pacotes abandonados

---

## Build e Instalação (sem Play Store)

### Gerar APK de debug (desenvolvimento)

```bash
cd android
./gradlew assembleDebug
# APK em: android/app/build/outputs/apk/debug/app-debug.apk
```

### Gerar APK de release (produção)

```bash
# 1. Gerar keystore (apenas uma vez)
keytool -genkeypair -v -storetype PKCS12 -keystore workout-app.keystore \
  -alias workout-app -keyalg RSA -keysize 2048 -validity 10000

# 2. Configurar gradle.properties com a keystore

# 3. Gerar APK assinado
cd android
./gradlew assembleRelease
# APK em: android/app/build/outputs/apk/release/app-release.apk
```

### Instalar no celular

```bash
adb install app-release.apk
# Ou: enviar o APK por WhatsApp/Telegram/Drive e abrir no celular
```

---

## Exercícios Pré-cadastrados (Seed Data)

O app deve vir com uma biblioteca inicial de exercícios comuns. Abaixo os mínimos por grupo muscular:

### Musculação

| Grupo Muscular | Exercícios                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------- |
| Peito          | Supino reto, Supino inclinado, Supino declinado, Crucifixo, Crossover, Flexão                |
| Costas         | Puxada frontal, Remada curvada, Remada unilateral, Pulldown, Remada cavalinho                |
| Ombros         | Desenvolvimento militar, Elevação lateral, Elevação frontal, Face pull, Arnold press         |
| Bíceps         | Rosca direta, Rosca alternada, Rosca martelo, Rosca concentrada, Rosca Scott                |
| Tríceps        | Tríceps pulley, Tríceps testa, Tríceps francês, Mergulho, Tríceps coice                     |
| Pernas         | Agachamento livre, Leg press, Cadeira extensora, Mesa flexora, Stiff, Panturrilha            |
| Core           | Abdominal crunch, Prancha, Prancha lateral, Elevação de pernas, Russian twist                |

### Calistenia

| Grupo Muscular | Exercícios                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------- |
| Empurrar       | Flexão, Flexão diamante, Flexão declinada, Pike push-up, Dips em paralelas                  |
| Puxar          | Barra fixa, Barra supinada, Australian pull-up, Muscle up (avançado)                         |
| Pernas         | Agachamento pistol, Agachamento búlgaro, Lunge, Step-up, Wall sit                            |
| Core           | L-sit, Dragon flag, Hollow body hold, Hanging leg raise, Ab wheel                            |
| Corpo inteiro  | Burpee, Mountain climber, Bear crawl, Handstand (parada de mão)                             |

---

## Critérios de Aceite

### Biblioteca de exercícios
- [ ] Pelo menos 50 exercícios pré-cadastrados com GIF
- [ ] Filtro por grupo muscular e categoria funciona
- [ ] Busca por nome funciona
- [ ] Possível adicionar exercício customizado

### Criação de treino
- [ ] Criar, editar, duplicar e excluir treinos
- [ ] Adicionar e reordenar exercícios no treino
- [ ] Configurar séries, reps e tempo de descanso por exercício

### Execução do treino
- [ ] Cronômetro geral funciona durante todo o treino
- [ ] Timer de descanso com contagem regressiva, vibração e som ao final
- [ ] Input de carga e reps funcional e rápido
- [ ] GIF do exercício visível durante execução
- [ ] Tela não apaga durante o treino
- [ ] Resumo exibido ao finalizar

### Histórico e evolução
- [ ] Sessões salvas com todas as séries e cargas
- [ ] Gráfico de evolução por exercício mostra progressão de carga
- [ ] Recordes pessoais destacados
- [ ] Filtro por período funciona

### Música
- [ ] Lista músicas do dispositivo Android
- [ ] Criar e gerenciar playlists de treino
- [ ] Player com play, pause, next, previous, shuffle
- [ ] Mini player visível durante execução do treino
- [ ] Continua tocando em background e na lock screen

### Geral
- [ ] App funciona 100% offline
- [ ] APK gerado e instalável em Android
- [ ] Código em inglês, interface em português
- [ ] Performance fluida (sem travamentos em listas grandes)
- [ ] Feedback tátil (vibração) nos momentos certos
