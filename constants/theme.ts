export const colors = {
  background: '#000000',
  surface: '#0a0a0a',
  surfaceAlt: '#1a1a1a',
  card: '#1a1a1a',
  border: '#262626',
  borderStrong: '#333333',

  text: '#ffffff',
  textMuted: '#9ca3af',
  textFaint: '#6b7280',

  red: '#DC2626',
  redDark: '#7f1d1d',
  redGlow: 'rgba(220,38,38,0.4)',

  blue: '#3b82f6',
  blueDark: '#0f172a',
  blueGlow: 'rgba(59,130,246,0.45)',

  gold: '#fbbf24',
  goldDark: '#78350f',

  success: '#22c55e',
  danger: '#DC2626',

  black: '#000000',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
} as const;

export const shadows = {
  blueButton: {
    shadowColor: colors.blue,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  redGlow: {
    shadowColor: colors.red,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;
