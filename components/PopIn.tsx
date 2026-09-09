import { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

interface PopInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Milliseconds to wait before starting - used to stagger lists. */
  delay?: number;
  /** 'pop' springs up from small (modals, rewards), 'slide' rises from below (list items). */
  variant?: 'pop' | 'slide';
}

export function PopIn({ children, style, delay = 0, variant = 'pop' }: PopInProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation =
      variant === 'pop'
        ? Animated.spring(progress, { toValue: 1, delay, useNativeDriver: true, friction: 6, tension: 80 })
        : Animated.timing(progress, { toValue: 1, delay, duration: 320, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, variant]);

  const transform =
    variant === 'pop'
      ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]
      : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }];

  return <Animated.View style={[style, { opacity: progress, transform }]}>{children}</Animated.View>;
}
