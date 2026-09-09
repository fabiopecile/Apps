// Dark UI with slightly cool-tinted neutrals rather than pure black/grey -
// the tint is what keeps a dark app from looking cheap. Accents are muted
// versions of the original brand colors: still recognisable, no longer neon.
export const colors = {
  background: '#0B0B0E',
  surface: '#131318',
  surfaceAlt: '#1C1C23',
  card: '#141419',
  border: '#22222B',
  borderStrong: '#2E2E39',

  text: '#F2F2F5',
  textMuted: '#9494A0',
  textFaint: '#61616C',

  red: '#E5484D',
  redDark: '#3A1416',
  redGlow: 'rgba(229,72,77,0.22)',

  blue: '#5B8DEF',
  blueDark: '#121A2B',
  blueGlow: 'rgba(91,141,239,0.22)',

  gold: '#E3B341',
  goldDark: '#2C2312',

  success: '#3DD68C',
  danger: '#E5484D',

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

// Tighter than before: oversized corner radii are what made the app read as
// playful rather than considered.
export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
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

// Headings get negative tracking, small uppercase labels get positive - the
// standard pairing that makes type look deliberate.
export const typography = {
  display: { fontWeight: '800' as const, letterSpacing: -0.6 },
  heading: { fontWeight: '700' as const, letterSpacing: -0.3 },
  label: { fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

// Depth via soft shadow instead of the coloured neon glow it replaces.
export const shadows = {
  blueButton: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  redGlow: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
} as const;
