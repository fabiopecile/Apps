import { StyleSheet } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AMBIENT, useAmbientLoop } from '@/lib/ambient';
import { colors } from '@/theme';

/**
 * Three cups in a rack, drawn flat.
 *
 * It exists because of the one criticism of the old hub that no amount of
 * tidying would have fixed: nothing on the screen said *beer pong*. Six rows
 * with circular icons could have been any app at all. A rack of cups in the
 * one place the eye lands settles that in a single glance, which is more than
 * the word "Arcade" at the top ever did.
 *
 * Deliberately not the 3D table. That thing is a `Canvas`, a renderer and a
 * frame loop, and putting one on the hub to decorate a card would cost a GPU
 * context on a screen nobody is playing on — the exact mistake that made the
 * match screen stutter. This is four ellipses and three paths.
 *
 * The red is the cup's own pigment rather than a semantic colour: a beer pong
 * cup is red the way a tennis ball is yellow, and `rival` red would wrongly
 * imply these cups belong to the opponent.
 *
 * It also breathes — four and a half percent, five seconds in and out, pivoting
 * on the table rather than on its own middle, so the cups grow upward the way
 * something standing does and do not sink into the card.
 */
const CUP_RED = '#E23D2E';

export function CupRack({ size = 96, tint = colors.you }: { size?: number; tint?: string }) {
  // Authored against a 96×104 box; everything else scales from it.
  const height = (size / 96) * 104;
  const breath = useAmbientLoop(AMBIENT.breath, { reverse: true });

  const breathing = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.045 }],
  }));

  return (
    <Animated.View style={[styles.pivot, breathing]}>
      <Svg width={size} height={height} viewBox="0 0 96 104" fill="none">
        {/* The pool of light the rack stands in, so it sits on the card rather
            than floating over it. Wide and very faint: at any more it reads as a
            separate dark blob under the cups rather than as their shadow. */}
        <Ellipse cx="48" cy="78" rx="40" ry="7" fill={tint} opacity={0.07} />
        <G>
          {/* Back cup first, so the two in front overlap it. Its mouth is the
              same width as theirs — drawn wider, it stopped reading as "further
              away" and started reading as a bowl. */}
          <Path d="M36 22 L40 50 L56 50 L60 22 Z" fill="#1C2A18" stroke={CUP_RED} strokeWidth={2.2} />
          <Ellipse cx="48" cy="22" rx="12" ry="4" fill="#0E140C" stroke={CUP_RED} strokeWidth={2.2} />

          <Path d="M24 44 L28 74 L46 74 L50 44 Z" fill="#1C2A18" stroke={CUP_RED} strokeWidth={2.4} />
          <Ellipse cx="37" cy="44" rx="13" ry="4.4" fill="#0E140C" stroke={CUP_RED} strokeWidth={2.4} />

          <Path d="M46 44 L50 74 L68 74 L72 44 Z" fill="#1C2A18" stroke={CUP_RED} strokeWidth={2.4} />
          <Ellipse cx="59" cy="44" rx="13" ry="4.4" fill="#0E140C" stroke={CUP_RED} strokeWidth={2.4} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Pivots on the shadow under the cups, not on the middle of the box.
  pivot: { transformOrigin: 'bottom' },
});
