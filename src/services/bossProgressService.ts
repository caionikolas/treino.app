import { Boss, BossView, MasteryLevel, ProgressionView } from '@/types/boss';

export function buildBossView(
  boss: Boss,
  levels: Record<string, MasteryLevel>,
): BossView {
  const progressions: ProgressionView[] = boss.progressions
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(p => ({ ...p, masteryLevel: (levels[p.id] ?? 0) as MasteryLevel, locked: false }));

  for (let i = 0; i < progressions.length; i++) {
    progressions[i].locked = i === 0 ? false : progressions[i - 1].masteryLevel < 1;
  }

  const progressPoints = progressions.reduce((sum, p) => sum + p.masteryLevel, 0);
  const maxPoints = progressions.length * 3;
  const last = progressions[progressions.length - 1];
  const focus = progressions.find(p => !p.locked && p.masteryLevel < 3) ?? null;

  return {
    boss,
    progressions,
    progressPoints,
    maxPoints,
    skillUnlocked: !!last && last.masteryLevel >= 1,
    mastered: !!last && last.masteryLevel >= 3,
    focusName: focus ? focus.name : null,
  };
}

export function buildBossViews(
  bosses: Boss[],
  levels: Record<string, MasteryLevel>,
): BossView[] {
  return bosses
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(b => buildBossView(b, levels));
}
