import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { colors, fonts, type as t } from '@/theme';

interface ScoreDisplayProps {
  value: number;
  label?: string;
  size?: 'huge' | 'large' | 'medium';
}

export function ScoreDisplay({ value, label, size = 'huge' }: ScoreDisplayProps) {
  const scale = useSharedValue(1);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      const grew = value > prevValue.current;
      prevValue.current = value;
      if (grew) {
        scale.value = withSequence(
          withSpring(1.28, { damping: 6, stiffness: 320 }),
          withSpring(1, { damping: 9, stiffness: 200 })
        );
      }
    }
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyle = t[size === 'huge' ? 'scoreHuge' : size === 'large' ? 'scoreLarge' : 'scoreMedium'];

  return (
    <View style={styles.wrap}>
      <Animated.Text
        style={[styles.value, sizeStyle, animatedStyle, glowTextShadow]}
      >
        {value}
      </Animated.Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const glowTextShadow = {
  textShadowColor: colors.neonGlow,
  textShadowRadius: 24,
  textShadowOffset: { width: 0, height: 0 },
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  value: {
    fontFamily: fonts.displayBlack,
    color: colors.neon,
  },
  label: {
    fontFamily: fonts.label,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
