export const CATEGORIES = {
  strength: 'Musculação',
  calisthenics: 'Calistenia',
  both: 'Ambos',
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function labelForCategory(key: string): string {
  return CATEGORIES[key as CategoryKey] ?? key;
}
