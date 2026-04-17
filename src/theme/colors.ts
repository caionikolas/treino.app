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
