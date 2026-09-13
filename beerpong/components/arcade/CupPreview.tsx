import { StyleSheet, View } from 'react-native';

import type { CupDesign } from '@/lib/cupSkins';
import { colors } from '@/theme';

/**
 * A cup, flat, for lists.
 *
 * Not a 3D one: a shop page with fourteen live canvases on it would spend more
 * on the previews than the game spends on the table. This is the same flag laid
 * out with plain views — a tapered body with the stripes across or around it —
 * which reads at 46 points and costs nothing.
 *
 * The taper is what makes it a cup rather than a flag: same silhouette as the
 * real one, wider at the rim than the base.
 */
export function CupPreview({ design, size = 48 }: { design: CupDesign; size?: number }) {
  const height = size * 1.2;
  const pattern = design.pattern;

  const bands: { colour: string; share: number }[] =
    pattern.kind === 'stripes'
      ? pattern.colours.map((colour, index) => ({
          colour,
          share: (pattern.weights?.[index] ?? 1) /
            (pattern.weights ?? pattern.colours.map(() => 1)).reduce((a, b) => a + b, 0),
        }))
      : [];

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
            // The rim wears the top band, which is the first one listed.
            backgroundColor: pattern.kind === 'cross' ? pattern.background : bands[0]?.colour,
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
        {pattern.kind === 'cross' ? (
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
        ) : pattern.direction === 'horizontal' ? (
          <View style={StyleSheet.absoluteFill}>
            {/* Listed top band first, and a column lays them out top first —
                so this is simply the order they are written in. */}
            {bands.map((band, index) => (
              <View key={index} style={{ flex: band.share, backgroundColor: band.colour }} />
            ))}
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
            {bands.map((band, index) => (
              <View key={index} style={{ flex: band.share, backgroundColor: band.colour }} />
            ))}
          </View>
        )}
        {/* A highlight down one side, so it is lit like the ones on the table. */}
        <View style={styles.sheen} />
      </View>
    </View>
  );
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
