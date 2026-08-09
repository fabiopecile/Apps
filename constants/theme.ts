export const colors = {
  background: '#0A0A0F',
  surface: '#12141C',
  surfaceAlt: '#181B26',
  card: '#151824',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#F5F6FA',
  textMuted: '#9AA0AC',
  textFaint: '#6B7180',

  red: '#E8332B',
  redDark: '#B4241D',
  redGlow: 'rgba(232,51,43,0.35)',

  blue: '#3D5AFE',
  blueDark: '#1B2A6B',
  blueGlow: 'rgba(61,90,254,0.45)',

  gold: '#F5A623',
  goldDark: '#7A4B12',

  success: '#33C46B',
  danger: '#E8332B',

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
