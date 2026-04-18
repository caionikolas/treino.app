# Migração para React Native 0.76 (Fase 5.9) — Design

**Data:** 2026-04-19
**Escopo:** Downgrade controlado de RN 0.85.1 → RN 0.76.x preservando todo o código atual (`src/`, `assets/`, `docs/`). Desbloqueia libs incompatíveis com Fabric (vídeo real, top tabs material, track-player).
**Motivação:** RN 0.85 removeu a arquitetura antiga; muitas libs do ecossistema não migraram pra Fabric. Estamos "à frente do ecossistema", hit compatibility issues repetidas (rn-video, pager-view, pending track-player). Target maduro com old arch ainda suportada: 0.76.x.

## Objetivo

Projeto continua sendo React Native + TypeScript + op-sqlite + Zustand. Muda versão do RN (e deps relacionadas) pra recuperar compatibilidade com libs maduras. Todo o código em `src/`, toda a spec/plano, toda a UX construída até Fase 5 permanece. Não é rewrite.

## Fora de escopo

- Mudança de framework (Kotlin, Flutter — avaliadas e descartadas)
- Novas features
- Mudança de schema de DB
- Reorganização de pastas

## Estratégia confirmada: opção A

Scaffold fresh RN 0.76 + copiar arquivos do shell sobre o nosso repo:

1. Criar projeto RN 0.76 em `/tmp/TreinoApp76`
2. Copiar do `/tmp/TreinoApp76` para `treino.app/` (sobrescrevendo):
   - `android/` (estrutura + gradle wrapper + settings)
   - `package.json` (ajustar depois)
   - `index.js`
   - `App.tsx` (ajustar depois, reusa nossa lógica)
   - `metro.config.js`
   - `babel.config.js`
   - `tsconfig.json`
   - `jest.config.js`
   - `.watchmanconfig`, `.prettierrc.js`, `.eslintrc.js`, `.bundle/`
3. **Preservar** (NÃO sobrescrever): `src/`, `assets/`, `docs/`, `CLAUDE.md`, `README.md`, `ROADMAP.md`, `.git/`, `.claude/`, `__tests__/`, `__mocks__/`
4. Restaurar nossos ajustes pontuais:
   - `metro.config.js` registra `.mp4` como asset
   - `babel.config.js` tem `module-resolver` com alias `@/*` → `src/*`
   - `tsconfig.json` tem `paths: { "@/*": ["src/*"] }`
   - `android/gradle.properties`: `newArchEnabled=false`
   - `android/app/src/main/AndroidManifest.xml`: `WAKE_LOCK`, `VIBRATE`, `POST_NOTIFICATIONS`
   - `KeepAwakeModule.kt`, `KeepAwakePackage.kt` registrados em `MainApplication.*`
   - `fonts.gradle` do vector-icons aplicado em `android/app/build.gradle`
5. Reinstalar deps nas versões compatíveis com 0.76 (ver tabela)
6. Restaurar as capabilities que estavam caped (vídeo real, top tabs material)
7. Commit, rebuild, smoke test

## Versões alvo

| Dep | Versão atual (0.85) | Versão-alvo (0.76) | Notas |
|---|---|---|---|
| `react-native` | 0.85.1 | ~0.76.6 (latest 0.76 patch) | |
| `react` | 19.2.3 | 18.3.1 | RN 0.76 usa React 18 |
| `@types/react` | latest | 18.x | |
| `@react-native/babel-preset` | 0.85 | 0.76 | |
| `@react-native/metro-config` | 0.85 | 0.76 | |
| `@react-native/typescript-config` | 0.85 | 0.76 | |
| `@react-navigation/native` | 7.2 | ≥7.0 (compat) | |
| `@react-navigation/bottom-tabs` | 7.15 | ≥7.0 | |
| `@react-navigation/native-stack` | 7.14 | ≥7.0 | |
| `@react-navigation/material-top-tabs` | (removida) | ≥7.0 | **reinstalar** |
| `react-native-screens` | 4.24 | 3.35.x | |
| `react-native-safe-area-context` | 5.x | 4.x | |
| `react-native-pager-view` | (removida) | 7.x | **reinstalar** (material-top-tabs depende) |
| `react-native-video` | 6.19.1 | ^6.7.0 | mesmo major, já funciona com 0.76 |
| `react-native-vector-icons` | 10.3 | 10.x | pure JS side |
| `@op-engineering/op-sqlite` | 15.2 | ~11.4.x | downgrade pro range RN 0.74-0.77 |
| `@notifee/react-native` | 9.1 | 7.8.x ou 9.x | checar compat runtime |
| `react-native-calendars` | latest | latest | pure JS, sem mudança |
| `zustand` | 5.0 | 5.0 | |
| `react-native-uuid` | 2.0 | 2.0 | |
| `babel-plugin-module-resolver` | 5.x | 5.x | |
| `better-sqlite3` (devDep) | latest | latest | |

## Código modificado

### Restauração obrigatória após copy (não no src/)

1. **`metro.config.js`** — register `mp4` em assetExts:
   ```javascript
   const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
   const defaultConfig = getDefaultConfig(__dirname);
   const { assetExts, sourceExts } = defaultConfig.resolver;
   module.exports = mergeConfig(defaultConfig, {
     resolver: { assetExts: [...assetExts, 'mp4'], sourceExts },
   });
   ```

2. **`babel.config.js`** — module-resolver:
   ```javascript
   module.exports = {
     presets: ['module:@react-native/babel-preset'],
     plugins: [['module-resolver', { root: ['./'], alias: { '@': './src' } }]],
   };
   ```

3. **`tsconfig.json`** — paths:
   ```json
   {
     "extends": "@react-native/typescript-config",
     "compilerOptions": { "types": ["jest"], "baseUrl": ".", "paths": { "@/*": ["src/*"] } },
     "include": ["**/*.ts", "**/*.tsx"],
     "exclude": ["**/node_modules", "**/Pods"]
   }
   ```

4. **`jest.config.js`** — preserva adaptações pnpm + MP4 mock:
   ```javascript
   module.exports = {
     preset: 'react-native',
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
       '\\.mp4$': '<rootDir>/__mocks__/mp4Mock.js',
     },
     transformIgnorePatterns: [
       'node_modules/(?!(.pnpm/)?(@?)(jest-)?react-native(.*)?|@react-navigation|react-native-uuid)',
     ],
   };
   ```

5. **`.npmrc`** preservado: `node-linker=hoisted`.

6. **`android/gradle.properties`**: `newArchEnabled=false` (flag respeitada em 0.76).

7. **`android/app/src/main/AndroidManifest.xml`** — adicionar permissions: `WAKE_LOCK`, `VIBRATE`, `POST_NOTIFICATIONS`.

8. **`android/app/build.gradle`** — `apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")`.

9. **`KeepAwakeModule.kt` + `KeepAwakePackage.kt`** — copiar para `android/app/src/main/java/com/treinoapp/`. Registrar package em `MainApplication.kt` (nome do arquivo varia em 0.76 — pode ser `.java` ou `.kt`; adaptar).

10. **`package.json`** — adaptar `pnpm.onlyBuiltDependencies` com os nomes das libs nativas + ajustar nome do projeto, versão.

### Unlocks depois que app voltar a rodar

11. **`src/components/exercise/ExerciseMedia.tsx`** — reverter para versão com `<Video>` real (Fase 2 known issue resolvida):
    - Restaurar lógica: se `resolveMedia(filename) != null`, renderiza `<Video source={source} style={...} repeat muted resizeMode="cover" controls={false} />`
    - Placeholder com ícone só quando não há mídia

12. **`src/screens/history/HistoryTabsScreen.tsx`** — reverter pro `createMaterialTopTabNavigator` (UI mais polida, swipe entre abas).

13. **Atualizar specs** "Known Issues" — remover nota sobre vídeo em `2026-04-17-fundacao-biblioteca-exercicios-design.md`.

## Verificação

- `pnpm tsc --noEmit` — clean
- `pnpm test` — 42 tests passam (lógica pura, mocks de DB independentes de RN version)
- `pnpm android` — build succeeds, APK instala
- Smoke test manual no device:
  - [ ] App boota
  - [ ] Tab Exercícios funciona (+ vídeos tocam no detalhe agora)
  - [ ] Tab Treinos funciona (criar, editar, duplicar, apagar, favoritar)
  - [ ] Execução funciona (timer, rest, notificação, keep-awake)
  - [ ] Histórico funciona (calendário, detalhe, repetir, estatísticas)
  - [ ] Top tabs material no Histórico (se reverter)

## Riscos e contingências

- **op-sqlite 11.x API diferente** — se `execute`/`transaction` forem síncronos em vez de async, precisa reverter repositórios pra sync. Mitigação: olhar changelog antes de downgrade; se async muda, corrigir stores/repositories.
- **@notifee/react-native versão antiga** — API provavelmente compat, mas se `displayNotification` mudou, ajustar em `notificationService.ts`.
- **KeepAwakeModule.kt compilation** — base class `ReactContextBaseJavaModule` existe em 0.76; `reactApplicationContext.currentActivity` funciona igual.
- **Gradle versions** — 0.76 scaffold vai trazer Gradle 8.x, AGP 8.x. Gradle wrapper vem do scaffold, não mexer.
- **React 18 vs 19** — nosso código usa hooks + zustand; não usa features exclusivas do 19. Zero mudança esperada.
- **Perdas parciais na migração** — se algo crítico quebrar e não der pra ajustar, rollback simples via `git reset --hard HEAD~N` (o commit da migração vai ser atômico).

## Entregáveis ao fim da fase

1. Projeto rodando em RN 0.76 com `newArchEnabled=false`
2. Todos os 42 testes passando
3. APK instala e app funciona igual (todas Fases 1-5)
4. Vídeos dos exercícios voltam a tocar no detalhe
5. Top tabs material no histórico (opcional)
6. Pronto pra iniciar Fase 6 (player de música com `react-native-track-player`)

## Próximas fases

- Fase 6: Player de música (agora viável)
- Fase 7: APK assinado de release
- Backlog: gráficos de evolução, PRs
