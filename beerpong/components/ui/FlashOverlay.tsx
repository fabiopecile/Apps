import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';

export interface FlashOverlayHandle {
  /** `intensity` is the peak opacity — keep it low over large surfaces. */
  flash: (color?: string, intensity?: number) => void;
}

export const FlashOverlay = forwardRef<FlashOverlayHandle>((_props, ref) => {
  const opacity = useSharedValue(0);
  const tint = useSharedValue<string>(colors.neon);

  useImperativeHandle(ref, () => ({
    flash: (color = colors.neon, intensity = 0.4) => {
      tint.value = color;
      opacity.value = withSequence(
        withTiming(intensity, { duration: 60 }),
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
