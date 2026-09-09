import { useId } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * The app mark: a six-cup rack with a ball dropping into the front cup. Same
 * geometry as tools/gen_icons.py, so the in-app logo and the launcher icon are
 * the same drawing.
 *
 * The viewBox is 100x100 with the artwork laid out to fill it, so callers only
 * pick a size.
 */

/** Cup centres, three rows of 1-2-3 pointing up. */
const CUPS = [
  { x: 50, y: 30.5 },
  { x: 38.2, y: 51 },
  { x: 61.8, y: 51 },
  { x: 26.4, y: 71.5 },
  { x: 50, y: 71.5 },
  { x: 73.6, y: 71.5 },
];
const CUP_R = 10.2;

/** Dots along the ball's flight path, front of the trail last. */
const TRAIL = [
  { x: 76.5, y: 12.0, r: 1.15 },
  { x: 71.6, y: 13.8, r: 1.35 },
  { x: 67.0, y: 15.9, r: 1.55 },
  { x: 62.7, y: 18.2, r: 1.75 },
  { x: 58.7, y: 20.8, r: 1.95 },
];
const BALL = { x: 82.5, y: 10.5, r: 5.1 };

export interface LogoMarkProps {
  size?: number;
  /** Hidden for tiny renderings, where the trail turns into noise. */
  showBall?: boolean;
  color?: string;
  accentColor?: string;
}

export function LogoMark({
  size = 120,
  showBall = true,
  color = colors.neon,
  accentColor = colors.neonAlt,
}: LogoMarkProps) {
  // Gradient ids are resolved document-wide, so two logos on one screen would
  // otherwise share the first one's fill.
  const id = useId();

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`cup-${id}`} cx="50%" cy="42%" r="62%">
          <Stop offset="0" stopColor={accentColor} stopOpacity={0.34} />
          <Stop offset="1" stopColor={color} stopOpacity={0.08} />
        </RadialGradient>
      </Defs>

      {showBall
        ? TRAIL.map((dot, i) => (
            <Circle
              key={i}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill={color}
              opacity={0.35 + i * 0.12}
            />
          ))
        : null}

      {CUPS.map((cup, i) => {
        // The rack shifts from neon to the cooler accent front to back.
        const tint = i < 3 ? color : accentColor;
        return (
          <Circle
            key={i}
            cx={cup.x}
            cy={cup.y}
            r={CUP_R}
            fill={`url(#cup-${id})`}
            stroke={tint}
            strokeWidth={2.1}
          />
        );
      })}

      {showBall ? <Circle cx={BALL.x} cy={BALL.y} r={BALL.r} fill="#F5F7F5" /> : null}
    </Svg>
  );
}

/** Geometry export so animated variants can stagger the same parts. */
export const LOGO_PARTS = { CUPS, CUP_R, TRAIL, BALL };
