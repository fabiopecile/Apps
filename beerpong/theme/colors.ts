export const colors = {
  background: '#0A0A0A',
  backgroundElevated: '#141414',
  backgroundCard: '#161A16',
  backgroundGrid: '#1E1E1E',

  neon: '#39FF14',
  neonAlt: '#00FF66',
  neonDim: 'rgba(57, 255, 20, 0.35)',
  neonFaint: 'rgba(57, 255, 20, 0.12)',
  neonGlow: 'rgba(57, 255, 20, 0.55)',

  textPrimary: '#F5F7F5',
  textSecondary: '#9BA39B',
  textMuted: '#5C635C',

  border: 'rgba(57, 255, 20, 0.22)',
  borderFaint: 'rgba(255, 255, 255, 0.08)',

  danger: '#FF3B4E',
  warning: '#FFC94A',
  gold: '#FFD23D',

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
