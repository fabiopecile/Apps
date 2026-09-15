import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

/**
 * The glow — and the rule that it is rationed.
 *
 * **At most one element per screen may use `hero`.** That is the whole design
 * change, stated as a rule rather than a taste: the arcade hub used to have ten
 * cards glowing in six colours, and a screen where everything shouts is a
 * screen where nothing leads. The player's eye should land on the thing they
 * came to do, and it can only land in one place.
 *
 * The three levels are roles, not sizes:
 *
 *   `hero`   the one thing. Bright enough to be the first thing seen.
 *   `lift`   an active or selected state — a chosen difficulty, the current
 *            tab. Visible when you look at it, invisible when you don't.
 *   `none`   the answer for almost everything.
 *
 * The old names (`soft`, `medium`, `strong`) still resolve, because they are
 * spread across three dozen call sites and quietly retuning them is what
 * actually made the app calmer: what used to be a `medium` halo on every single
 * button is now barely a lift. Where a `strong` was genuinely the hero of its
 * screen, the call site says `hero` now.
 *
 * Filled buttons deliberately get nothing. A solid neon fill on a near-black
 * screen is already the loudest thing on it; a halo on top was the app
 * competing with itself.
 */
export type GlowRole = 'hero' | 'lift' | 'none' | 'soft' | 'medium' | 'strong';

/**
 * `spread` is the number that bit.
 *
 * The web branch used to pass `radius / 2` as the CSS spread, which is a solid
 * ring of colour *before* any blur starts — at the hero's radius that was a
 * 13px band of flat green around the card, and it read as a light leak rather
 * than a glow. Blur alone, with no spread, is what a lamp actually looks like.
 * Screenshotted both; this is not a matter of taste.
 */
const LEVELS: Record<GlowRole, { radius: number; opacity: number; elevation: number }> = {
  hero: { radius: 30, opacity: 0.3, elevation: 10 },
  lift: { radius: 10, opacity: 0.14, elevation: 3 },
  none: { radius: 0, opacity: 0, elevation: 0 },
  // Retired names, retuned rather than removed. `medium` was the default on
  // every GlowButton in the app, which is why it now resolves to almost
  // nothing: the call sites that meant "this is the one" say `hero`.
  soft: { radius: 10, opacity: 0.14, elevation: 3 },
  medium: { radius: 12, opacity: 0.16, elevation: 4 },
  strong: { radius: 30, opacity: 0.3, elevation: 10 },
};

export function glow(role: GlowRole = 'lift', color: string = colors.you): ViewStyle {
  const level = LEVELS[role];
  if (level.radius === 0) return {};

  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0 0 ${level.radius}px 0 ${hexToRgba(color, level.opacity)}`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: level.opacity,
      shadowRadius: level.radius,
      elevation: level.elevation,
    },
  }) as ViewStyle;
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
