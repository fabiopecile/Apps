import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts } from '@/theme';
import { NET_Y, OPPONENT_RACK_HEIGHT, OPPONENT_RACK_TOP, TABLE_HEIGHT, type CupSpec } from '@/lib/arcadeLayout';

interface TableSurfaceProps {
  width: number;
  /** Both racks, so each standing cup can cast a reflection and a shadow. */
  racks: { cups: CupSpec[]; aliveFlags: boolean[] }[];
}

/**
 * Everything painted *under* the cups: the table itself, the perspective edge
 * lines running away from you, spotlights over each rack, and the soft
 * reflection each standing cup throws onto the surface.
 *
 * Memoised, like the cups above it: this is one large SVG plus a reflection
 * per standing cup, and without it every score, hint or turn change in the
 * match screen rebuilt the lot. Callers must hand `racks` a stable array —
 * `match.tsx` keeps one in a `useMemo` — or the memo does nothing.
 */
export const TableSurface = memo(function TableSurface({ width, racks }: TableSurfaceProps) {
  const centerX = width / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${TABLE_HEIGHT}`}>
        <Defs>
          <LinearGradient id="tableFelt" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0a0f08" />
            <Stop offset="0.35" stopColor="#16200f" />
            <Stop offset="0.62" stopColor="#1b2713" />
            <Stop offset="1" stopColor="#0d140a" />
          </LinearGradient>
          <RadialGradient id="farSpot" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8dff6a" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#8dff6a" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="nearSpot" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8dff6a" stopOpacity={0.13} />
            <Stop offset="1" stopColor="#8dff6a" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="reflection" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7dff4d" stopOpacity={0.16} />
            <Stop offset="0.5" stopColor="#7dff4d" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#7dff4d" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={TABLE_HEIGHT} fill="url(#tableFelt)" />

        {/* Spotlights over each end of the table */}
        <Ellipse cx={centerX} cy={150} rx={width * 0.62} ry={190} fill="url(#farSpot)" />
        <Ellipse cx={centerX} cy={TABLE_HEIGHT - 170} rx={width * 0.66} ry={210} fill="url(#nearSpot)" />

        {/* Perspective: side rails converging toward the far end */}
        <Line x1={6} y1={TABLE_HEIGHT} x2={width * 0.2} y2={0} stroke="#ffffff" strokeOpacity={0.07} strokeWidth={2} />
        <Line
          x1={width - 6}
          y1={TABLE_HEIGHT}
          x2={width * 0.8}
          y2={0}
          stroke="#ffffff"
          strokeOpacity={0.07}
          strokeWidth={2}
        />
        <Line
          x1={width * 0.13}
          y1={TABLE_HEIGHT * 0.62}
          x2={width * 0.31}
          y2={TABLE_HEIGHT * 0.1}
          stroke="#ffffff"
          strokeOpacity={0.03}
          strokeWidth={1}
        />
        <Line
          x1={width * 0.87}
          y1={TABLE_HEIGHT * 0.62}
          x2={width * 0.69}
          y2={TABLE_HEIGHT * 0.1}
          stroke="#ffffff"
          strokeOpacity={0.03}
          strokeWidth={1}
        />

        {/* Halfway line */}
        <Line
          x1={width * 0.08}
          y1={NET_Y}
          x2={width * 0.92}
          y2={NET_Y}
          stroke={colors.neon}
          strokeOpacity={0.16}
          strokeWidth={1.5}
        />

        {/* A faint mirrored sheen under every cup still standing. The cups
            carry their own contact shadow, so none is drawn here. */}
        {racks.map((rack, rackIndex) =>
          rack.cups.map((cup) =>
            rack.aliveFlags[cup.index] ? (
              <Rect
                key={`reflect-${rackIndex}-${cup.index}`}
                x={cup.x - cup.width * 0.2}
                y={cup.y + cup.height / 2 - 3}
                width={cup.width * 0.4}
                height={cup.height * 0.3}
                rx={cup.width * 0.16}
                fill="url(#reflection)"
              />
            ) : null
          )
        )}
      </Svg>

      {/* Table branding, the way a tournament table is printed */}
      <Text style={[styles.brand, { top: OPPONENT_RACK_TOP + OPPONENT_RACK_HEIGHT + 18 }]} selectable={false}>
        BEERPONG
      </Text>
    </View>
  );
})

const styles = StyleSheet.create({
  brand: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.displayBlack,
    fontSize: 18,
    letterSpacing: 8,
    color: colors.neon,
    opacity: 0.07,
  },
});
