import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, fonts, radius, spacing } from '@/theme';
import { useFeedback } from '@/lib/feedback';

interface GlowButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Overrides the neon accent — used by the gold Pro screen. */
  accent?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlowButton({
  label,
  onPress,
  variant = 'filled',
  size = 'md',
  icon,
  disabled,
  style,
  accent = colors.neon,
}: GlowButtonProps) {
  const feedback = useFeedback();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  // The press is still felt — it is the squash that reads as a button going
  // down, not the halo brightening. That was measured by covering one and then
  // the other with a finger.
  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 14, stiffness: 260 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  const handlePress = () => {
    if (disabled) return;
    feedback.tap();
    onPress();
  };

  const variantStyle =
    variant === 'filled'
      ? { backgroundColor: accent, borderColor: accent }
      : variant === 'outline'
        ? { backgroundColor: 'transparent', borderColor: accent }
        : { backgroundColor: 'transparent', borderColor: 'transparent' };

  const textColor = variant === 'filled' ? colors.background : accent;
  const paddingV = size === 'lg' ? 18 : size === 'md' ? 14 : 10;
  const fontSize = size === 'lg' ? 18 : size === 'md' ? 15 : 13;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.base,
        variantStyle,
        // No halo, on any variant. A solid neon fill on a near-black screen is
        // already the loudest thing on it — the glow on top was the app
        // competing with itself, and with every other button beside it. See
        // the rationing rule in `theme/glow.ts`.
        { paddingVertical: paddingV },
        animatedStyle,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          { color: textColor, fontSize, marginLeft: icon ? spacing.sm : 0 },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  label: {
    fontFamily: fonts.label,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
