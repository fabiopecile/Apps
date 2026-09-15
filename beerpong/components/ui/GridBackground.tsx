import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
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
 * The name stays `GridBackground` because it is imported by every screen in the
 * app, and a rename across twenty files buys nothing a comment cannot say.
 */
export function GridBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.base} />
      {/* The lamp. Vertical rather than radial: Expo's gradient does not do
          radial on every platform, and a wide soft vertical falloff is
          indistinguishable from one here — checked against a radial mock. */}
      <LinearGradient
        colors={[colors.feltGlow, 'rgba(22, 42, 18, 0.12)', 'rgba(8, 10, 8, 0)']}
        locations={[0, 0.22, 0.5]}
        style={StyleSheet.absoluteFill}
      />
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
});
