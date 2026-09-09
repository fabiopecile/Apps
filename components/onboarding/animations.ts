import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Shared plumbing for the onboarding illustrations.
 *
 * Every illustration animates on the way in and resets when its slide leaves,
 * so swiping back replays it rather than showing a finished still frame. That
 * is the whole reason each of these takes an `active` flag instead of just
 * running on mount.
 */

/** A value that springs from 0 to 1 while active, and snaps back when not. */
export function useEnter(active: boolean, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const animation = Animated.spring(value, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      speed: 12,
      bounciness: 8,
    });
    animation.start();
    return () => animation.stop();
  }, [active, delay, value]);

  return value;
}

/** A number that ticks up to `to` - for scores, coins and point totals. */
export function useCountUp(active: boolean, to: number, duration = 700, delay = 0) {
  const [value, setValue] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      setValue(0);
      return;
    }
    const id = anim.addListener(({ value: v }) => setValue(Math.round(v)));
    const animation = Animated.timing(anim, {
      toValue: to,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      // Driving a number we read on the JS side, so this one cannot be native.
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      anim.removeListener(id);
    };
  }, [active, to, duration, delay, anim]);

  return value;
}

/** A 0 -> 1 ramp with easing, for bars, sweeps and rotations. */
export function useRamp(active: boolean, duration = 900, delay = 0, easing = Easing.out(Easing.cubic)) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, duration, delay, easing, value]);

  return value;
}

/** A breathing loop - the ring pulses and glows that keep a slide alive. */
export function usePulse(active: boolean, duration = 1600) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, duration, value]);

  return value;
}

/** Standard entrance transform: rise a little and scale up from 88%. */
export function enterStyle(value: Animated.Value, rise = 16) {
  return {
    opacity: value,
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
    ],
  };
}
