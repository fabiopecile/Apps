import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it sinks. Bigger cards want less. */
  scaleTo?: number;
}

/**
 * A card that presses in under the finger.
 *
 * Spring on the way down and a plain fade on the way up: springing back out
 * makes a list of cards look like it is wobbling.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const dim = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 1 - dim.value * 0.18,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        dim.value = withTiming(1, { duration: 90 });
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: 180 });
        dim.value = withTiming(0, { duration: 180 });
        rest.onPressOut?.(event);
      }}
      {...rest}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
