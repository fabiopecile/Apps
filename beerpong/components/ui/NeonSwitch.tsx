import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, glow } from '@/theme';
import { useFeedback } from '@/lib/feedback';

interface NeonSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function NeonSwitch({ value, onValueChange }: NeonSwitchProps) {
  const feedback = useFeedback();

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? colors.neonDim : colors.backgroundElevated, { duration: 180 }),
    borderColor: withTiming(value ? colors.neon : colors.borderFaint, { duration: 180 }),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? 20 : 2, { duration: 180 }) }],
    backgroundColor: withTiming(value ? colors.neon : colors.textMuted, { duration: 180 }),
  }));

  return (
    <Pressable
      onPress={() => {
        feedback.tap();
        onValueChange(!value);
      }}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle, value ? glow('soft') : undefined]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
