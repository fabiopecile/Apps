import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '@/theme';

export function AnimatedSplash() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={glowStyle}>
        <Svg width={120} height={120} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={32} stroke={colors.neon} strokeWidth={5} fill="none" />
          <Path d="M30 24 A32 32 0 0 1 70 24" stroke={colors.neonAlt} strokeWidth={4} fill="none" />
          <Path d="M30 76 A32 32 0 0 0 70 76" stroke={colors.neonAlt} strokeWidth={4} fill="none" />
        </Svg>
      </Animated.View>
      <Text style={styles.title}>BEERPONG</Text>
      <Text style={styles.subtitle}>TRACK · PLAY · WIN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    fontFamily: fonts.displayBlack,
    fontSize: 28,
    color: colors.neon,
    letterSpacing: 4,
    textShadowColor: colors.neonGlow,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 4,
  },
});
