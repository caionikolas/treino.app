import { MasteryLevel, ProgressionKind } from '@/types/boss';

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: 'Não começou',
  1: 'Aprendido',
  2: 'Dominado',
  3: 'Masterizado',
};

// Alvo textual por nível (1..3), conforme o tipo da progressão
export const MASTERY_TARGETS: Record<ProgressionKind, Record<1 | 2 | 3, string>> = {
  reps: { 1: '1 rep limpa', 2: '3 reps limpas', 3: '10 reps limpas' },
  isometric: { 1: '3 segundos', 2: '10 segundos', 3: '15 segundos' },
};
