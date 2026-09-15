import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import type { CupDesign, CupPattern } from '@/lib/cupSkins';
import { BASE_RADIUS, RIM_RADIUS } from '@/lib/cupGeometry';
import { CUP_ASPECT } from '@/lib/arcadeLayout';

/**
 * A cup for lists, drawn to look like the one on the table.
 *
 * Not a 3D one: a shop page with fourteen live canvases would spend more on
 * previews than the game spends on the table. But the version before this was a
 * rectangle with an ellipse on top, and its "taper" was a two-degree transform
 * that did nothing visible — so a design that wrapped round a cup in the match
 * looked like a flag in a box in the shop, and people noticed.
 *
 * What it does now:
 *
 * **The silhouette is the real one.** `RIM_RADIUS`, `BASE_RADIUS` and
 * `CUP_ASPECT` are imported from the same geometry the renderer lathes, so the
 * preview cannot drift from the cup if somebody reshapes it. The side bows
 * outward through the middle exactly as `cupProfile` does.
 *
 * **It is open, and there is beer in it.** A rim with thickness, a dark
 * opening, and the same `#ffc542` surface the table uses. That is most of what
 * made the old one read as a swatch rather than a cup.
 *
 * **Patterns that wrap are drawn wrapped.** On a lathed cup a vertical stripe
 * runs round the outside, so on screen the bands crowd together towards the
 * silhouette's edges. `wrapX` below does that foreshortening, which is the
 * single change that makes the Perfect Weekend cup stop looking like a barcode.
 *
 * One deliberate difference from the real thing, stated plainly: the game shows
 * you the half of the cup facing you, so a four-band design shows two bands. A
 * preview that hid half the design would be a bad preview, so the whole repeat
 * is compressed into the visible face instead. It reads as a cylinder and shows
 * every colour; it is not a photograph.
 */

/** Drawn in a 120-wide box, with the rim a full diameter across. */
const W = 120;
const CX = W / 2;
const RIM_RX = W * 0.46;
const BASE_RX = RIM_RX * (BASE_RADIUS / RIM_RADIUS);
/** How squashed the mouth looks, i.e. how far above the cup the camera sits. */
const RIM_RY = RIM_RX * 0.3;
const BASE_RY = BASE_RX * 0.26;
const RIM_CY = RIM_RY + 3;
const BODY_H = RIM_RX * 2 * CUP_ASPECT * 0.78;
const BASE_CY = RIM_CY + BODY_H;
const H = BASE_CY + BASE_RY + 6;

/** The outward bow through the middle of the wall, as `cupProfile` has it. */
const BOW = RIM_RX * 2 * 0.012;

/**
 * Where a point on the texture ends up across the front of the cup.
 *
 * A cylinder seen from the side: equal steps around it are not equal steps
 * across the screen — they bunch up at the edges. `u` runs 0 to 1 across the
 * visible face and comes back as an x in the drawing box.
 */
function wrapX(u: number, radius: number): number {
  return CX + radius * Math.sin((u - 0.5) * Math.PI);
}

/** The cup's outline: down one side, across the base, up the other. */
const BODY_PATH = [
  `M ${CX - RIM_RX} ${RIM_CY}`,
  // The bow needs doubling because a quadratic does not pass through its
  // control point — it reaches about half way to it.
  `Q ${CX - (RIM_RX + BASE_RX) / 2 - BOW * 2} ${RIM_CY + BODY_H / 2} ${CX - BASE_RX} ${BASE_CY}`,
  // Sweep 0: from the left foot to the right one this bulges *downward*, which
  // is the near edge of the base — the way a cup sits on a table. Sweep 1 was
  // tried and takes a bite out of the bottom of the cup; both were
  // screenshotted rather than reasoned about, because SVG's arc flags in a
  // y-down coordinate system are not something to be confident about.
  `A ${BASE_RX} ${BASE_RY} 0 0 0 ${CX + BASE_RX} ${BASE_CY}`,
  `Q ${CX + (RIM_RX + BASE_RX) / 2 + BOW * 2} ${RIM_CY + BODY_H / 2} ${CX + RIM_RX} ${RIM_CY}`,
  `A ${RIM_RX} ${RIM_RY} 0 0 1 ${CX - RIM_RX} ${RIM_CY}`,
  'Z',
].join(' ');

export function CupPreview({ design, size = 48 }: { design: CupDesign; size?: number }) {
  const height = (size / W) * H;
  const id = design.id;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <ClipPath id={`body-${id}`}>
          <Path d={BODY_PATH} />
        </ClipPath>
        {/* Lit from the left, like the table's key light, and darkened round
            the right edge so the cup reads as round rather than flat. */}
        <LinearGradient id={`shade-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.28" />
          <Stop offset="0.22" stopColor="#ffffff" stopOpacity="0.16" />
          <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.38" />
        </LinearGradient>
        <PatternDefs pattern={design.pattern} id={id} />
      </Defs>

      <G clipPath={`url(#body-${id})`}>
        <PatternBody pattern={design.pattern} id={id} />
        <Rect x="0" y="0" width={W} height={H} fill={`url(#shade-${id})`} />
      </G>
      {/* A hairline round the silhouette. Not decoration: Blackout, Carbon and
          Toxic are all nearly black, and against a nearly black card their
          right-hand edge simply disappeared. On the table the key light keeps
          that edge; here it has to be drawn. */}
      <Path d={BODY_PATH} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.4} />

      {/* The rim: outer lip, the opening, and what is in it. */}
      <Ellipse
        cx={CX}
        cy={RIM_CY}
        rx={RIM_RX}
        ry={RIM_RY}
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth={1.6}
      />
      <Ellipse cx={CX} cy={RIM_CY} rx={RIM_RX * 0.9} ry={RIM_RY * 0.88} fill="#0A0F0A" />
      <Ellipse
        cx={CX}
        cy={RIM_CY + RIM_RY * 0.16}
        rx={RIM_RX * 0.82}
        ry={RIM_RY * 0.78}
        fill="#ffc542"
      />
    </Svg>
  );
}

/** Gradient definitions, for the one pattern that genuinely is a blend. */
function PatternDefs({ pattern, id }: { pattern: CupPattern; id: string }) {
  if (pattern.kind !== 'fade') return null;
  const span = pattern.colours.length - 1;
  return (
    <LinearGradient id={`fade-${id}`} x1="0" y1="1" x2="0" y2="0">
      {/* Listed base first and the texture runs them upwards, so the gradient
          goes from the bottom of the box to the top — y1 below y2. */}
      {pattern.colours.map((colour, index) => (
        <Stop key={index} offset={`${(index / span) * 100}%`} stopColor={colour} />
      ))}
    </LinearGradient>
  );
}

function PatternBody({ pattern, id }: { pattern: CupPattern; id: string }) {
  switch (pattern.kind) {
    case 'fade':
      return <Rect x="0" y="0" width={W} height={H} fill={`url(#fade-${id})`} />;

    case 'stripes': {
      const weights = pattern.weights ?? pattern.colours.map(() => 1);
      const total = weights.reduce((a, b) => a + b, 0);

      if (pattern.direction === 'vertical') {
        // Round the cup, so the bands crowd towards the edges.
        let u = 0;
        return (
          <G>
            {pattern.colours.map((colour, index) => {
              const from = wrapX(u, RIM_RX);
              u += weights[index] / total;
              // The last band is run to the far edge so rounding cannot leave
              // a hairline of background down the side.
              const to = index === pattern.colours.length - 1 ? CX + RIM_RX : wrapX(u, RIM_RX);
              return (
                <Rect key={index} x={from} y="0" width={Math.max(0, to - from)} height={H} fill={colour} />
              );
            })}
          </G>
        );
      }

      // Horizontal bands run up the cup and do not wrap, so they are simply
      // stacked — listed top band first, which is the order they are written.
      let y = RIM_CY;
      return (
        <G>
          {pattern.colours.map((colour, index) => {
            const band = (weights[index] / total) * BODY_H;
            const top = y;
            y += band;
            const bottom = index === pattern.colours.length - 1 ? H : y;
            return (
              <Rect key={index} x="0" y={top} width={W} height={Math.max(0, bottom - top)} fill={colour} />
            );
          })}
        </G>
      );
    }

    case 'cross': {
      const half = pattern.thickness / 2;
      const centre = pattern.offset ?? 0.5;
      const left = wrapX(Math.max(0, centre - half), RIM_RX);
      const right = wrapX(Math.min(1, centre + half), RIM_RX);
      return (
        <G>
          <Rect x="0" y="0" width={W} height={H} fill={pattern.background} />
          {/* The upright runs round the cup at one place, so it foreshortens;
              the crossbar runs round at one height, so it does not. */}
          <Rect x={left} y="0" width={Math.max(1, right - left)} height={H} fill={pattern.bar} />
          <Rect
            x="0"
            y={RIM_CY + BODY_H * (0.5 - half)}
            width={W}
            height={BODY_H * pattern.thickness}
            fill={pattern.bar}
          />
        </G>
      );
    }

    case 'checker': {
      const columns = pattern.squares;
      const rows = Math.max(3, Math.round(pattern.squares * 0.6));
      return (
        <G>
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: columns }, (_, column) => {
              const from = wrapX(column / columns, RIM_RX);
              const to = wrapX((column + 1) / columns, RIM_RX);
              return (
                <Rect
                  key={`${row}-${column}`}
                  x={from}
                  y={RIM_CY + (row / rows) * BODY_H}
                  width={Math.max(0, to - from)}
                  height={BODY_H / rows + 1}
                  fill={pattern.colours[(row + column) % 2]}
                />
              );
            })
          )}
        </G>
      );
    }

    case 'diagonal': {
      // Bands running corner to corner. Drawn as a wide rotated block so the
      // clip can cut the cup out of it — the same trick the old flat version
      // used, which was the one thing about it that worked.
      const bands = Math.max(6, pattern.around);
      const spread = W * 2.4;
      return (
        <G transform={`rotate(-58 ${CX} ${H / 2})`}>
          {Array.from({ length: bands }, (_, index) => (
            <Rect
              key={index}
              x={CX - spread / 2 + (index * spread) / bands}
              y={-H}
              width={spread / bands + 1}
              height={H * 3}
              fill={pattern.colours[index % pattern.colours.length]}
            />
          ))}
        </G>
      );
    }

    case 'blotches': {
      // Fixed positions rather than the texture's hash: six blotches is what
      // fits at this size, and they only have to say "camouflage". Placed in
      // wrapped coordinates so they crowd at the edges like everything else.
      const spots: [number, number, number][] = [
        [0.16, 0.2, 0.3],
        [0.62, 0.1, 0.24],
        [0.42, 0.46, 0.32],
        [0.04, 0.62, 0.26],
        [0.78, 0.58, 0.28],
        [0.34, 0.84, 0.22],
      ];
      return (
        <G>
          <Rect x="0" y="0" width={W} height={H} fill={pattern.background} />
          {spots.map(([u, v, r], index) => (
            <Ellipse
              key={index}
              cx={wrapX(u, RIM_RX)}
              cy={RIM_CY + v * BODY_H}
              rx={r * RIM_RX * (0.4 + 0.6 * Math.cos((u - 0.5) * Math.PI))}
              ry={r * RIM_RX * 0.8}
              fill={pattern.colours[index % pattern.colours.length]}
            />
          ))}
        </G>
      );
    }
  }
}
