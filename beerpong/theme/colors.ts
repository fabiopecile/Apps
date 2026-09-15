/**
 * The palette, and what each colour is allowed to mean.
 *
 * The rule that matters here is the one that was missing: **colour carries a
 * meaning, it is not a mood.** Before this, a screen picked green or gold or
 * purple for whatever looked good in that spot — the arcade hub had ten cards
 * in six colours, and none of them told you anything. A player learns nothing
 * from a palette that says something different on every screen.
 *
 * So the semantic block below is the vocabulary, and screens use it rather than
 * reaching for a raw hex:
 *
 *   `you`       the player, and anything that means go. One per screen.
 *   `rival`     the other side of the table.
 *   `reward`    coins, prizes, anything earned.
 *   `locked`    not available yet — never a colour, always this grey.
 *   `danger`    something went wrong. Deliberately NOT the rival colour, or a
 *               lost match and a failed payment look the same.
 *
 * The raw names below it (`neon`, `gold`, …) stay because the 3D table and the
 * cup designs legitimately need pigments rather than roles. UI chrome should
 * use the semantic names.
 */

const NEON = '#39FF14';
const GOLD = '#FFD23D';

export const colors = {
  // The room the app lives in. Warmer and slightly greener than a pure black:
  // this is a table under a lamp, not a terminal.
  background: '#080A08',
  backgroundElevated: '#141814',
  backgroundCard: '#121712',
  backgroundGrid: '#1E1E1E',
  /**
   * The felt the whole app sits on — see `components/ui/GridBackground.tsx`.
   *
   * Kept weak on purpose. At the strength it started (0.55) the top third of
   * every screen was visibly green, and a card laid on it had to fight the
   * background to look like a card at all. It should register as "this room has
   * a light in it", not as a colour.
   */
  feltGlow: 'rgba(30, 60, 24, 0.30)',

  neon: NEON,
  neonAlt: '#00FF66',
  neonDim: 'rgba(57, 255, 20, 0.35)',
  neonFaint: 'rgba(57, 255, 20, 0.12)',
  neonGlow: 'rgba(57, 255, 20, 0.55)',

  // ---------------------------------------------------------------- semantic
  /** You, your rack, your turn, and every "do this now" button. */
  you: NEON,
  /** The opposite end of the table. */
  rival: '#FF6B5A',
  /** Coins, prize pots, claimable rewards. Nothing else is gold. */
  reward: GOLD,
  /** Locked, spent, over. Always this, never a dimmed colour. */
  locked: '#4A504A',

  textPrimary: '#F2F5F2',
  textSecondary: '#8B948B',
  textMuted: '#565C56',

  border: 'rgba(57, 255, 20, 0.22)',
  borderFaint: 'rgba(255, 255, 255, 0.07)',
  /** The hairline almost everything gets, now that almost nothing glows. */
  borderQuiet: 'rgba(255, 255, 255, 0.07)',

  danger: '#FF3B4E',
  warning: '#FFC94A',
  gold: GOLD,

  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
