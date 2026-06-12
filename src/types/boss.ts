export type ProgressionKind = 'reps' | 'isometric';

// 0 = não começou, 1 = Aprendido, 2 = Dominado, 3 = Masterizado
export type MasteryLevel = 0 | 1 | 2 | 3;

export interface Progression {
  id: string;
  bossId: string;
  orderIndex: number;
  name: string;
  kind: ProgressionKind;
}

export interface Boss {
  id: string;
  name: string;
  icon: string; // nome de ícone MaterialIcons
  color: string; // hex
  description: string | null;
  orderIndex: number;
  progressions: Progression[];
}

// Progressão + estado derivado do usuário
export interface ProgressionView extends Progression {
  masteryLevel: MasteryLevel;
  locked: boolean;
}

// Chefão + progresso composto
export interface BossView {
  boss: Boss;
  progressions: ProgressionView[];
  progressPoints: number; // soma dos níveis
  maxPoints: number; // nº de progressões * 3
  skillUnlocked: boolean; // última progressão >= Aprendido
  mastered: boolean; // última progressão == Masterizado
  focusName: string | null; // 1ª progressão desbloqueada e não masterizada
}
