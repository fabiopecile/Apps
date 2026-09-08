import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface RevealProps {
  children: React.ReactNode;
  /** Position in a list — each step delays the entrance a little further. */
  index?: number;
  /** Milliseconds between neighbouring items. */
  stagger?: number;
  /** Extra delay before the whole group starts. */
  delay?: number;
  /** How far it travels in, in pixels. Negative comes from above. */
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fades and lifts its children into place on mount.
 *
 * Driven by a shared value rather than reanimated's `entering` prop, because
 * the declarative version does not re-run when a screen is revisited — and
 * these screens are revisited constantly.
 */
export function Reveal({
  children,
  index = 0,
  stagger = 55,
  delay = 0,
  distance = 14,
  style,
}: RevealProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay + index * stagger,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })
    );
  }, [progress, delay, index, stagger]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
