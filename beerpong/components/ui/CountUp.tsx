import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface CountUpProps {
  value: number;
  style?: StyleProp<TextStyle>;
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
export function CountUp({ value, style, prefix = '', suffix = '', duration = 620 }: CountUpProps) {
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
    <Text style={style} selectable={false}>
      {prefix}
      {shown}
      {suffix}
    </Text>
  );
}
