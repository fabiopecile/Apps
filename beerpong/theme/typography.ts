export const fonts = {
  display: 'Orbitron_700Bold',
  displayBlack: 'Orbitron_900Black',
  displayMedium: 'Orbitron_500Medium',
  // Orbitron draws a slashed zero, which reads as an icon rather than "0" at
  // large sizes — use it for logo/wordmark text only, never bare numbers.
  // Numeric displays (scores, stats) use this instead: same condensed/black
  // weight family, but with unambiguous digits.
  numeric: 'BarlowCondensed_900Black',
  heading: 'BarlowCondensed_700Bold',
  headingBlack: 'BarlowCondensed_900Black',
  label: 'BarlowCondensed_600SemiBold',
  body: 'BarlowCondensed_500Medium',
  bodyRegular: 'BarlowCondensed_400Regular',
} as const;

export const type = {
  scoreHuge: { fontSize: 96, lineHeight: 100 },
  scoreLarge: { fontSize: 56, lineHeight: 60 },
  scoreMedium: { fontSize: 32, lineHeight: 36 },
  h1: { fontSize: 34, lineHeight: 38, letterSpacing: 0.5 },
  h2: { fontSize: 24, lineHeight: 28, letterSpacing: 0.5 },
  h3: { fontSize: 18, lineHeight: 22, letterSpacing: 0.4 },
  label: { fontSize: 13, lineHeight: 16, letterSpacing: 1.4 },
  body: { fontSize: 15, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;
