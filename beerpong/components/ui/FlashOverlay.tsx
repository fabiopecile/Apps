import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';

export interface FlashOverlayHandle {
  flash: (color?: string) => void;
}

export const FlashOverlay = forwardRef<FlashOverlayHandle>((_props, ref) => {
  const opacity = useSharedValue(0);
  const tint = useSharedValue<string>(colors.neon);

  useImperativeHandle(ref, () => ({
    flash: (color = colors.neon) => {
      tint.value = color;
      opacity.value = withSequence(
        withTiming(0.45, { duration: 60 }),
        withTiming(0, { duration: 260 })
      );
    },
  }));

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: tint.value,
  }));

  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} />;
});

FlashOverlay.displayName = 'FlashOverlay';
