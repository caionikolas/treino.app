# Redesign — WorkoutPreviewScreen

**Data:** 2026-05-04
**Branch:** feat/planos
**Escopo:** Reescrever `src/screens/workout/WorkoutPreviewScreen.tsx` para casar com a linguagem visual dos mockups treino1-4 (telas de criação/configuração já implementadas).

---

## Decisões de design

1. **Header sem bloco colorido.** Label pequeno "Treino" + nome em accent grande + swatch pequena da cor. Linha meta sutil com contagem de exercícios, séries default, descanso default.
2. **Editar = ícone de lápis no header nav** (`headerRight`).
3. **Lista = card único surface** com `SettingRow` por exercício + última row "+ Adicionar exercício".
4. **Estado vazio** = card único com só a row de adicionar.
5. **Rodapé = pill button grande accent "Iniciar treino"**, disabled quando 0 exercícios.

---

## Layout

```
┌─────────────────────────────────┐
│ ← Treino A              ✏️       │  header nav
├─────────────────────────────────┤
│ Treino                    ●     │  label + swatch
│ Treino A                        │  nome accent grande
│ 6 exercícios · 3 séries · 1:30  │  meta
├─────────────────────────────────┤
│ Exercícios (6)                  │  section title
│ ┌─────────────────────────────┐ │
│ │ 1. Supino Reto      4×12 ›  │ │
│ │ 2. Crucifixo        3×10 ›  │ │
│ │ + Adicionar exercício       │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│       [ Iniciar treino ]        │  pill grande
└─────────────────────────────────┘
```

---

## Componentes

Reutiliza tudo que já existe — `SettingRow`, `Button`, `MaterialIcons`. Sem componentes novos.

## Critérios de aceite

- Header: label "Treino" + nome em accent + swatch + meta sutil.
- `headerRight` = ícone de lápis abrindo `WorkoutForm` em modo edit.
- Lista de exercícios em card único surface 16px raio.
- `SettingRow` por exercício: label `${i+1}. ${nome}`, value `${sets}x${reps}`, chevron, tap → `ExerciseInWorkout`.
- Última row do card: ícone `add`, label "Adicionar exercício", tap → `ExercisePicker`.
- Estado vazio mostra só a row de adicionar.
- Rodapé: `Button` pill accent "Iniciar treino", `disabled={exercises.length === 0}`.
- Persistência do draft no foco, fluxo de execução e modal de playlist permanecem inalterados.

## Fora de escopo

- Drag-and-drop para reordenar.
- Imagem/GIF do exercício na row.
- Mudar fluxo de "Iniciar treino".
