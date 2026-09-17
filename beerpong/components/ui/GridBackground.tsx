import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AMBIENT, useAmbientLoop } from '@/lib/ambient';
import { colors } from '@/theme';

/**
 * The room every screen sits in.
 *
 * It used to be a wireframe grid — fourteen lines each way across the whole
 * screen — and the grid was the problem: it read as a background that wanted
 * looking at, and it fought every card laid on top of it. Cards on a grid on a
 * gradient is three layers of texture before a single word.
 *
 * What replaced it is one light. A green pool from above, falling off to
 * nothing by the middle of the screen, as if the table were under a lamp — the
 * only thing this app is ever really about. It carries the same colour identity
 * with none of the noise, and it gives the screen a top and a bottom, which the
 * even grid never did.
 *
 * And now the lamp moves. Nineteen seconds per swing, which is slow enough that
 * you cannot watch it happen — look away and back and the room is lit slightly
 * differently. It is the single change that stops a screen with nothing on it
 * from looking like a screenshot of itself.
 *
 * The name stays `GridBackground` because it is imported by every screen in the
 * app, and a rename across twenty files buys nothing a comment cannot say.
 */
export function GridBackground() {
  const drift = useAmbientLoop(AMBIENT.felt, { reverse: true });
  const { width } = useWindowDimensions();

  /**
   * The lamp itself: brightening a little and reaching a little further down.
   *
   * Anchored at the top, because the pool hangs from the top edge — scaled
   * about its centre instead, its top edge climbs out of the frame and the
   * whole thing reads as sliding upward rather than growing.
   */
  const lamp = useAnimatedStyle(() => ({
    opacity: 0.86 + drift.value * 0.14,
    transform: [{ scaleY: 1 + drift.value * 0.08 }],
  }));

  /**
   * The swing.
   *
   * The pool above is a vertical gradient, so it is identical all the way
   * across — sliding *that* sideways would be invisible. This is a second,
   * horizontal band that crosses it, and the two together read as one lamp on a
   * long wire. The view is what moves, not the gradient's own start and end
   * points: on web those only set the angle, so an animated `start` would do
   * nothing in the browser build.
   */
  const swing = useAnimatedStyle(() => ({
    transform: [{ translateX: (drift.value - 0.5) * width * 0.42 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.base} />
      {/* The lamp. Vertical rather than radial: Expo's gradient does not do
          radial on every platform, and a wide soft vertical falloff is
          indistinguishable from one here — checked against a radial mock. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.fromTop, lamp]}>
        <LinearGradient
          colors={[colors.feltGlow, 'rgba(22, 42, 18, 0.12)', 'rgba(8, 10, 8, 0)']}
          locations={[0, 0.22, 0.5]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.band, swing]}>
        <LinearGradient
          colors={['rgba(30, 60, 24, 0)', 'rgba(38, 74, 30, 0.22)', 'rgba(30, 60, 24, 0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* A touch of weight at the very bottom, so content scrolling off the
          end darkens out rather than being cut. */}
      <LinearGradient
        colors={['rgba(8, 10, 8, 0)', 'rgba(4, 6, 4, 0.55)']}
        locations={[0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
  fromTop: { transformOrigin: 'top' },
  /**
   * Wider than the screen on both sides, so the band's own soft ends stay off
   * the edges as it travels. A band that starts inside the frame has a visible
   * beginning, and then it is a shape rather than a light.
   */
  band: {
    position: 'absolute',
    top: 0,
    height: '46%',
    left: '-40%',
    right: '-40%',
  },
});
