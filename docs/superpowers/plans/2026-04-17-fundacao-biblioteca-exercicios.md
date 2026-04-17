# Fundação + Biblioteca de Exercícios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar app React Native com tema escuro, SQLite configurado, schema completo, seed de ~62 exercícios, e tab "Exercícios" 100% funcional (lista, busca, filtros, detalhe com vídeo em loop).

**Architecture:** React Native CLI + TypeScript + SQLite (op-sqlite) + Zustand + React Navigation (Bottom Tabs). Tema escuro. Assets MP4 embutidos no bundle, resolvidos via mapa estático. Seed populado na primeira execução. Biblioteca read-only no app.

**Tech Stack:** React Native 0.76+, TypeScript, pnpm, op-sqlite, react-native-video, react-native-vector-icons, zustand, @react-navigation/native + bottom-tabs + native-stack, JDK 17, Android Studio, minSdk 26, targetSdk 34.

**Spec de referência:** `docs/superpowers/specs/2026-04-17-fundacao-biblioteca-exercicios-design.md`

**Convenções:**
- Assets em inglês, UI em PT-BR
- `muscle_group` chaves: `chest, back, shoulder, biceps, triceps, legs, core, full_body`
- `category` chaves: `strength, calisthenics, both`
- Código em inglês; strings visíveis ao usuário em PT-BR

---

## Task 1: Verificar ambiente de desenvolvimento

**Files:** nenhum arquivo alterado; apenas verificação de ambiente

- [ ] **Step 1: Verificar JDK 17**

Run: `java -version`
Expected: versão 17.x.x. Se não, instalar JDK 17: `sudo apt install openjdk-17-jdk`

- [ ] **Step 2: Verificar Android Studio + SDK**

Run: `ls $HOME/Android/Sdk/platform-tools/adb`
Expected: arquivo existe. Se Android Studio não está instalado ou SDK em outro caminho, abrir Android Studio, instalar Platform-Tools e SDK API 34 via SDK Manager.

- [ ] **Step 3: Exportar variáveis de ambiente**

Adicionar ao `~/.bashrc` (se ainda não tiver):
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```
Run: `source ~/.bashrc && adb --version`
Expected: imprime versão do adb.

- [ ] **Step 4: Verificar pnpm**

Run: `pnpm --version`
Expected: versão 8.x ou superior. Se não, instalar: `npm install -g pnpm`.

- [ ] **Step 5: Verificar device ou emulador disponível**

Run: `adb devices`
Expected: pelo menos um device listado. Se nenhum, conectar device USB com depuração ativada ou iniciar emulador pelo Android Studio.

---

## Task 2: Inicializar projeto React Native CLI

**Files:**
- Create: estrutura completa do projeto RN em `/home/nikolas-dev/Dev/treino.app/`

- [ ] **Step 1: Confirmar pasta limpa (exceto CLAUDE.md, docs/, assets/)**

Run: `ls /home/nikolas-dev/Dev/treino.app/`
Expected: apenas `CLAUDE.md`, `docs/`, `assets/`. Se houver outros arquivos, parar e consultar o usuário.

- [ ] **Step 2: Inicializar projeto RN em pasta temporária**

O comando `npx @react-native-community/cli init` não sobrescreve pasta não-vazia. Estratégia: gerar em pasta temporária e mover.

Run:
```bash
cd /tmp
npx @react-native-community/cli@latest init TreinoApp --pm pnpm --skip-install
```
Expected: pasta `/tmp/TreinoApp/` criada com estrutura RN padrão.

- [ ] **Step 3: Mover arquivos do projeto gerado para treino.app/**

Run:
```bash
cd /tmp/TreinoApp
mv android ios package.json tsconfig.json babel.config.js metro.config.js jest.config.js app.json index.js App.tsx .watchmanconfig .prettierrc.js .eslintrc.js .gitignore .gitattributes .bundle /home/nikolas-dev/Dev/treino.app/ 2>/dev/null || true
ls /home/nikolas-dev/Dev/treino.app/
rm -rf /tmp/TreinoApp
```
Expected: projeto treino.app agora tem `android/`, `ios/`, `package.json`, etc.

- [ ] **Step 4: Remover iOS (não usaremos)**

Run: `rm -rf /home/nikolas-dev/Dev/treino.app/ios`
Expected: pasta `ios/` removida.

- [ ] **Step 5: Inicializar git**

Run:
```bash
cd /home/nikolas-dev/Dev/treino.app
git init -b main
git add .
git commit -m "chore: initialize React Native CLI project with TypeScript"
```
Expected: repo git criado com primeiro commit.

- [ ] **Step 6: Instalar dependências base**

Run:
```bash
cd /home/nikolas-dev/Dev/treino.app
pnpm install
```
Expected: `node_modules/` criado, sem erros.

- [ ] **Step 7: Smoke test — rodar o app**

Run em um terminal: `pnpm start`
Run em outro terminal: `pnpm android`
Expected: app de exemplo ("Welcome to React Native") abre no device/emulador. Parar o Metro após confirmar.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: install base dependencies and verify build"
```

---

## Task 3: Instalar bibliotecas do projeto

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar React Navigation**

Run:
```bash
pnpm add @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

- [ ] **Step 2: Instalar op-sqlite, video, zustand, vector-icons, uuid**

Run:
```bash
pnpm add @op-engineering/op-sqlite react-native-video zustand react-native-vector-icons react-native-uuid
pnpm add -D @types/react-native-vector-icons
```

- [ ] **Step 3: Rebuild Android (libs nativas precisam linkar)**

Run:
```bash
cd android && ./gradlew clean && cd ..
pnpm android
```
Expected: app sobe novamente com as novas libs linkadas. Sem erros de build.

- [ ] **Step 4: Configurar vector-icons (MaterialIcons)**

Editar `android/app/build.gradle`, adicionar no final (ou logo após a última linha existente):
```gradle
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install navigation, sqlite, video, state, and icons libs"
```

---

## Task 4: Configurar suporte a MP4 no bundler

**Files:**
- Modify: `metro.config.js`

- [ ] **Step 1: Adicionar mp4 como asset reconhecido**

Substituir conteúdo de `metro.config.js` por:
```javascript
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const config = {
  resolver: {
    assetExts: [...assetExts, 'mp4'],
    sourceExts,
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

- [ ] **Step 2: Reiniciar Metro com cache limpo**

Run: `pnpm start --reset-cache` (deixar rodando). Em outro terminal: `pnpm android`.
Expected: app abre normalmente.

- [ ] **Step 3: Commit**

```bash
git add metro.config.js
git commit -m "chore: register mp4 as bundled asset extension"
```

---

## Task 5: Configurar permissões Android

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/build.gradle`

- [ ] **Step 1: Ajustar minSdk e targetSdk**

Em `android/build.gradle`, bloco `buildscript.ext`:
```gradle
ext {
    buildToolsVersion = "34.0.0"
    minSdkVersion = 26
    compileSdkVersion = 34
    targetSdkVersion = 34
    ndkVersion = "26.1.10909125"
    kotlinVersion = "1.9.24"
}
```
(Preservar `ndkVersion` e `kotlinVersion` conforme gerados pelo RN CLI; só garantir que `minSdkVersion = 26`.)

- [ ] **Step 2: Adicionar permissão WAKE_LOCK ao manifest**

Em `android/app/src/main/AndroidManifest.xml`, dentro de `<manifest>` antes de `<application>`:
```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
```
(Demais permissões — áudio, storage, foreground service — serão adicionadas nas fases de música e execução.)

- [ ] **Step 3: Rebuild e verificar**

Run:
```bash
cd android && ./gradlew clean && cd ..
pnpm android
```
Expected: app sobe sem erros.

- [ ] **Step 4: Commit**

```bash
git add android/
git commit -m "chore: set minSdk 26, add WAKE_LOCK and VIBRATE permissions"
```

---

## Task 6: Criar estrutura de pastas src/

**Files:**
- Create: `src/` com subpastas vazias (placeholders `.gitkeep`)

- [ ] **Step 1: Criar árvore de pastas**

Run:
```bash
cd /home/nikolas-dev/Dev/treino.app
mkdir -p src/components/common src/components/exercise
mkdir -p src/screens/exercise src/screens/placeholders
mkdir -p src/navigation src/store
mkdir -p src/database/repositories src/database/seeds
mkdir -p src/theme src/types src/utils src/constants
mkdir -p __tests__/unit
touch src/components/common/.gitkeep src/components/exercise/.gitkeep
touch src/screens/exercise/.gitkeep src/screens/placeholders/.gitkeep
touch src/navigation/.gitkeep src/store/.gitkeep
touch src/database/.gitkeep src/database/repositories/.gitkeep src/database/seeds/.gitkeep
touch src/theme/.gitkeep src/types/.gitkeep src/utils/.gitkeep src/constants/.gitkeep
```

- [ ] **Step 2: Configurar path alias no tsconfig**

Substituir `tsconfig.json` por:
```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 3: Configurar alias no Babel**

Instalar plugin: `pnpm add -D babel-plugin-module-resolver`

Substituir `babel.config.js` por:
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
      },
    ],
  ],
};
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold src/ directory structure and path alias"
```

---

## Task 7: Tema — cores, tipografia, espaçamento

**Files:**
- Create: `src/theme/colors.ts`
- Create: `src/theme/typography.ts`
- Create: `src/theme/spacing.ts`
- Create: `src/theme/index.ts`

- [ ] **Step 1: Criar `src/theme/colors.ts`**

```typescript
export const colors = {
  primary: '#1A1A2E',
  primaryLight: '#16213E',
  accent: '#E94560',
  accentSecondary: '#0F3460',
  success: '#00C851',
  warning: '#FFBB33',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  background: '#0A0A14',
  surface: '#1A1A2E',
  border: '#2A2A3E',
} as const;

export type ColorKey = keyof typeof colors;
```

- [ ] **Step 2: Criar `src/theme/typography.ts`**

```typescript
import { TextStyle } from 'react-native';

export const typography = {
  title: { fontSize: 24, fontWeight: '700' } as TextStyle,
  heading: { fontSize: 20, fontWeight: '600' } as TextStyle,
  body: { fontSize: 16, fontWeight: '400' } as TextStyle,
  caption: { fontSize: 14, fontWeight: '400' } as TextStyle,
  label: { fontSize: 12, fontWeight: '500' } as TextStyle,
  monoLarge: { fontSize: 48, fontWeight: '700', fontFamily: 'monospace' } as TextStyle,
};
```

- [ ] **Step 3: Criar `src/theme/spacing.ts`**

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};
```

- [ ] **Step 4: Criar `src/theme/index.ts`**

```typescript
export { colors } from './colors';
export type { ColorKey } from './colors';
export { typography } from './typography';
export { spacing, radius } from './spacing';
```

- [ ] **Step 5: Commit**

```bash
git add src/theme/
git commit -m "feat: add dark theme (colors, typography, spacing)"
```

---

## Task 8: Constantes — grupos musculares e categorias

**Files:**
- Create: `src/constants/muscleGroups.ts`
- Create: `src/constants/categories.ts`

- [ ] **Step 1: Criar `src/constants/muscleGroups.ts`**

```typescript
export const MUSCLE_GROUPS = {
  chest: 'Peito',
  back: 'Costas',
  shoulder: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  legs: 'Pernas',
  core: 'Core',
  full_body: 'Corpo Inteiro',
} as const;

export type MuscleGroupKey = keyof typeof MUSCLE_GROUPS;

export const MUSCLE_GROUP_ORDER: MuscleGroupKey[] = [
  'chest', 'back', 'shoulder', 'biceps', 'triceps', 'legs', 'core', 'full_body',
];

export function labelForMuscleGroup(key: string): string {
  return MUSCLE_GROUPS[key as MuscleGroupKey] ?? key;
}
```

- [ ] **Step 2: Criar `src/constants/categories.ts`**

```typescript
export const CATEGORIES = {
  strength: 'Musculação',
  calisthenics: 'Calistenia',
  both: 'Ambos',
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function labelForCategory(key: string): string {
  return CATEGORIES[key as CategoryKey] ?? key;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/constants/
git commit -m "feat: add muscle group and category constants with PT-BR labels"
```

---

## Task 9: Types — Exercise

**Files:**
- Create: `src/types/exercise.ts`

- [ ] **Step 1: Criar `src/types/exercise.ts`**

```typescript
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { CategoryKey } from '@/constants/categories';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroupKey;
  category: CategoryKey;
  mediaFilename: string | null;
  instructions: string;
  createdAt: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/
git commit -m "feat: add Exercise type"
```

---

## Task 10: Util — generateId (TDD)

**Files:**
- Create: `src/utils/generateId.ts`
- Create: `__tests__/unit/generateId.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/unit/generateId.test.ts`:
```typescript
import { generateId } from '@/utils/generateId';

describe('generateId', () => {
  it('returns a string in UUID v4 format', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns different values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
```

- [ ] **Step 2: Verificar teste falha**

Run: `pnpm test generateId`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Criar `src/utils/generateId.ts`:
```typescript
import uuid from 'react-native-uuid';

export function generateId(): string {
  return uuid.v4() as string;
}
```

- [ ] **Step 4: Verificar teste passa**

Run: `pnpm test generateId`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/generateId.ts __tests__/unit/generateId.test.ts
git commit -m "feat: add generateId util with UUID v4"
```

---

## Task 11: Componentes comuns — Button

**Files:**
- Create: `src/components/common/Button.tsx`

- [ ] **Step 1: Criar `src/components/common/Button.tsx`**

```typescript
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.labelGhost]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.primaryLight },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  label: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  labelGhost: { color: colors.accent },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/Button.tsx
git commit -m "feat: add Button common component"
```

---

## Task 12: Componentes comuns — Card, Input, Badge, EmptyState

**Files:**
- Create: `src/components/common/Card.tsx`
- Create: `src/components/common/Input.tsx`
- Create: `src/components/common/Badge.tsx`
- Create: `src/components/common/EmptyState.tsx`
- Create: `src/components/common/index.ts`

- [ ] **Step 1: Criar `src/components/common/Card.tsx`**

```typescript
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, spacing, radius } from '@/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: Props) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: { opacity: 0.8 },
});
```

- [ ] **Step 2: Criar `src/components/common/Input.tsx`**

```typescript
import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
```

- [ ] **Step 3: Criar `src/components/common/Badge.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  label: string;
  color?: string;
}

export function Badge({ label, color = colors.accentSecondary }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { ...typography.label, color: colors.textPrimary },
});
```

- [ ] **Step 4: Criar `src/components/common/EmptyState.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'inbox', title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={colors.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
```

- [ ] **Step 5: Criar barrel `src/components/common/index.ts`**

```typescript
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Badge } from './Badge';
export { EmptyState } from './EmptyState';
```

- [ ] **Step 6: Commit**

```bash
git add src/components/common/
git commit -m "feat: add Card, Input, Badge, EmptyState common components"
```

---

## Task 13: SQLite — conexão

**Files:**
- Create: `src/database/connection.ts`

- [ ] **Step 1: Criar `src/database/connection.ts`**

```typescript
import { open, DB } from '@op-engineering/op-sqlite';

let dbInstance: DB | null = null;

export function getDb(): DB {
  if (!dbInstance) {
    dbInstance = open({ name: 'treino.db' });
    dbInstance.execute('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/database/connection.ts
git commit -m "feat: add SQLite connection singleton"
```

---

## Task 14: SQLite — sistema de migrações

**Files:**
- Create: `src/database/migrations.ts`

- [ ] **Step 1: Criar `src/database/migrations.ts`**

```typescript
import { getDb } from './connection';

interface Migration {
  version: number;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        category TEXT NOT NULL,
        media_filename TEXT,
        instructions TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        order_index INTEGER NOT NULL,
        sets INTEGER NOT NULL,
        reps TEXT NOT NULL,
        rest_seconds INTEGER NOT NULL,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id),
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        duration_seconds INTEGER,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS session_sets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        set_number INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight_kg REAL,
        completed INTEGER NOT NULL DEFAULT 1,
        notes TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS playlist_tracks (
        id TEXT PRIMARY KEY,
        playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        track_uri TEXT NOT NULL,
        track_name TEXT NOT NULL,
        artist_name TEXT,
        duration_ms INTEGER,
        order_index INTEGER NOT NULL
      )`,
    ],
  },
];

function getCurrentVersion(): number {
  const db = getDb();
  db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`,
  );
  const result = db.execute('SELECT MAX(version) as v FROM schema_migrations');
  const row = result.rows?.[0];
  return (row?.v as number | null) ?? 0;
}

export function runMigrations(): void {
  const db = getDb();
  const current = getCurrentVersion();
  const pending = MIGRATIONS.filter(m => m.version > current).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    db.transaction(tx => {
      for (const stmt of migration.up) {
        tx.execute(stmt);
      }
      tx.execute('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        Date.now(),
      ]);
    });
    console.log(`Applied migration v${migration.version}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/database/migrations.ts
git commit -m "feat: add migrations system with v1 schema (all tables from spec)"
```

---

## Task 15: Exercise repository (TDD onde possível)

**Files:**
- Create: `src/database/repositories/exerciseRepository.ts`

- [ ] **Step 1: Criar `src/database/repositories/exerciseRepository.ts`**

```typescript
import { getDb } from '../connection';
import { Exercise } from '@/types/exercise';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { CategoryKey } from '@/constants/categories';

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  category: string;
  media_filename: string | null;
  instructions: string | null;
  created_at: number;
}

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroupKey,
    category: row.category as CategoryKey,
    mediaFilename: row.media_filename,
    instructions: row.instructions ?? '',
    createdAt: row.created_at,
  };
}

export const exerciseRepository = {
  findAll(): Exercise[] {
    const db = getDb();
    const result = db.execute('SELECT * FROM exercises ORDER BY name ASC');
    return (result.rows ?? []).map(r => rowToExercise(r as unknown as ExerciseRow));
  },

  findById(id: string): Exercise | null {
    const db = getDb();
    const result = db.execute('SELECT * FROM exercises WHERE id = ? LIMIT 1', [id]);
    const row = result.rows?.[0];
    return row ? rowToExercise(row as unknown as ExerciseRow) : null;
  },

  count(): number {
    const db = getDb();
    const result = db.execute('SELECT COUNT(*) as c FROM exercises');
    const row = result.rows?.[0];
    return (row?.c as number | null) ?? 0;
  },

  insertMany(exercises: Exercise[]): void {
    const db = getDb();
    db.transaction(tx => {
      for (const ex of exercises) {
        tx.execute(
          `INSERT INTO exercises (id, name, muscle_group, category, media_filename, instructions, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ex.id, ex.name, ex.muscleGroup, ex.category, ex.mediaFilename, ex.instructions, ex.createdAt],
        );
      }
    });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/database/repositories/exerciseRepository.ts
git commit -m "feat: add exerciseRepository with CRUD primitives"
```

---

## Task 16: Seed de exercícios default

**Files:**
- Create: `src/database/seeds/defaultExercises.ts`
- Create: `src/database/seeds/runSeeds.ts`

- [ ] **Step 1: Criar `src/database/seeds/defaultExercises.ts` com ~62 exercícios**

```typescript
import { Exercise } from '@/types/exercise';

export const DEFAULT_EXERCISES: Exercise[] = [
  // PEITO (chest)
  { id: 'ex-chest-01', name: 'Supino Reto com Barra', muscleGroup: 'chest', category: 'strength', mediaFilename: 'barbell_bench_press.mp4', instructions: 'Deite-se no banco, pegue a barra com pegada pouco mais aberta que os ombros. Desça controlando até tocar levemente o peito. Empurre de volta estendendo os braços sem travar os cotovelos.', createdAt: 0 },
  { id: 'ex-chest-02', name: 'Supino Reto com Halteres', muscleGroup: 'chest', category: 'strength', mediaFilename: 'dumbbell_bench_press.mp4', instructions: 'Deitado no banco, segure os halteres ao lado do peito com palmas para frente. Empurre para cima até quase encostar os halteres. Desça controladamente.', createdAt: 0 },
  { id: 'ex-chest-03', name: 'Supino Inclinado com Halteres', muscleGroup: 'chest', category: 'strength', mediaFilename: 'dumbbell_incline_bench_press.mp4', instructions: 'Banco inclinado 30-45°. Halteres ao lado do peito superior. Empurre para cima e desça com controle.', createdAt: 0 },
  { id: 'ex-chest-04', name: 'Crucifixo com Halteres', muscleGroup: 'chest', category: 'strength', mediaFilename: 'dumbbell_chest_fly.mp4', instructions: 'Deitado no banco, braços estendidos com leve flexão no cotovelo. Abra em arco até sentir alongamento no peito. Retorne na mesma trajetória.', createdAt: 0 },
  { id: 'ex-chest-05', name: 'Crucifixo Inclinado com Halteres', muscleGroup: 'chest', category: 'strength', mediaFilename: 'dumbbell_incline_chest_flys.mp4', instructions: 'Banco inclinado. Braços semi-flexionados, abra em arco amplo e retorne contraindo o peito.', createdAt: 0 },
  { id: 'ex-chest-06', name: 'Flexão de Braço', muscleGroup: 'chest', category: 'calisthenics', mediaFilename: 'pushup.mp4', instructions: 'Mãos pouco mais abertas que os ombros, corpo alinhado. Desça até o peito quase tocar o chão. Empurre de volta mantendo o core ativo.', createdAt: 0 },
  { id: 'ex-chest-07', name: 'Flexão Diamante', muscleGroup: 'chest', category: 'calisthenics', mediaFilename: 'diamond_pushup.mp4', instructions: 'Mãos juntas formando um triângulo sob o peito. Desça e suba mantendo cotovelos próximos ao corpo.', createdAt: 0 },

  // COSTAS (back)
  { id: 'ex-back-01', name: 'Remada Curvada com Barra', muscleGroup: 'back', category: 'strength', mediaFilename: 'barbell_bent_over_row.mp4', instructions: 'Tronco inclinado à frente 45°, coluna neutra. Puxe a barra em direção ao abdômen aproximando as escápulas. Desça controlado.', createdAt: 0 },
  { id: 'ex-back-02', name: 'Remada Unilateral com Halter', muscleGroup: 'back', category: 'strength', mediaFilename: 'dumbbell_kneeling_single_arm_row.mp4', instructions: 'Apoiado no banco com um joelho e uma mão. Puxe o halter em direção à cintura contraindo a escápula. Estenda o braço completamente na descida.', createdAt: 0 },
  { id: 'ex-back-03', name: 'Remada Inclinada no Banco', muscleGroup: 'back', category: 'strength', mediaFilename: 'dumbbell_laying_incline_row.mp4', instructions: 'Deitado de bruços em banco inclinado. Puxe os halteres até a linha do tronco, contraindo escápulas. Desça controlado.', createdAt: 0 },
  { id: 'ex-back-04', name: 'Barra Fixa (Pull-up)', muscleGroup: 'back', category: 'calisthenics', mediaFilename: 'pullup.mp4', instructions: 'Pegada pronada, mãos pouco mais abertas que os ombros. Puxe até o queixo passar a barra. Desça com controle até braços estendidos.', createdAt: 0 },
  { id: 'ex-back-05', name: 'Barra Supinada (Chin-up)', muscleGroup: 'back', category: 'calisthenics', mediaFilename: 'chinup.mp4', instructions: 'Pegada supinada na largura dos ombros. Puxe trazendo o peito em direção à barra. Desça controlado.', createdAt: 0 },
  { id: 'ex-back-06', name: 'Remada Australiana', muscleGroup: 'back', category: 'calisthenics', mediaFilename: 'australian_pullup.mp4', instructions: 'Corpo sob barra baixa, calcanhares no chão, corpo reto. Puxe o peito até a barra e retorne estendendo os braços.', createdAt: 0 },

  // OMBROS (shoulder)
  { id: 'ex-shoulder-01', name: 'Desenvolvimento Militar com Halteres', muscleGroup: 'shoulder', category: 'strength', mediaFilename: 'dumbbell_shoulder_press.mp4', instructions: 'Sentado ou em pé, halteres ao nível dos ombros. Empurre para cima até quase estender os braços. Desça controlado.', createdAt: 0 },
  { id: 'ex-shoulder-02', name: 'Elevação Lateral', muscleGroup: 'shoulder', category: 'strength', mediaFilename: 'dumbbell_lateral_raise.mp4', instructions: 'Em pé, halteres ao lado do corpo, cotovelos levemente flexionados. Eleve os braços até a linha dos ombros. Desça controlado.', createdAt: 0 },
  { id: 'ex-shoulder-03', name: 'Elevação Frontal', muscleGroup: 'shoulder', category: 'strength', mediaFilename: 'dumbbell_front_raise.mp4', instructions: 'Em pé, halteres à frente das coxas. Eleve um braço por vez até a altura dos ombros, mantendo leve flexão no cotovelo. Desça controlado.', createdAt: 0 },
  { id: 'ex-shoulder-04', name: 'Desenvolvimento Arnold', muscleGroup: 'shoulder', category: 'strength', mediaFilename: 'arnold_press.mp4', instructions: 'Comece com halteres à frente, palmas voltadas para você. Gire os punhos enquanto empurra para cima. Desça invertendo o movimento.', createdAt: 0 },
  { id: 'ex-shoulder-05', name: 'Pike Push-up', muscleGroup: 'shoulder', category: 'calisthenics', mediaFilename: 'pike_pushup.mp4', instructions: 'Posição de V invertido com quadril elevado. Desça o topo da cabeça em direção ao chão flexionando os cotovelos. Empurre de volta.', createdAt: 0 },

  // BÍCEPS (biceps)
  { id: 'ex-biceps-01', name: 'Rosca Direta com Halteres', muscleGroup: 'biceps', category: 'strength', mediaFilename: 'dumbbell_curl.mp4', instructions: 'Em pé, halteres ao lado do corpo com palmas para frente. Flexione os cotovelos trazendo os halteres em direção aos ombros. Desça controlado.', createdAt: 0 },
  { id: 'ex-biceps-02', name: 'Rosca Alternada', muscleGroup: 'biceps', category: 'strength', mediaFilename: 'dumbbell_alternating_curl.mp4', instructions: 'Alterne as flexões de braço, um de cada vez, com palma supinada. Mantenha o cotovelo fixo ao lado do corpo.', createdAt: 0 },
  { id: 'ex-biceps-03', name: 'Rosca Martelo', muscleGroup: 'biceps', category: 'strength', mediaFilename: 'dumbbell_hammer_curl.mp4', instructions: 'Halteres com pegada neutra (palmas voltadas uma para outra). Flexione mantendo os punhos neutros. Desça controlado.', createdAt: 0 },
  { id: 'ex-biceps-04', name: 'Rosca Scott Unilateral', muscleGroup: 'biceps', category: 'strength', mediaFilename: 'dumbbell_single_arm_preacher_curl.mp4', instructions: 'Braço apoiado no banco Scott, halter em pegada supinada. Flexione sem mover o cotovelo. Desça até quase estender o braço.', createdAt: 0 },
  { id: 'ex-biceps-05', name: 'Rosca Concentrada', muscleGroup: 'biceps', category: 'strength', mediaFilename: 'dumbbell_concentration_curl.mp4', instructions: 'Sentado, cotovelo apoiado na parte interna da coxa. Flexione o braço em direção ao ombro mantendo o cotovelo fixo.', createdAt: 0 },

  // TRÍCEPS (triceps)
  { id: 'ex-triceps-01', name: 'Tríceps Testa com Halteres', muscleGroup: 'triceps', category: 'strength', mediaFilename: 'dumbbell_skullcrusher.mp4', instructions: 'Deitado no banco, halteres acima do peito com braços estendidos. Flexione só os cotovelos levando os halteres próximos à testa. Estenda de volta.', createdAt: 0 },
  { id: 'ex-triceps-02', name: 'Extensão de Tríceps Acima da Cabeça', muscleGroup: 'triceps', category: 'strength', mediaFilename: 'dumbbell_overhead_tricep_extension.mp4', instructions: 'Sentado ou em pé, segure um halter com as duas mãos acima da cabeça. Flexione os cotovelos descendo o halter atrás da cabeça. Estenda de volta.', createdAt: 0 },
  { id: 'ex-triceps-03', name: 'Tríceps Coice', muscleGroup: 'triceps', category: 'strength', mediaFilename: 'dumbbell_tricep_kickback.mp4', instructions: 'Tronco inclinado, cotovelo flexionado próximo ao tronco. Estenda o braço para trás até a linha do ombro. Retorne controlado.', createdAt: 0 },
  { id: 'ex-triceps-04', name: 'Mergulho entre Bancos', muscleGroup: 'triceps', category: 'calisthenics', mediaFilename: 'bench_dips.mp4', instructions: 'Mãos em um banco atrás de você, pés no chão ou em outro banco. Desça flexionando os cotovelos. Empurre de volta.', createdAt: 0 },
  { id: 'ex-triceps-05', name: 'Flexão Fechada', muscleGroup: 'triceps', category: 'calisthenics', mediaFilename: 'close_grip_pushup.mp4', instructions: 'Flexão com mãos próximas entre si, cotovelos colados ao corpo na descida. Empurre de volta contraindo o tríceps.', createdAt: 0 },

  // PERNAS (legs)
  { id: 'ex-legs-01', name: 'Agachamento Livre com Barra', muscleGroup: 'legs', category: 'strength', mediaFilename: 'barbell_squat.mp4', instructions: 'Barra apoiada nos trapézios, pés na largura dos ombros. Desça flexionando quadril e joelhos até coxas paralelas ao chão. Suba empurrando o chão.', createdAt: 0 },
  { id: 'ex-legs-02', name: 'Agachamento Goblet', muscleGroup: 'legs', category: 'strength', mediaFilename: 'dumbbell_goblet_squat.mp4', instructions: 'Segure um halter verticalmente contra o peito. Agache mantendo o tronco ereto. Suba empurrando pelos calcanhares.', createdAt: 0 },
  { id: 'ex-legs-03', name: 'Afundo com Halteres', muscleGroup: 'legs', category: 'strength', mediaFilename: 'dumbbell_lunge.mp4', instructions: 'Halteres ao lado do corpo. Dê um passo à frente e desça flexionando os dois joelhos em 90°. Empurre de volta à posição inicial.', createdAt: 0 },
  { id: 'ex-legs-04', name: 'Stiff com Halteres', muscleGroup: 'legs', category: 'strength', mediaFilename: 'dumbbell_stiff_deadlift.mp4', instructions: 'Halteres à frente das coxas, joelhos levemente flexionados. Desça inclinando o quadril para trás, costas neutras, até sentir posteriores. Suba contraindo glúteos.', createdAt: 0 },
  { id: 'ex-legs-05', name: 'Elevação de Panturrilha', muscleGroup: 'legs', category: 'strength', mediaFilename: 'dumbbell_calf_raise.mp4', instructions: 'Em pé com halteres, suba na ponta dos pés contraindo panturrilhas. Desça controlado até a posição inicial.', createdAt: 0 },
  { id: 'ex-legs-06', name: 'Agachamento Búlgaro', muscleGroup: 'legs', category: 'strength', mediaFilename: 'dumbbell_bulgarian_split_squat.mp4', instructions: 'Pé de trás apoiado em banco, halteres ao lado. Desça flexionando o joelho da frente. Suba empurrando pela perna da frente.', createdAt: 0 },
  { id: 'ex-legs-07', name: 'Agachamento Pistol', muscleGroup: 'legs', category: 'calisthenics', mediaFilename: 'pistol_squat.mp4', instructions: 'Agachamento em uma perna só, outra perna estendida à frente. Desça controlado e suba com força na perna de apoio.', createdAt: 0 },

  // CORE
  { id: 'ex-core-01', name: 'Prancha Abdominal', muscleGroup: 'core', category: 'calisthenics', mediaFilename: 'plank.mp4', instructions: 'Apoio nos antebraços e pontas dos pés, corpo alinhado em linha reta. Contraia core e glúteos. Mantenha pelo tempo determinado.', createdAt: 0 },
  { id: 'ex-core-02', name: 'Prancha Lateral', muscleGroup: 'core', category: 'calisthenics', mediaFilename: 'side_plank.mp4', instructions: 'Apoio em um antebraço e lateral do pé, corpo alinhado. Quadril elevado. Mantenha contraindo oblíquos.', createdAt: 0 },
  { id: 'ex-core-03', name: 'Abdominal Crunch', muscleGroup: 'core', category: 'calisthenics', mediaFilename: 'crunch.mp4', instructions: 'Deitado de costas, joelhos flexionados. Eleve o tronco até as escápulas saírem do chão contraindo o abdômen. Desça controlado.', createdAt: 0 },
  { id: 'ex-core-04', name: 'Elevação de Pernas', muscleGroup: 'core', category: 'calisthenics', mediaFilename: 'leg_raise.mp4', instructions: 'Deitado de costas, pernas estendidas. Eleve as pernas até 90° mantendo a lombar no chão. Desça controlado sem tocar o chão.', createdAt: 0 },
  { id: 'ex-core-05', name: 'Russian Twist', muscleGroup: 'core', category: 'calisthenics', mediaFilename: 'russian_twist.mp4', instructions: 'Sentado com tronco inclinado e pés elevados. Gire o tronco de um lado para o outro tocando as mãos (ou peso) no chão.', createdAt: 0 },

  // CORPO INTEIRO (full_body)
  { id: 'ex-fullbody-01', name: 'Burpee', muscleGroup: 'full_body', category: 'calisthenics', mediaFilename: 'burpee.mp4', instructions: 'Desça ao chão, faça uma flexão, recolha as pernas, salte para cima. Repita fluidamente.', createdAt: 0 },
  { id: 'ex-fullbody-02', name: 'Mountain Climber', muscleGroup: 'full_body', category: 'calisthenics', mediaFilename: 'mountain_climber.mp4', instructions: 'Em posição de prancha alta, traga os joelhos alternadamente em direção ao peito em ritmo acelerado.', createdAt: 0 },
  { id: 'ex-fullbody-03', name: 'Bear Crawl', muscleGroup: 'full_body', category: 'calisthenics', mediaFilename: 'bear_crawl.mp4', instructions: 'Apoio nas mãos e pés com joelhos próximos ao chão sem tocar. Avance com braço e perna opostos simultaneamente.', createdAt: 0 },
  { id: 'ex-fullbody-04', name: 'Thruster com Halteres', muscleGroup: 'full_body', category: 'strength', mediaFilename: 'dumbbell_thruster.mp4', instructions: 'Halteres na altura dos ombros. Agache e, ao subir, empurre os halteres acima da cabeça em um movimento único.', createdAt: 0 },
];

// Define createdAt em todos no momento da importação
const NOW = Date.now();
DEFAULT_EXERCISES.forEach(ex => { ex.createdAt = NOW; });
```

- [ ] **Step 2: Criar `src/database/seeds/runSeeds.ts`**

```typescript
import { exerciseRepository } from '@/database/repositories/exerciseRepository';
import { DEFAULT_EXERCISES } from './defaultExercises';

export function runSeeds(): void {
  if (exerciseRepository.count() === 0) {
    exerciseRepository.insertMany(DEFAULT_EXERCISES);
    console.log(`Seeded ${DEFAULT_EXERCISES.length} exercises`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/database/seeds/
git commit -m "feat: add default exercise seed (~45 exercises) and seed runner"
```

---

## Task 17: Media resolver

**Files:**
- Create: `src/database/mediaResolver.ts`
- Create: `__tests__/unit/mediaResolver.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/unit/mediaResolver.test.ts`:
```typescript
import { resolveMedia } from '@/database/mediaResolver';

describe('resolveMedia', () => {
  it('returns null for null filename', () => {
    expect(resolveMedia(null)).toBeNull();
  });

  it('returns null for unknown filename', () => {
    expect(resolveMedia('does_not_exist.mp4')).toBeNull();
  });

  it('returns a numeric require id for a known filename', () => {
    expect(typeof resolveMedia('dumbbell_bench_press.mp4')).toBe('number');
  });
});
```

- [ ] **Step 2: Verificar teste falha**

Run: `pnpm test mediaResolver`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Criar `src/database/mediaResolver.ts`. O mapa deve conter **apenas** arquivos MP4 que existem em `assets/media/`. Verificar antes com:
```bash
find assets/media -name '*.mp4' | sort
```

Depois, criar o arquivo mapeando cada MP4 existente (ajustar a lista conforme a saída do `find`):
```typescript
const mediaMap: Record<string, number> = {
  // chest
  'dumbbell_bench_press.mp4': require('../../assets/media/chest/dumbbell_bench_press.mp4'),
  'dumbbell_incline_bench_press.mp4': require('../../assets/media/chest/dumbbell_incline_bench_press.mp4'),
  'dumbbell_chest_fly.mp4': require('../../assets/media/chest/dumbbell_chest_fly.mp4'),
  'dumbbell_incline_chest_flys.mp4': require('../../assets/media/chest/dumbbell_incline_chest_flys.mp4'),
  // back
  'dumbbell_kneeling_single_arm_row.mp4': require('../../assets/media/back/dumbbell_kneeling_single_arm_row.mp4'),
  'dumbbell_laying_incline_row.mp4': require('../../assets/media/back/dumbbell_laying_incline_row.mp4'),
  // shoulder
  'dumbbell_lateral_raise.mp4': require('../../assets/media/shoulder/dumbbell_lateral_raise.mp4'),
  'dumbbell_front_raise.mp4': require('../../assets/media/shoulder/dumbbell_front_raise.mp4'),
  // biceps
  'dumbbell_curl.mp4': require('../../assets/media/biceps/dumbbell_curl.mp4'),
  'dumbbell_single_arm_preacher_curl.mp4': require('../../assets/media/biceps/dumbbell_single_arm_preacher_curl.mp4'),
  // triceps
  'dumbbell_skullcrusher.mp4': require('../../assets/media/triceps/dumbbell_skullcrusher.mp4'),
  'dumbbell_overhead_tricep_extension.mp4': require('../../assets/media/triceps/dumbbell_overhead_tricep_extension.mp4'),
};

export function resolveMedia(filename: string | null): number | null {
  if (!filename) return null;
  return mediaMap[filename] ?? null;
}
```

**Importante:** se novos MP4s forem adicionados depois, esse mapa precisa ser atualizado à mão.

- [ ] **Step 4: Verificar teste passa**

Run: `pnpm test mediaResolver`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/database/mediaResolver.ts __tests__/unit/mediaResolver.test.ts
git commit -m "feat: add media resolver with require map of bundled MP4s"
```

---

## Task 18: Store — useExerciseStore

**Files:**
- Create: `src/store/useExerciseStore.ts`

- [ ] **Step 1: Criar `src/store/useExerciseStore.ts`**

```typescript
import { create } from 'zustand';
import { Exercise } from '@/types/exercise';
import { MuscleGroupKey } from '@/constants/muscleGroups';
import { CategoryKey } from '@/constants/categories';
import { exerciseRepository } from '@/database/repositories/exerciseRepository';

interface ExerciseState {
  all: Exercise[];
  search: string;
  muscleGroup: MuscleGroupKey | 'all';
  category: CategoryKey | 'all';
  loaded: boolean;

  load: () => void;
  setSearch: (s: string) => void;
  setMuscleGroup: (g: MuscleGroupKey | 'all') => void;
  setCategory: (c: CategoryKey | 'all') => void;
  filtered: () => Exercise[];
  findById: (id: string) => Exercise | undefined;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  all: [],
  search: '',
  muscleGroup: 'all',
  category: 'all',
  loaded: false,

  load: () => {
    const all = exerciseRepository.findAll();
    set({ all, loaded: true });
  },

  setSearch: (s) => set({ search: s }),
  setMuscleGroup: (g) => set({ muscleGroup: g }),
  setCategory: (c) => set({ category: c }),

  filtered: () => {
    const { all, search, muscleGroup, category } = get();
    const q = search.trim().toLowerCase();
    return all.filter(ex => {
      if (muscleGroup !== 'all' && ex.muscleGroup !== muscleGroup) return false;
      if (category !== 'all' && ex.category !== category && ex.category !== 'both') return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  findById: (id) => get().all.find(ex => ex.id === id),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/store/useExerciseStore.ts
git commit -m "feat: add useExerciseStore with filters and search"
```

---

## Task 19: Componentes de exercício — ExerciseMedia

**Files:**
- Create: `src/components/exercise/ExerciseMedia.tsx`

- [ ] **Step 1: Criar `src/components/exercise/ExerciseMedia.tsx`**

```typescript
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resolveMedia } from '@/database/mediaResolver';
import { colors, radius } from '@/theme';

interface Props {
  filename: string | null;
  paused?: boolean;
  style?: ViewStyle;
}

export function ExerciseMedia({ filename, paused = false, style }: Props) {
  const source = resolveMedia(filename);

  if (!source) {
    return (
      <View style={[styles.placeholder, style]}>
        <Icon name="fitness-center" size={48} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Video
        source={source}
        style={StyleSheet.absoluteFill}
        repeat
        muted
        paused={paused}
        resizeMode="cover"
        playInBackground={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    overflow: 'hidden',
    aspectRatio: 1,
  },
  placeholder: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/exercise/ExerciseMedia.tsx
git commit -m "feat: add ExerciseMedia component with video and placeholder fallback"
```

---

## Task 20: Componentes de exercício — ExerciseCard, Filters

**Files:**
- Create: `src/components/exercise/ExerciseCard.tsx`
- Create: `src/components/exercise/MuscleGroupFilter.tsx`
- Create: `src/components/exercise/CategoryFilter.tsx`
- Create: `src/components/exercise/index.ts`

- [ ] **Step 1: Criar `src/components/exercise/ExerciseCard.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/common';
import { ExerciseMedia } from './ExerciseMedia';
import { Exercise } from '@/types/exercise';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { colors, spacing, typography } from '@/theme';

interface Props {
  exercise: Exercise;
  onPress: () => void;
}

export function ExerciseCard({ exercise, onPress }: Props) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <ExerciseMedia filename={exercise.mediaFilename} paused style={styles.media} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{exercise.name}</Text>
          <Text style={styles.group}>{labelForMuscleGroup(exercise.muscleGroup)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  media: { width: 72, height: 72 },
  info: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.heading, color: colors.textPrimary },
  group: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Criar `src/components/exercise/MuscleGroupFilter.tsx`**

```typescript
import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUPS, MuscleGroupKey } from '@/constants/muscleGroups';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  value: MuscleGroupKey | 'all';
  onChange: (v: MuscleGroupKey | 'all') => void;
}

export function MuscleGroupFilter({ value, onChange }: Props) {
  const options: Array<{ key: MuscleGroupKey | 'all'; label: string }> = [
    { key: 'all', label: 'Todos' },
    ...MUSCLE_GROUP_ORDER.map(k => ({ key: k, label: MUSCLE_GROUPS[k] })),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.accent },
  label: { ...typography.caption, color: colors.textSecondary },
  labelActive: { color: colors.textPrimary, fontWeight: '600' },
});
```

- [ ] **Step 3: Criar `src/components/exercise/CategoryFilter.tsx`**

```typescript
import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { CATEGORIES, CategoryKey } from '@/constants/categories';
import { colors, spacing, radius, typography } from '@/theme';

interface Props {
  value: CategoryKey | 'all';
  onChange: (v: CategoryKey | 'all') => void;
}

export function CategoryFilter({ value, onChange }: Props) {
  const options: Array<{ key: CategoryKey | 'all'; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'strength', label: CATEGORIES.strength },
    { key: 'calisthenics', label: CATEGORIES.calisthenics },
  ];
  return (
    <View style={styles.row}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: colors.accentSecondary },
  label: { ...typography.caption, color: colors.textSecondary },
  labelActive: { color: colors.textPrimary, fontWeight: '600' },
});
```

- [ ] **Step 4: Criar barrel `src/components/exercise/index.ts`**

```typescript
export { ExerciseMedia } from './ExerciseMedia';
export { ExerciseCard } from './ExerciseCard';
export { MuscleGroupFilter } from './MuscleGroupFilter';
export { CategoryFilter } from './CategoryFilter';
```

- [ ] **Step 5: Commit**

```bash
git add src/components/exercise/
git commit -m "feat: add ExerciseCard, MuscleGroupFilter, CategoryFilter components"
```

---

## Task 21: Screens — ExerciseLibraryScreen

**Files:**
- Create: `src/screens/exercise/ExerciseLibraryScreen.tsx`

- [ ] **Step 1: Criar `src/screens/exercise/ExerciseLibraryScreen.tsx`**

```typescript
import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useExerciseStore } from '@/store/useExerciseStore';
import {
  ExerciseCard,
  MuscleGroupFilter,
  CategoryFilter,
} from '@/components/exercise';
import { Input, EmptyState } from '@/components/common';
import { ExerciseStackParamList } from '@/navigation/ExerciseStack';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<ExerciseStackParamList, 'ExerciseLibrary'>;

export function ExerciseLibraryScreen({ navigation }: Props) {
  const {
    search, setSearch,
    muscleGroup, setMuscleGroup,
    category, setCategory,
    filtered,
  } = useExerciseStore();

  const data = filtered();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchWrapper}>
        <Input
          placeholder="Buscar exercício..."
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <MuscleGroupFilter value={muscleGroup} onChange={setMuscleGroup} />
      <CategoryFilter value={category} onChange={setCategory} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="search-off"
            title="Nenhum exercício encontrado"
            subtitle="Tente ajustar os filtros ou a busca"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrapper: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { padding: spacing.md, flexGrow: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/exercise/ExerciseLibraryScreen.tsx
git commit -m "feat: add ExerciseLibraryScreen with search and filters"
```

---

## Task 22: Screens — ExerciseDetailScreen

**Files:**
- Create: `src/screens/exercise/ExerciseDetailScreen.tsx`

- [ ] **Step 1: Criar `src/screens/exercise/ExerciseDetailScreen.tsx`**

```typescript
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useExerciseStore } from '@/store/useExerciseStore';
import { ExerciseMedia } from '@/components/exercise';
import { Badge, EmptyState } from '@/components/common';
import { labelForMuscleGroup } from '@/constants/muscleGroups';
import { labelForCategory } from '@/constants/categories';
import { ExerciseStackParamList } from '@/navigation/ExerciseStack';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<ExerciseStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen({ route }: Props) {
  const { exerciseId } = route.params;
  const exercise = useExerciseStore(s => s.findById(exerciseId));

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState icon="error-outline" title="Exercício não encontrado" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ExerciseMedia filename={exercise.mediaFilename} style={styles.media} />
        <Text style={styles.name}>{exercise.name}</Text>
        <View style={styles.badges}>
          <Badge label={labelForMuscleGroup(exercise.muscleGroup)} />
          <Badge label={labelForCategory(exercise.category)} color={colors.primaryLight} />
        </View>
        <Text style={styles.sectionTitle}>Como executar</Text>
        <Text style={styles.instructions}>{exercise.instructions}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  media: { width: '100%', marginBottom: spacing.lg },
  name: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  instructions: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/exercise/ExerciseDetailScreen.tsx
git commit -m "feat: add ExerciseDetailScreen with video and instructions"
```

---

## Task 23: Placeholder screen

**Files:**
- Create: `src/screens/placeholders/ComingSoonScreen.tsx`

- [ ] **Step 1: Criar `src/screens/placeholders/ComingSoonScreen.tsx`**

```typescript
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/common';
import { colors } from '@/theme';

interface Props {
  title?: string;
}

export function ComingSoonScreen({ title = 'Em breve' }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <EmptyState icon="construction" title={title} subtitle="Esta funcionalidade está em desenvolvimento" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/placeholders/
git commit -m "feat: add ComingSoonScreen placeholder for upcoming tabs"
```

---

## Task 24: Navegação — ExerciseStack

**Files:**
- Create: `src/navigation/ExerciseStack.tsx`

- [ ] **Step 1: Criar `src/navigation/ExerciseStack.tsx`**

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExerciseLibraryScreen } from '@/screens/exercise/ExerciseLibraryScreen';
import { ExerciseDetailScreen } from '@/screens/exercise/ExerciseDetailScreen';
import { colors } from '@/theme';

export type ExerciseStackParamList = {
  ExerciseLibrary: undefined;
  ExerciseDetail: { exerciseId: string };
};

const Stack = createNativeStackNavigator<ExerciseStackParamList>();

export function ExerciseStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="ExerciseLibrary"
        component={ExerciseLibraryScreen}
        options={{ title: 'Exercícios' }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Detalhe' }}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/navigation/ExerciseStack.tsx
git commit -m "feat: add ExerciseStack with library and detail screens"
```

---

## Task 25: Navegação — AppNavigator (Bottom Tabs)

**Files:**
- Create: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Criar `src/navigation/AppNavigator.tsx`**

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ExerciseStack } from './ExerciseStack';
import { ComingSoonScreen } from '@/screens/placeholders/ComingSoonScreen';
import { colors } from '@/theme';

const Tab = createBottomTabNavigator();

const WorkoutsPlaceholder = () => <ComingSoonScreen title="Treinos" />;
const HistoryPlaceholder = () => <ComingSoonScreen title="Histórico" />;
const MusicPlaceholder = () => <ComingSoonScreen title="Música" />;

export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.accent,
          background: colors.background,
          card: colors.primary,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.primary, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ color, size }) => {
            const iconByRoute: Record<string, string> = {
              Workouts: 'fitness-center',
              Exercises: 'sports-gymnastics',
              History: 'history',
              Music: 'music-note',
            };
            return <Icon name={iconByRoute[route.name] ?? 'circle'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Workouts" component={WorkoutsPlaceholder} options={{ title: 'Treinos' }} />
        <Tab.Screen name="Exercises" component={ExerciseStack} options={{ title: 'Exercícios' }} />
        <Tab.Screen name="History" component={HistoryPlaceholder} options={{ title: 'Histórico' }} />
        <Tab.Screen name="Music" component={MusicPlaceholder} options={{ title: 'Música' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: add AppNavigator with Bottom Tabs (Workouts, Exercises, History, Music)"
```

---

## Task 26: App.tsx — bootstrap

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Substituir conteúdo de `App.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@/navigation/AppNavigator';
import { runMigrations } from '@/database/migrations';
import { runSeeds } from '@/database/seeds/runSeeds';
import { useExerciseStore } from '@/store/useExerciseStore';
import { colors } from '@/theme';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadExercises = useExerciseStore(s => s.load);

  useEffect(() => {
    try {
      runMigrations();
      runSeeds();
      loadExercises();
      setReady(true);
    } catch (e) {
      console.error('Bootstrap failed', e);
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    }
  }, [loadExercises]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erro ao iniciar o app:</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
});

export default App;
```

- [ ] **Step 2: Rebuild do zero (libs nativas + assets novos)**

Run:
```bash
cd android && ./gradlew clean && cd ..
pnpm start --reset-cache
```
(deixar Metro rodando; em outro terminal:)
```bash
pnpm android
```
Expected: app abre com splash rápido, depois Bottom Tabs visíveis. Tab Exercícios mostra lista.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: wire up App.tsx with migrations, seeds, and navigation"
```

---

## Task 27: Smoke test manual no device

**Files:** nenhum (apenas validação)

- [ ] **Step 1: Rodar suite de testes**

Run: `pnpm test`
Expected: todos os testes unitários passam (generateId, mediaResolver).

- [ ] **Step 2: Verificar cada funcionalidade no device**

Abrir o app no device físico e validar:
- [ ] Splash rápido, depois tabs aparecem
- [ ] Tab "Exercícios" abre e mostra lista com ~45 exercícios
- [ ] Barra de busca filtra por nome em tempo real
- [ ] Clicar em um chip de grupo muscular filtra a lista
- [ ] Clicar em "Musculação" ou "Calistenia" filtra por categoria
- [ ] Combinar busca + filtros funciona
- [ ] Limpar busca e selecionar "Todos" volta todos os exercícios
- [ ] Tocar em um exercício com MP4 disponível abre tela de detalhe com vídeo em loop, sem som
- [ ] Tocar em um exercício sem MP4 disponível mostra placeholder (ícone de halter)
- [ ] Instruções aparecem legíveis na tela de detalhe
- [ ] Botão de voltar retorna à lista mantendo filtros aplicados
- [ ] Tabs "Treinos", "Histórico", "Música" mostram a tela "Em breve"

- [ ] **Step 3: Testar fechar e abrir o app**

Fechar o app (swipe no app switcher) e abrir de novo. Exercícios devem continuar carregando instantaneamente (seed não roda de novo).

- [ ] **Step 4: Adicionar README básico**

Criar `/home/nikolas-dev/Dev/treino.app/README.md`:
```markdown
# Treino.app

App pessoal de treinos em React Native. Veja `CLAUDE.md` para o spec completo.

## Desenvolvimento

```bash
pnpm install
pnpm start          # Metro bundler
pnpm android        # Build e instala em device/emulador
pnpm test           # Testes unitários
```

## Fase atual

Fase 1+2: Fundação + Biblioteca de exercícios (read-only). Próximas fases em `docs/superpowers/`.
```

- [ ] **Step 5: Commit final**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```

---

## Notas para implementação

- **Se algum teste falhar:** investigar antes de prosseguir; não ignorar.
- **Se rebuild do Android falhar por cache:** `cd android && ./gradlew clean && cd ..` e tentar de novo.
- **Adicionar novos MP4s depois:** jogar o arquivo em `assets/media/<grupo>/<filename>.mp4`, adicionar entrada no `mediaResolver.ts`, e criar/editar exercício no `defaultExercises.ts` (ou aguardar UI de customização da Fase 3+).
- **Android Studio não abre device:** rodar `adb devices` para confirmar conexão; autorizar depuração USB no celular.
- **op-sqlite falhando:** confirmar que `pnpm android` foi rodado após instalar a lib (ela tem módulo nativo que precisa ser linkado).
