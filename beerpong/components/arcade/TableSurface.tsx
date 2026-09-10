import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts } from '@/theme';
import {
  NET_Y,
  OPPONENT_RACK_HEIGHT,
  OPPONENT_RACK_TOP,
  TABLE_HEIGHT,
  tableHalfWidth,
  type CupSpec,
} from '@/lib/arcadeLayout';

/** How thick the table looks along its near edge and sides, in table points. */
const RAIL = 12;

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
  // The table as the slab it is: narrow at the far end, wide at your end.
  const farHalf = tableHalfWidth(width, 0);
  const nearHalf = tableHalfWidth(width, TABLE_HEIGHT);
  const top = centerX - farHalf;
  const bottom = centerX - nearHalf;
  const topEdge = 4;
  const surface = `M${top},${topEdge}L${centerX + farHalf},${topEdge}L${centerX + nearHalf},${TABLE_HEIGHT - RAIL}L${centerX - nearHalf},${TABLE_HEIGHT - RAIL}Z`;
  // The thickness you see along the near edge and down the two sides.
  const rails = [
    `M${centerX - nearHalf},${TABLE_HEIGHT - RAIL}L${centerX + nearHalf},${TABLE_HEIGHT - RAIL}L${centerX + nearHalf},${TABLE_HEIGHT}L${centerX - nearHalf},${TABLE_HEIGHT}Z`,
    `M${top},${topEdge}L${bottom},${TABLE_HEIGHT - RAIL}L${bottom},${TABLE_HEIGHT}L${top},${topEdge + RAIL}Z`,
    `M${centerX + farHalf},${topEdge}L${centerX + nearHalf},${TABLE_HEIGHT - RAIL}L${centerX + nearHalf},${TABLE_HEIGHT}L${centerX + farHalf},${topEdge + RAIL}Z`,
  ];
  /** A line across the table that stops at its edges rather than the screen's. */
  const across = (y: number, inset: number) => {
    const half = tableHalfWidth(width, y) * inset;
    return { x1: centerX - half, x2: centerX + half, y1: y, y2: y };
  };

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
          <LinearGradient id="tableRail" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3c6b28" />
            <Stop offset="1" stopColor="#12240c" />
          </LinearGradient>
          {/* Whatever the table is standing on, and the dark it recedes into. */}
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#040603" />
            <Stop offset="0.55" stopColor="#070c05" />
            <Stop offset="1" stopColor="#030502" />
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

        <Rect x={0} y={0} width={width} height={TABLE_HEIGHT} fill="url(#floor)" />

        {/* The thickness first, so the top surface sits on top of it. */}
        {rails.map((d, i) => (
          <Path key={`rail-${i}`} d={d} fill="url(#tableRail)" opacity={0.9} />
        ))}
        <Path d={surface} fill="url(#tableFelt)" />

        {/* Spotlights over each end of the table */}
        <Ellipse cx={centerX} cy={150} rx={farHalf * 1.7} ry={190} fill="url(#farSpot)" />
        <Ellipse cx={centerX} cy={TABLE_HEIGHT - 170} rx={nearHalf * 1.3} ry={210} fill="url(#nearSpot)" />

        {/* The bright lip along each edge, which is what reads as an edge. */}
        <Path
          d={`M${top},${topEdge}L${bottom},${TABLE_HEIGHT - RAIL}`}
          stroke="#8dff6a"
          strokeOpacity={0.22}
          strokeWidth={1.6}
        />
        <Path
          d={`M${centerX + farHalf},${topEdge}L${centerX + nearHalf},${TABLE_HEIGHT - RAIL}`}
          stroke="#8dff6a"
          strokeOpacity={0.22}
          strokeWidth={1.6}
        />
        <Path
          d={`M${top},${topEdge}L${centerX + farHalf},${topEdge}`}
          stroke="#8dff6a"
          strokeOpacity={0.14}
          strokeWidth={1.4}
        />

        {/* Two lines running away from you, on the table rather than over it. */}
        <Line {...across(TABLE_HEIGHT - RAIL, 0.46)} stroke="#ffffff" strokeOpacity={0.04} strokeWidth={1} />
        <Path
          d={`M${centerX - farHalf * 0.46},${topEdge}L${centerX - nearHalf * 0.46},${TABLE_HEIGHT - RAIL}`}
          stroke="#ffffff"
          strokeOpacity={0.035}
          strokeWidth={1}
        />
        <Path
          d={`M${centerX + farHalf * 0.46},${topEdge}L${centerX + nearHalf * 0.46},${TABLE_HEIGHT - RAIL}`}
          stroke="#ffffff"
          strokeOpacity={0.035}
          strokeWidth={1}
        />

        {/* Halfway line, stopping at the table's edges */}
        <Line {...across(NET_Y, 0.94)} stroke={colors.neon} strokeOpacity={0.18} strokeWidth={1.5} />

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
