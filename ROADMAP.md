# Roadmap do Treino.app

Fases planejadas para entrega do app. Cada fase gera uma spec + um plano + ciclo de implementação.

---

## ✅ Fase 1 — Fundação

Setup do projeto RN CLI, TypeScript, SQLite com migrações, navegação base (Bottom Tabs), tema escuro, estrutura de pastas.

**Status:** Concluída (2026-04-17)
**Spec:** `docs/superpowers/specs/2026-04-17-fundacao-biblioteca-exercicios-design.md`
**Plano:** `docs/superpowers/plans/2026-04-17-fundacao-biblioteca-exercicios.md`

---

## ✅ Fase 2 — Biblioteca de exercícios

Seed de ~45 exercícios em PT-BR, filtros por grupo muscular e categoria, busca, tela de detalhe. Read-only no app.

**Status:** Concluída (2026-04-17, mesma spec/plano da Fase 1)
**Known issue:** reprodução de vídeo não funciona (rn-video v6 + RN 0.85 Fabric). Follow-up em `docs/superpowers/plans/2026-04-17-fix-video-playback.md`.

---

## ✅ Fase 3 — CRUD de treinos

Criar, editar, duplicar, apagar treinos. Picker de exercícios multi-add. Reordenar com ▲/▼. Configurar séries/reps/descanso por exercício.

**Status:** Concluída (2026-04-18)
**Spec:** `docs/superpowers/specs/2026-04-18-crud-treinos-design.md`
**Plano:** `docs/superpowers/plans/2026-04-18-crud-treinos.md`

---

## ⏳ Fase 4 — Execução do treino

Tela principal durante o treino: cronômetro geral, timer de descanso com vibração/som, input de carga e reps por série, GIF do exercício (quando o fix de vídeo estiver pronto), navegação entre exercícios, resumo ao finalizar, keep-awake.

**Tabelas:** `workout_sessions` e `session_sets` (já criadas na migration v1).
**Referência:** `CLAUDE.md` seção "Execução do Treino (tela principal durante o treino)".
**Status:** A iniciar.

---

## ⏳ Fase 5 — Histórico e evolução

Lista de sessões realizadas, detalhe de cada sessão, gráficos de evolução de carga por exercício, recordes pessoais (PRs), estatísticas gerais.

**Referência:** `CLAUDE.md` seção "Histórico e Evolução".

---

## ⏳ Fase 6 — Player de música

Leitura da biblioteca de mídia do Android, playlists de treino, mini player fixo durante execução, background playback e controles de lock screen via `react-native-track-player`.

**Referência:** `CLAUDE.md` seção "Player de Música".

---

## ⏳ Fase 7 — APK assinado de release

Gerar keystore, configurar gradle, build de release, instalação direta no device sem loja.

**Referência:** `CLAUDE.md` seção "Build e Instalação".

---

## Fluxo de trabalho por fase

Cada fase segue este ciclo:

1. `superpowers:brainstorming` — entendimento do escopo + design aprovado
2. Spec salva em `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
3. `superpowers:writing-plans` — plano de implementação task-by-task
4. Plano salvo em `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
5. `superpowers:subagent-driven-development` — execução por subagents
6. Smoke test manual no device
7. Commits em `main`, roadmap atualizado
