# Fix Video Playback — Follow-up Plan

> Follow-up à Fase 1+2 — resolver a Known Issue de reprodução de vídeo em `ExerciseMedia`.

## Contexto

Na Fase 1+2 não conseguimos fazer `react-native-video@6.19.1` renderizar em RN 0.85.1 + Fabric. Detalhes técnicos em `docs/superpowers/specs/2026-04-17-fundacao-biblioteca-exercicios-design.md` (seção "Known Issues").

`ExerciseMedia` hoje mostra apenas placeholder com ícone. Precisa voltar a reproduzir vídeo em loop quando há MP4 correspondente no bundle.

## Pré-requisito para executar

Executar **quando uma das condições abaixo for verdade**:

1. `react-native-video@7.x` sair de beta (verificar em https://github.com/TheWidlarzGroup/react-native-video/releases)
2. Chegar na Fase 4 (Execução do treino), onde vídeo em loop é parte da UX crítica e motiva investir tempo no fix

## Opções técnicas (escolher uma ao executar)

### Opção A: Migrar para `react-native-video@7` estável (preferida)

Quando v7 sair de beta:

1. `pnpm remove react-native-video && pnpm add react-native-video@latest react-native-nitro-modules`
2. Aprovar build scripts no `package.json` (campo `pnpm.onlyBuiltDependencies`)
3. Garantir que `bun` está instalado no ambiente (ou achar alternativa se rn-video manter isso como pré-req)
4. Reescrever `src/components/exercise/ExerciseMedia.tsx` usando novo API:
   - `import { VideoView, useVideoPlayer } from 'react-native-video'`
   - Dividir em dois componentes para respeitar Rules of Hooks (placeholder puro + VideoContent com hook)
   - `const player = useVideoPlayer(source)`; setup em `useEffect` com `player.loop`, `player.muted`, `player.play()`
   - Renderizar `<VideoView player={player} resizeMode="cover" style={{ width, height, backgroundColor, borderRadius }} />`
5. `rm -rf android/app/build android/app/.cxx android/build`
6. `pnpm android` para validar build + install
7. Testar em device real: exercícios com MP4 devem tocar em loop silencioso

### Opção B: Downgrade RN para 0.76 (fallback)

Se v7 continuar instável ou migração quebrar:

1. `pnpm add react-native@0.76.x` + demais `@react-native/*` alinhadas
2. Aceitar o flag `newArchEnabled=false` em `android/gradle.properties`
3. Verificar compatibilidade de: `op-sqlite`, navigation libs, `react-native-screens`, `safe-area-context` — pode exigir downgrade
4. Reescrever `ExerciseMedia.tsx` usando v6 API `<Video />` (equivalente ao que existia antes do fallback)
5. Rebuild + instalar
6. Testar

**Risco:** downgrade é disruptivo, pode quebrar outras libs. Só fazer se A não for possível.

## Critério de aceite

- Ao abrir `ExerciseDetailScreen` para um exercício com MP4 bundled, o vídeo toca em loop silencioso e ocupa toda a área designada.
- Exercícios sem MP4 continuam mostrando placeholder com ícone `fitness-center`.
- Nenhum warning `Could not find generated setter` nos logs.
- Build Android debug funciona sem flags experimentais.
- Testes unitários existentes continuam passando.

## Arquivos afetados

- `src/components/exercise/ExerciseMedia.tsx` (reescrita)
- `package.json` / `pnpm-lock.yaml` (deps)
- `android/app/build/*` (regeneração)
- Possível: `android/gradle.properties` (opção B)
- `docs/superpowers/specs/2026-04-17-fundacao-biblioteca-exercicios-design.md` (remover seção "Known Issues")
