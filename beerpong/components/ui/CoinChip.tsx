import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { CountUp } from './CountUp';
import { AMBIENT, useAmbientLoop } from '@/lib/ambient';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * What you have to spend.
 *
 * This existed five times — in the hub, the shop, the knockout bracket, Lucky
 * Shot and the match screen — as five copies of the same twelve lines, and they
 * had already drifted: two different icon sizes, three different vertical
 * paddings, two different gaps. Nobody chose any of that; it is what copying
 * does over a year.
 *
 * It is one component now because the ambient pulse had to go somewhere, and
 * adding the same animation to five copies is how you end up with six.
 *
 * The pulse is the only ambient effect in the app that touches a *number*, so
 * it is the most restrained of them: no movement at all, just the gold catching
 * the light for a third of a second every six and a half. Nothing about the
 * figure changes — a counter that jiggles reads as a counter that is counting,
 * and this one is standing still.
 */
export function CoinChip({
  coins,
  count = true,
  quiet = false,
}: {
  coins: number;
  /**
   * Whether a changed total rolls up to its new value. Off where the number
   * changes mid-action and the roll would compete with what caused it.
   */
  count?: boolean;
  /**
   * Turns the ambient pulse off. Set on the match screen: that is the one place
   * in the app where something is being aimed, and the corner of the screen is
   * not allowed to move while it is.
   */
  quiet?: boolean;
}) {
  const pulse = useAmbientLoop(AMBIENT.coin);

  /**
   * Flat for most of the cycle, bright for a moment near the end.
   *
   * The bright point sits at 92% rather than in the middle so that the chip is
   * at rest when a screen opens — the loop starts at 0, and arriving on a
   * screen to find its coin counter already glowing looks like a notification.
   */
  const glint = useAnimatedStyle(() => {
    if (quiet) return { color: colors.gold };
    return {
      color: interpolateColor(
        pulse.value,
        [0, 0.86, 0.92, 0.98, 1],
        [colors.gold, colors.gold, '#FFF0B8', colors.gold, colors.gold]
      ),
    };
  });

  const ring = useAnimatedStyle(() => ({
    borderColor: quiet
      ? colors.border
      : interpolateColor(
          pulse.value,
          [0, 0.86, 0.92, 0.98, 1],
          [colors.border, colors.border, 'rgba(255, 210, 61, 0.55)', colors.border, colors.border]
        ),
  }));

  return (
    <Animated.View style={[styles.chip, ring]}>
      <Ionicons name="logo-bitcoin" size={14} color={colors.gold} />
      {count ? (
        <CountUp value={coins} style={styles.text} animatedStyle={glint} />
      ) : (
        <Animated.Text style={[styles.text, glint]} selectable={false}>
          {coins}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  text: {
    fontFamily: fonts.numeric,
    color: colors.gold,
    fontSize: 13,
  },
});
