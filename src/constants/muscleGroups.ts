export const MUSCLE_GROUPS = {
  chest: 'Peito',
  back: 'Costas',
  shoulder: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Quadríceps',
  hamstrings: 'Posteriores',
  glutes: 'Glúteos',
  legs: 'Pernas',
  core: 'Core',
  full_body: 'Corpo Inteiro',
} as const;

export type MuscleGroupKey = keyof typeof MUSCLE_GROUPS;

export const MUSCLE_GROUP_ORDER: MuscleGroupKey[] = [
  'chest', 'back', 'shoulder', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'legs', 'core', 'full_body',
];

export function labelForMuscleGroup(key: string): string {
  return MUSCLE_GROUPS[key as MuscleGroupKey] ?? key;
}
