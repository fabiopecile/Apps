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

import { Confetti } from '@/components/ui/Confetti';
import { GlowButton } from '@/components/ui/GlowButton';
import { colors, fonts, glow, radius, spacing } from '@/theme';

const RAY_COUNT = 12;
const RAY_BOX = 240;

interface PromotionOverlayProps {
  kind: 'promotion' | 'relegation';
  title: string;
  subtitle: string;
  badgeLabel: string;
  color: string;
  onDismiss: () => void;
}

export function PromotionOverlay({
  kind,
  title,
  subtitle,
  badgeLabel,
  color,
  onDismiss,
}: PromotionOverlayProps) {
  const badgeScale = useSharedValue(0.2);
  const badgeLift = useSharedValue(40);
  const raySpin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const promoted = kind === 'promotion';

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.18, { damping: 7, stiffness: 160 }),
      withSpring(1, { damping: 10, stiffness: 140 })
    );
    badgeLift.value = withSpring(0, { damping: 12, stiffness: 120 });
    if (promoted) {
      raySpin.value = withRepeat(
        withTiming(360, { duration: 9000, easing: Easing.linear }),
        -1
      );
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
    }
  }, [badgeScale, badgeLift, raySpin, pulse, promoted]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: badgeLift.value }, { scale: badgeScale.value }],
  }));

  const raysStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.35,
    transform: [{ rotate: `${raySpin.value}deg` }, { scale: 1 + pulse.value * 0.08 }],
  }));

  return (
    <View style={styles.overlay}>
      {promoted ? <Confetti /> : null}

      <View style={styles.badgeWrap}>
        {promoted ? (
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

        <Animated.View
          style={[styles.badge, { borderColor: color }, glow('strong', color), badgeStyle]}
        >
          <Text style={[styles.badgeLabel, { color }]} selectable={false}>
            {badgeLabel}
          </Text>
        </Animated.View>
      </View>

      <Text style={[styles.title, { color }]} selectable={false}>
        {title}
      </Text>
      <Text style={styles.subtitle} selectable={false}>
        {subtitle}
      </Text>

      <GlowButton
        label="Weiter"
        size="lg"
        variant={promoted ? 'filled' : 'outline'}
        onPress={onDismiss}
        style={styles.button}
      />
    </View>
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
