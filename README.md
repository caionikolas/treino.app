# Treino.app

App pessoal de treinos em React Native para Android. Veja `CLAUDE.md` para o spec completo do projeto.

## Fase atual

**Fase 1 + 2: Fundação + Biblioteca de exercícios** (concluída, com limitação conhecida de reprodução de vídeo — ver `docs/superpowers/specs/2026-04-17-fundacao-biblioteca-exercicios-design.md` seção "Known Issues").

## Desenvolvimento

```bash
pnpm install
pnpm start          # Metro bundler
pnpm android        # Build e instala em device/emulador conectado
pnpm test           # Testes unitários
```

### Pré-requisitos

- Node 20+ (RN sugere 22+)
- pnpm 10+
- JDK 17
- Android Studio com SDK 34/35
- Device Android conectado via USB com depuração ativa, OU emulador rodando

### Adicionar vídeos de exercício

MP4s vão em `assets/media/<grupo_muscular>/<filename>.mp4`. Depois:

1. Adicione a entrada no mapa de `src/database/mediaResolver.ts`
2. Referencie `media_filename` no seed `src/database/seeds/defaultExercises.ts` (ou crie um exercício novo)

Os grupos musculares seguem o padrão em inglês: `chest`, `back`, `shoulder`, `biceps`, `triceps`, `legs`, `core`, `full_body`.

## Próximas fases

- Fase 3: CRUD de treinos
- Fase 4: Tela de execução (timer, séries, cronômetro)
- Fase 5: Histórico e gráficos de evolução
- Fase 6: Player de música
- Fase 7: APK assinado de release

Specs em `docs/superpowers/specs/`, planos em `docs/superpowers/plans/`.
