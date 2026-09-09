import { useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while held down. 1 = no movement. */
  scaleTo?: number;
  children: React.ReactNode;
}

// Springy press feedback. Every tappable thing feels dead without it, so this
// wraps Pressable rather than each screen re-implementing the same two springs.
export function AnimatedPressable({ style, scaleTo = 0.94, children, ...props }: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        animateTo(scaleTo);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
