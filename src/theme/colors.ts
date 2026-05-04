export const colors = {
  primary: '#1E3031',
  primaryLight: '#243A3B',
  accent: '#6ED0D3',
  accentSecondary: '#4BA5A8',
  success: '#6ED0D3',
  warning: '#FFBB33',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CB0B1',
  background: '#1E3031',
  surface: '#243A3B',
  border: '#2E4445',
} as const;

export type ColorKey = keyof typeof colors;
