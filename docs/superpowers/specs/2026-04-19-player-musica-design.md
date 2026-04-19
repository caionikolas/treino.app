# Player de Música + Notificação do Treino (Fase 6) — Design

**Data:** 2026-04-19
**Escopo:** Player de música integrado ao app — lê biblioteca local do Android (MediaStore), permite criar playlists, reproduz com background + controles na lock screen; mini player fixo na tela de execução; notificação persistente do treino com exercício atual + tempo; modal pra escolher playlist ao iniciar treino.
**Referência:** `CLAUDE.md` seção "Player de Música" + melhorias de UX discutidas (notificação do treino, mini player, auto-start).

## Objetivo

Música se integra à experiência de treino: ao iniciar um treino, usuário escolhe uma playlist; durante a execução, mini player fixo permite controlar a música sem sair da tela; Android mostra duas notificações (música + treino) que funcionam com tela bloqueada.

## Fora de escopo

- Streaming de música (Spotify, YouTube, etc). App só toca arquivos locais já no celular.
- Download de música dentro do app.
- Equalizer, efeitos de áudio.
- Notificação de treino interativa (só info, sem botões de controle).
- Crossfade entre músicas.
- Letras (lyrics) ou metadados extras.

## Decisões confirmadas

| Tópico | Decisão |
|---|---|
| Fonte das músicas | MediaStore do Android (MP3/M4A/etc já no celular). Não armazena no app. |
| Playlists | CRUD no app, persistidas em SQLite (tabelas `playlists` + `playlist_tracks` já criadas na migration v1). |
| Player | play, pause, próxima, anterior, shuffle, repeat (off/one/all). Controles no app e na notificação de mídia. |
| Background playback | Sim, obrigatório. |
| Lock screen controls | Sim, via media session do Android. |
| Biblioteca UI | Agrupada por "Tudo" / "Artistas" / "Álbuns" (toggle). Pelo spec CLAUDE.md. |
| Mini player | Fixo no rodapé da `WorkoutExecutionScreen`. |
| Auto-start | Modal "Qual playlist?" ao iniciar treino (inclui opção "Nenhuma"). |
| Notificação do treino | Simples: "Supino Reto • 15:32" (exercício + tempo). Sem botões interativos. |

## Stack técnica

| Componente | Lib/Tecnologia | Justificativa |
|---|---|---|
| Player engine + background + notificação de mídia + lock screen | `react-native-track-player` | Padrão do ecossistema, já gerencia foreground service + media session + controles na lock screen |
| Acesso ao MediaStore (listar músicas) | Módulo nativo Kotlin custom (~40 linhas) | Controle total, evita deps abandonadas. Padrão já usado no projeto (KeepAwakeModule) |
| Notificação persistente do treino | `@notifee/react-native` (já instalado) | Suporta `ongoing: true` + `asForegroundService: true` |

## Arquitetura

```
MusicStack (substitui ComingSoonScreen na tab Música)
├── MusicLibraryScreen          — toggle Tudo/Artistas/Álbuns + busca + list de músicas ou grupos
├── ArtistDetailScreen          — músicas de um artista
├── AlbumDetailScreen           — músicas de um álbum
├── PlaylistListScreen          — lista de playlists criadas (cards)
├── PlaylistDetailScreen        — nome + lista de tracks + botão "▶ Reproduzir"
├── PlaylistFormScreen          — criar/editar (nome + adicionar músicas)
└── PlayerFullScreen            — (opcional) tela cheia do player atual (arte grande + controles + queue)

Integração com execução:
├── WorkoutPreviewScreen → modal "Escolha playlist" antes de iniciar
├── WorkoutExecutionScreen → <MiniPlayer /> no rodapé
└── WorkoutExecutionScreen → chama notificationService.showWorkoutOngoing() / update() / cancel()

Stores (Zustand):
├── useMusicLibraryStore        — lista de Tracks do device (cache em memória)
├── usePlaylistStore            — playlists resumidas + CRUD via repository
└── usePlayerStore              — state do player: currentTrack, queue, index, playing, shuffle, repeat
                                  sincronizado via track-player event listeners

Repository:
└── playlistRepository          — NOVO: CRUD em playlists + playlist_tracks

Native modules:
└── MusicLibraryModule.kt       — queryAudio(): Array<TrackRaw>
                                  (ContentResolver query ao MediaStore.Audio.Media)

Services:
└── trackPlayerService.ts       — setup do track-player (capabilities, eventos)
└── notificationService.ts      — expandir com showWorkoutOngoing / updateWorkoutOngoing / cancelWorkoutOngoing
```

## Modelo de dados

Tabelas `playlists` e `playlist_tracks` já existem (migration v1). Sem nova migration.

- `playlists.id` UUID, `name`, `created_at`
- `playlist_tracks.id`, `playlist_id` (FK cascade), `track_uri` (guarda a URI do Android, ex: `content://media/external/audio/media/123`), `track_name`, `artist_name`, `duration_ms`, `order_index`

## Tipos

```typescript
// src/types/music.ts
export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  artworkUri: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackUri: string;
  trackName: string;
  artistName: string | null;
  durationMs: number | null;
  orderIndex: number;
}

export interface PlaylistWithCount {
  id: string;
  name: string;
  trackCount: number;
  createdAt: number;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerSnapshot {
  currentTrack: Track | null;
  queueLength: number;
  queueIndex: number;
  playing: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  positionMs: number;   // atualizado via poll
}
```

## Permissões Android adicionais

Adicionar em `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

## Fluxo de permissão

1. Ao abrir pela 1ª vez a tab Música: se `Platform.Version >= 33`, checa `PermissionsAndroid.check(READ_MEDIA_AUDIO)`; se falso, chama `request`.
2. Se usuário nega: mostra `EmptyState` "Permissão de música negada. Abra configurações do app pra permitir." com botão "Abrir configurações" que chama `Linking.openSettings()`.
3. Se concedida: `musicStore.loadLibrary()` roda, popula cache, tela mostra lista.

## Fluxos principais

### F1. Abrir tab Música
1. `MusicLibraryScreen` monta → verifica permissão
2. Se OK: `musicLibraryStore.loadLibrary()` chama `MusicLibraryModule.queryAudio()` nativo
3. Retorna `Track[]`. Cache em memória (até rebuild/app restart)
4. Toggle "Tudo/Artistas/Álbuns" filtra/agrupa visualmente
5. Tap numa música → player toca imediatamente (queue = a lista que estava visível)

### F2. Criar playlist
1. Tab Música → sub-tab "Playlists" → FAB "+"
2. `PlaylistFormScreen` — campo nome + botão "Adicionar músicas"
3. "Adicionar músicas" abre `MusicLibraryScreen` em **modo seleção múltipla** (checkboxes)
4. Usuário seleciona N músicas, toca "Adicionar" → volta pro form com as músicas listadas
5. Botão "Salvar" → `playlistRepository.insert(playlist, tracks)` + recarrega lista

### F3. Tocar playlist
1. `PlaylistDetailScreen` → botão "▶ Reproduzir" OU tap numa música da lista
2. `playerStore.playQueue(tracks, startIndex)` internamente chama `TrackPlayer.reset()` → `add(tracks)` → `skip(startIndex)` → `play()`
3. Track-player cria/atualiza media session + notificação de mídia automática

### F4. Iniciar treino com música
1. `WorkoutPreviewScreen` → tap "Iniciar treino"
2. **Modal abre:** `SelectPlaylistModal` com lista de playlists + opção "🔇 Sem música"
3. Se escolheu playlist: `playerStore.playQueue(playlistTracks, 0)`
4. Se "Sem música": player não toca
5. `activeSessionStore.start(...)` + `notificationService.showWorkoutOngoing({exerciseName, elapsedSec})`
6. Navega pra `WorkoutExecutionScreen`

### F5. Mini player na execução
1. `WorkoutExecutionScreen` usa `usePlayerStore(s => s.currentTrack)`
2. Se não-null: renderiza `<MiniPlayer />` no rodapé — arte 48dp + título truncado + ícones play/pause/next
3. Tap no mini player abre `PlayerFullScreen` modal (pode ser `navigation.navigate('PlayerFull')`)

### F6. Notificação persistente do treino
1. `showWorkoutOngoing({exerciseName, elapsedSec})` chama notifee:
   ```typescript
   await notifee.displayNotification({
     id: 'workout-ongoing',
     title: 'Treino em andamento',
     body: `${exerciseName} • ${formatMmSs(elapsedSec)}`,
     android: {
       channelId: 'workout-ongoing',
       ongoing: true,
       asForegroundService: true,
       pressAction: { id: 'default' },
       smallIcon: 'ic_notification',
     },
   });
   ```
2. `WorkoutExecutionScreen` usa `useIntervalTimer` pra atualizar a cada ~5s (evitar spam de updates).
3. Ao trocar exercício: update imediato.
4. Ao finalizar/descartar: `notifee.cancelNotification('workout-ongoing')`.

### F7. Sincronização player ↔ UI
1. `trackPlayerService.setupPlayer()` chama `TrackPlayer.registerPlaybackService(...)` no entry point.
2. `usePlayerStore` inicializa com `TrackPlayer.addEventListener(Event.PlaybackState, ...)` e `Event.PlaybackActiveTrackChanged`.
3. Eventos nativos → atualiza state da store → UI re-renderiza.
4. Position (tempo atual da música): poll com `useIntervalTimer(500, ...)` em telas que mostram progresso (PlayerFullScreen). Mini player só mostra título, não precisa de poll.

## Componentes novos

**`src/components/music/`**
- `TrackRow.tsx` — linha de música: arte 48 + título + artista + duração. Modo selectable para picker.
- `AlbumCard.tsx` / `ArtistCard.tsx` — cards nos agrupamentos
- `MiniPlayer.tsx` — barra fixa com arte + título + ícones de controle
- `PlayerControls.tsx` — cluster de botões grandes (prev/play-pause/next) + shuffle/repeat (usado em PlayerFullScreen)

**`src/components/session/`**
- Nenhum novo (usa MiniPlayer de music)

### Estrutura de pastas

```
src/
├── components/
│   └── music/
│       ├── TrackRow.tsx
│       ├── MiniPlayer.tsx
│       ├── PlayerControls.tsx
│       ├── AlbumCard.tsx
│       └── ArtistCard.tsx
├── screens/
│   └── music/
│       ├── MusicLibraryScreen.tsx
│       ├── ArtistDetailScreen.tsx
│       ├── AlbumDetailScreen.tsx
│       ├── PlaylistListScreen.tsx
│       ├── PlaylistDetailScreen.tsx
│       ├── PlaylistFormScreen.tsx
│       └── PlayerFullScreen.tsx
├── navigation/
│   └── MusicStack.tsx
├── store/
│   ├── useMusicLibraryStore.ts
│   ├── usePlaylistStore.ts
│   └── usePlayerStore.ts
├── database/
│   └── repositories/
│       └── playlistRepository.ts
├── services/
│   ├── trackPlayerService.ts         — setup + service handlers
│   └── notificationService.ts        — (expand)
├── types/
│   └── music.ts
└── hooks/
    └── (reuso de existentes)
```

Modificações em telas existentes:
- `WorkoutPreviewScreen.tsx` — mostrar modal de playlist antes de iniciar
- `WorkoutExecutionScreen.tsx` — renderizar `<MiniPlayer />` + chamar `showWorkoutOngoing/updateWorkoutOngoing/cancel`
- `AppNavigator.tsx` — trocar placeholder Música por `MusicStack`

## Repositório

```typescript
// src/database/repositories/playlistRepository.ts
export const playlistRepository = {
  async findAll(): Promise<PlaylistWithCount[]>;
  async findById(id: string): Promise<{ playlist: Playlist; tracks: PlaylistTrack[] } | null>;
  async insert(playlist: Playlist, tracks: PlaylistTrack[]): Promise<void>;
  async update(id: string, playlist: Playlist, tracks: PlaylistTrack[]): Promise<void>;
  async delete(id: string): Promise<void>;
};
```

## Testes

Unitários (Jest):

- **`playlistRepository`** — insert + findById + update (delete-all + insert-all) + delete (cascade), com better-sqlite3 in-memory.
- **`usePlaylistStore`** — save, duplicate, remove (padrão workoutStore).
- **`usePlayerStore`**:
  - `playQueue(tracks, 0)` atualiza currentTrack + queue + playing=true (com `TrackPlayer` mockado)
  - `skipNext()` avança index; se shuffle ativo, pega próximo aleatório
  - `toggleRepeat()` cicla off→one→all→off
- **`notificationService.showWorkoutOngoing`** — chama `notifee.displayNotification` com args corretos (com notifee mockado).

Testes de native module (MusicLibraryModule) e track-player: fora do escopo unitário (requer device).

## Erros e bordas

- **Permissão READ_MEDIA_AUDIO negada:** `MusicLibraryScreen` mostra EmptyState com botão pra abrir configurações.
- **Biblioteca vazia (zero músicas no device):** EmptyState "Nenhuma música encontrada no celular".
- **Playlist vazia:** botão "Reproduzir" desabilitado.
- **Track removida do device após playlist salva:** a URI fica "quebrada"; ao tentar tocar, track-player dispara erro. Handler: pula pra próxima track + toast "Música não encontrada, pulando".
- **Permissão POST_NOTIFICATIONS negada:** notificação do treino não aparece, tudo funciona sem (já tratado via `notifee.requestPermission()`).
- **Lib track-player falha ao registrar service (RN 0.76 incompat):** fallback conhecido → usar `expo-av` com background limitado. Documentar como known issue e continuar (sem controles na lock screen).
- **App matado enquanto treino ativo:** notificação ongoing do treino some; não tentamos recuperar state (sessão é em memória).
- **Mini player enquanto playlist vazia:** não renderiza (só se `currentTrack != null`).

## Integração com WorkoutStack

Necessário registrar `PlayerFullScreen` também em `WorkoutStack` (igual fizemos com WorkoutExecution no HistoryStack) se quisermos que o tap no mini player abra esse screen de dentro da execução. Alternativa: `PlayerFullScreen` vive no `MusicStack` e o mini player faz `navigation.getParent().navigate('Music', { screen: 'PlayerFull' })` via navigation container.

## Entregáveis ao fim da fase

1. Tab Música funcional (substitui placeholder)
2. Biblioteca lista músicas do device agrupadas
3. CRUD de playlists persistido em SQLite
4. Player com play/pause/next/prev/shuffle/repeat
5. Background playback
6. Notificação de mídia na lock screen (controles automáticos via track-player)
7. Mini player fixo na tela de execução do treino
8. Notificação persistente do treino (exercício + tempo, via notifee foreground service)
9. Modal "Escolher playlist" ao iniciar treino
10. Permissões Android adicionadas e solicitadas runtime
11. Testes unitários para repository + stores

## Próximas fases

- Fase 7: APK assinado de release (finalização)
- Backlog: gráficos de evolução / PRs / equalizer / letras / crossfade
