import { StyleSheet, View } from 'react-native';

import type { CupDesign, CupPattern } from '@/lib/cupSkins';
import { colors } from '@/theme';

/**
 * A cup, flat, for lists.
 *
 * Not a 3D one: a shop page with fourteen live canvases on it would spend more
 * on the previews than the game spends on the table. This is the same pattern
 * laid out with plain views — a tapered body with the bands across or around it
 * — which reads at 46 points and costs nothing.
 *
 * The taper is what makes it a cup rather than a flag: same silhouette as the
 * real one, wider at the rim than the base.
 *
 * It is an impression, not the texture. `cupTexture` is what actually goes on
 * the cups and this only has to be recognisable beside it — so the gradient is
 * a dozen bands rather than a smooth blend, and camouflage is six blotches
 * rather than the real hash. Where the two must agree is which way up they are.
 */
export function CupPreview({ design, size = 48 }: { design: CupDesign; size?: number }) {
  const height = size * 1.2;
  const pattern = design.pattern;

  return (
    <View style={{ width: size, height, alignItems: 'center' }}>
      {/* The rim, drawn as an ellipse so the cup reads as open at the top. */}
      <View
        style={[
          styles.rim,
          {
            width: size,
            height: size * 0.26,
            borderRadius: size * 0.13,
            backgroundColor: rimColour(pattern),
          },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            width: size,
            height: height - size * 0.13,
            borderBottomLeftRadius: size * 0.18,
            borderBottomRightRadius: size * 0.18,
          },
        ]}
      >
        <Pattern pattern={pattern} size={size} />
        {/* A highlight down one side, so it is lit like the ones on the table. */}
        <View style={styles.sheen} />
      </View>
    </View>
  );
}

/** The colour the rim wears: whatever the pattern puts at the top of the cup. */
function rimColour(pattern: CupPattern): string {
  switch (pattern.kind) {
    case 'cross':
      return pattern.background;
    case 'stripes':
      return pattern.colours[0];
    case 'diagonal':
      return pattern.colours[0];
    case 'checker':
      return pattern.colours[0];
    case 'blotches':
      return pattern.background;
    case 'fade':
      // Listed base first and the texture runs them upwards, so the rim wears
      // the last one — the same way round as on the table.
      return pattern.colours[pattern.colours.length - 1];
  }
}

function Pattern({ pattern, size }: { pattern: CupPattern; size: number }) {
  switch (pattern.kind) {
    case 'cross':
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: pattern.background }]}>
          <View
            style={{
              position: 'absolute',
              left: `${((pattern.offset ?? 0.5) - pattern.thickness / 2) * 100}%`,
              width: `${pattern.thickness * 100}%`,
              top: 0,
              bottom: 0,
              backgroundColor: pattern.bar,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: `${(0.5 - pattern.thickness / 2) * 100}%`,
              height: `${pattern.thickness * 100}%`,
              left: 0,
              right: 0,
              backgroundColor: pattern.bar,
            }}
          />
        </View>
      );

    case 'stripes': {
      const weights = pattern.weights ?? pattern.colours.map(() => 1);
      const total = weights.reduce((a, b) => a + b, 0);
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            pattern.direction === 'vertical' ? { flexDirection: 'row' } : null,
          ]}
        >
          {/* Listed top band first, and a column lays them out top first —
              so this is simply the order they are written in. */}
          {pattern.colours.map((colour, index) => (
            <View key={index} style={{ flex: weights[index] / total, backgroundColor: colour }} />
          ))}
        </View>
      );
    }

    case 'fade':
      return (
        <View style={StyleSheet.absoluteFill}>
          {[...pattern.colours].reverse().map((colour, index) => (
            <View key={index} style={{ flex: 1, backgroundColor: colour }} />
          ))}
        </View>
      );

    case 'diagonal':
      return (
        <View style={StyleSheet.absoluteFill}>
          {/* Twice as wide as the cup and turned, so the bands run corner to
              corner and still cover it once the corners have been cut off. */}
          <View
            style={{
              position: 'absolute',
              left: -size,
              top: -size,
              width: size * 3,
              height: size * 3,
              flexDirection: 'row',
              transform: [{ rotate: '-62deg' }],
            }}
          >
            {Array.from({ length: 10 }, (_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  backgroundColor: pattern.colours[index % pattern.colours.length],
                }}
              />
            ))}
          </View>
        </View>
      );

    case 'checker': {
      const squares = 5;
      return (
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {Array.from({ length: squares * squares }, (_, index) => {
            const row = Math.floor(index / squares);
            const column = index % squares;
            return (
              <View
                key={index}
                style={{
                  width: `${100 / squares}%`,
                  height: `${100 / squares}%`,
                  backgroundColor: pattern.colours[(row + column) % 2],
                }}
              />
            );
          })}
        </View>
      );
    }

    case 'blotches': {
      // Fixed positions rather than the texture's hash: six blotches is what
      // fits at this size, and they only have to say "camouflage".
      const spots = [
        { left: 0.06, top: 0.1, size: 0.42 },
        { left: 0.52, top: 0.02, size: 0.34 },
        { left: 0.3, top: 0.38, size: 0.46 },
        { left: -0.08, top: 0.58, size: 0.38 },
        { left: 0.62, top: 0.52, size: 0.42 },
        { left: 0.24, top: 0.78, size: 0.3 },
      ];
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: pattern.background }]}>
          {spots.map((spot, index) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: `${spot.left * 100}%`,
                top: `${spot.top * 100}%`,
                width: `${spot.size * 100}%`,
                aspectRatio: 1,
                borderRadius: size,
                backgroundColor: pattern.colours[index % pattern.colours.length],
              }}
            />
          ))}
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  rim: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    zIndex: 2,
  },
  body: {
    overflow: 'hidden',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderFaint,
    // Tapered the way a party cup is: narrower at the foot.
    transform: [{ perspective: 240 }, { rotateX: '2deg' }],
  },
  sheen: {
    position: 'absolute',
    left: '8%',
    top: 0,
    bottom: 0,
    width: '16%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
