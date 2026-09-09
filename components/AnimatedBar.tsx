import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface AnimatedBarProps {
  /** 0..1 */
  progress: number;
  color: string;
  trackStyle?: StyleProp<ViewStyle>;
  duration?: number;
}

// Progress bar that eases to its new width instead of jumping - used for the
// XP bars so earning XP visibly fills them.
export function AnimatedBar({ progress, color, trackStyle, duration = 800 }: AnimatedBarProps) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration,
      useNativeDriver: false, // width can't be driven natively
    });
    animation.start();
    return () => animation.stop();
  }, [anim, progress, duration]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.track, trackStyle]}>
      <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
