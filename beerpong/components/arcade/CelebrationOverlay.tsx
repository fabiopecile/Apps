import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { Confetti } from '@/components/ui/Confetti';
import { CoinRain } from '@/components/ui/CoinRain';
import { GlowButton } from '@/components/ui/GlowButton';
import { useT } from '@/lib/i18n';
import { colors, fonts, glow, radius, spacing } from '@/theme';

const RAY_COUNT = 12;
const RAY_BOX = 240;

/**
 * The moments worth stopping for.
 *
 * One overlay, four motions, because the four things it announces do not feel
 * alike and should not move alike:
 *
 * - `promotion` slams up into rays and confetti: you climbed.
 * - `relegation` drops in from above and settles, dim and still: you fell.
 * - `levelUp` rises through expanding rings with coins falling: it accumulated.
 * - `trophy` lands and holds under a coin shower: a run finished.
 *
 * Relegation deliberately gets a real animation rather than the celebration
 * with the confetti switched off. Sliding downwards is the whole point of it,
 * and a still badge would read as a bug.
 */
export type CelebrationKind = 'promotion' | 'relegation' | 'levelUp' | 'trophy';

export interface CelebrationProps {
  kind: CelebrationKind;
  title: string;
  subtitle: string;
  /** The number in the badge — a division, a level, a win count. */
  badgeLabel: string;
  color: string;
  /** Shows an icon instead of the number. */
  icon?: keyof typeof Ionicons.glyphMap;
  onDismiss: () => void;
}

export function CelebrationOverlay({
  kind,
  title,
  subtitle,
  badgeLabel,
  color,
  icon,
  onDismiss,
}: CelebrationProps) {
  const t = useT();
  const badgeScale = useSharedValue(kind === 'relegation' ? 1.25 : 0.2);
  const badgeLift = useSharedValue(kind === 'relegation' ? -90 : 40);
  const raySpin = useSharedValue(0);
  const pulse = useSharedValue(0);
  /** 0 to 1, driving the rings that expand out of the badge on a level up. */
  const rings = useSharedValue(0);

  const rising = kind === 'promotion' || kind === 'levelUp' || kind === 'trophy';
  const showRays = kind === 'promotion' || kind === 'trophy';
  const showCoins = kind === 'levelUp' || kind === 'trophy';
  const showConfetti = kind === 'promotion' || kind === 'trophy';

  useEffect(() => {
    if (kind === 'relegation') {
      // Down and settling, with a small bounce as it lands — the opposite
      // gesture to a promotion rather than the absence of one.
      badgeLift.value = withSequence(
        withTiming(14, { duration: 420, easing: Easing.in(Easing.cubic) }),
        withSpring(0, { damping: 9, stiffness: 130 })
      );
      badgeScale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
      return;
    }

    badgeScale.value = withSequence(
      withSpring(1.18, { damping: 7, stiffness: 160 }),
      withSpring(1, { damping: 10, stiffness: 140 })
    );
    badgeLift.value = withSpring(0, { damping: 12, stiffness: 120 });

    if (showRays) {
      raySpin.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1);
    }
    pulse.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
    if (kind === 'levelUp') {
      rings.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
        -1
      );
    }
  }, [kind, showRays, badgeScale, badgeLift, raySpin, pulse, rings]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: badgeLift.value }, { scale: badgeScale.value }],
  }));

  const raysStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.35,
    transform: [{ rotate: `${raySpin.value}deg` }, { scale: 1 + pulse.value * 0.08 }],
  }));

  return (
    <View style={styles.overlay}>
      {showConfetti ? <Confetti /> : null}
      {showCoins ? <CoinRain /> : null}

      <View style={styles.badgeWrap}>
        {showRays ? (
          <Animated.View style={[styles.rays, raysStyle]} pointerEvents="none">
            <Svg width={RAY_BOX} height={RAY_BOX}>
              {Array.from({ length: RAY_COUNT }).map((_, i) => {
                const angle = (i / RAY_COUNT) * Math.PI * 2;
                const center = RAY_BOX / 2;
                return (
                  <Line
                    key={i}
                    x1={center + Math.cos(angle) * 58}
                    y1={center + Math.sin(angle) * 58}
                    x2={center + Math.cos(angle) * 118}
                    y2={center + Math.sin(angle) * 118}
                    stroke={color}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>
          </Animated.View>
        ) : null}

        {kind === 'levelUp' ? (
          <>
            <Ring progress={rings} colour={color} offset={0} />
            <Ring progress={rings} colour={color} offset={0.5} />
          </>
        ) : null}

        <Animated.View
          style={[
            styles.badge,
            { borderColor: color },
            glow(rising ? 'strong' : 'soft', color),
            badgeStyle,
          ]}
        >
          {icon ? (
            <Ionicons name={icon} size={52} color={color} />
          ) : (
            <Text style={[styles.badgeLabel, { color }]} selectable={false}>
              {badgeLabel}
            </Text>
          )}
        </Animated.View>
      </View>

      <Text style={[styles.title, { color }]} selectable={false}>
        {title}
      </Text>
      <Text style={styles.subtitle} selectable={false}>
        {subtitle}
      </Text>

      <GlowButton
        label={t('common.continue')}
        size="lg"
        variant={rising ? 'filled' : 'outline'}
        accent={color}
        onPress={onDismiss}
        style={styles.button}
      />
    </View>
  );
}

/**
 * A ring expanding out of the badge and fading.
 *
 * `offset` staggers the second one by half a cycle, so there is always one on
 * the way out — two rings on the same clock would pulse together and read as a
 * single thicker ring.
 */
function Ring({
  progress,
  colour,
  offset,
}: {
  progress: { value: number };
  colour: string;
  offset: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = (progress.value + offset) % 1;
    return {
      opacity: (1 - p) * 0.55,
      transform: [{ scale: 0.6 + p * 1.1 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { borderColor: colour }, style]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  badgeWrap: {
    width: RAY_BOX,
    height: RAY_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rays: {
    position: 'absolute',
    width: RAY_BOX,
    height: RAY_BOX,
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
  },
  badge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  badgeLabel: {
    fontFamily: fonts.numeric,
    fontSize: 44,
  },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    letterSpacing: 3,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  button: {
    minWidth: 200,
    borderRadius: radius.pill,
  },
});
