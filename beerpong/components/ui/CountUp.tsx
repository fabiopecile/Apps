import { useEffect, useState, type ComponentProps } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface CountUpProps {
  value: number;
  style?: StyleProp<TextStyle>;
  /**
   * A style from `useAnimatedStyle`, for callers that also want to animate how
   * the number looks rather than only what it says — the coin chip tints it.
   * Kept separate from `style` so the ordinary callers keep a plain object and
   * nobody has to think about which thread a style lives on.
   *
   * Typed off `Animated.Text` itself rather than as `StyleProp<TextStyle>`: a
   * style produced on the UI thread is not a plain style object, and spelling
   * it out by hand only produces a type that has to be cast away again.
   */
  animatedStyle?: ComponentProps<typeof Animated.Text>['style'];
  /** Rendered around the number, e.g. suffix="%". */
  prefix?: string;
  suffix?: string;
  duration?: number;
}

/**
 * A number that rolls to its new value instead of snapping.
 *
 * Reanimated cannot drive a Text's children on the UI thread, so the value is
 * tweened as a shared value and pushed back to React only when the rounded
 * number actually changes — that is at most one render per displayed step,
 * not one per frame.
 */
export function CountUp({
  value,
  style,
  animatedStyle,
  prefix = '',
  suffix = '',
  duration = 620,
}: CountUpProps) {
  const progress = useSharedValue(value);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(setShown)(current);
      }
    }
  );

  return (
    <Animated.Text style={[style, animatedStyle]} selectable={false}>
      {prefix}
      {shown}
      {suffix}
    </Animated.Text>
  );
}
