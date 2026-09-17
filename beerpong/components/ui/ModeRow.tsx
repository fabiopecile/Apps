import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { Reveal } from './Reveal';
import { AMBIENT, useAmbientLoop } from '@/lib/ambient';
import { useFeedback } from '@/lib/feedback';
import { colors, fonts, radius, spacing } from '@/theme';

/**
 * One way into the app, written quietly.
 *
 * These used to be the whole hub: ten of them, each with a coloured border, a
 * coloured icon ring and a coloured halo, in six different colours. Every one
 * was as loud as every other, so the screen had no first thing to look at —
 * which is what it means to say a design has no hierarchy.
 *
 * What changed is what the accent is allowed to touch. It tints the icon and
 * nothing else; the card itself is the same quiet hairline on every row, at the
 * same height, in the same rhythm. The colour still tells you which thing this
 * is — it just no longer competes to be the thing you do.
 *
 * The screen's one loud element is a `HeroCard` above these. There is exactly
 * one, and it is never one of these.
 *
 * A sheen crosses each row once every nine seconds, a little later on each one
 * down the list, so a light appears to travel down the stack. It is the quietest
 * of the ambient effects on purpose: these rows are a list to be read, and a
 * list that sparkles is a list nobody reads.
 */
export function ModeRow({
  icon,
  title,
  subtitle,
  href,
  accent = colors.you,
  locked,
  badge,
  index = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  href: Href;
  /** Tints the icon only. Use a semantic colour from the theme. */
  accent?: string;
  locked?: boolean;
  badge?: number;
  index?: number;
}) {
  const feedback = useFeedback();
  const tint = locked ? colors.locked : accent;
  const { width } = useWindowDimensions();
  const glint = useAmbientLoop(AMBIENT.glint, { delay: index * AMBIENT.glintStagger });

  /**
   * The sheen crosses in the first sixth of the cycle and is parked off the
   * left edge for the rest of it.
   *
   * Written as one interpolation with a hard step back rather than as a
   * sequence of animations, because a sequence restarted by `withRepeat` picks
   * up from wherever it ended — which is the far side — and the second lap then
   * travels backwards.
   */
  const sheen = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(glint.value, [0, 0.17, 0.171, 1], [-width, width, -width, -width]) },
    ],
  }));

  return (
    <Reveal index={index}>
      <PressableScale
        onPress={() => {
          feedback.tap();
          router.push(href);
        }}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        {/* Behind the content and clipped by the row's own rounded corners, so
            it passes under the text rather than washing over it. A locked row
            stays dark: a light sweeping across something greyed out reads as
            "this is available", which is the opposite of what it says. */}
        {locked ? null : (
          <Animated.View style={[styles.sheen, sheen]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(57, 255, 20, 0)', 'rgba(57, 255, 20, 0.07)', 'rgba(57, 255, 20, 0)']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <View style={[styles.icon, { borderColor: locked ? colors.borderQuiet : tint }]}>
          <Ionicons name={locked ? 'lock-closed' : icon} size={18} color={tint} />
        </View>
        <View style={styles.text}>
          <Text
            style={[styles.title, locked && { color: colors.locked }]}
            selectable={false}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.subtitle, locked && { color: colors.locked }]}
            selectable={false}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} selectable={false}>
              {badge}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </PressableScale>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // A fixed height rather than padding: rows of the same height read as a
    // list, rows that grow with their text read as a pile of cards.
    height: 62,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderQuiet,
    backgroundColor: colors.backgroundCard,
    marginBottom: spacing.sm,
    // Needed by the sheen: without it the gradient runs past the rounded
    // corners and the row briefly turns into a rectangle.
    overflow: 'hidden',
  },
  /** A third of the row wide, so it reads as a passing highlight, not a wipe. */
  sheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '34%',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: {
    fontFamily: fonts.headingBlack,
    fontSize: 17,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.reward,
  },
  badgeText: {
    fontFamily: fonts.numeric,
    fontSize: 12,
    color: colors.background,
  },
});
