import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { qrModules } from '@/lib/qr';
import { colors } from '@/theme';

/**
 * A QR code, drawn as squares.
 *
 * Deliberately not an image: there is nothing to fetch, nothing to cache, and
 * it works the same in the browser and in a native build. The encoder hands
 * back a grid of true and false and this turns that into rectangles.
 *
 * Dark modules are drawn on a light square rather than the app's black, and
 * that is not a style choice — a scanner expects dark-on-light, and the
 * inversion is the single most common way a hand-rolled QR ends up unreadable.
 * The quiet border around it is required by the format for the same reason.
 *
 * One `Rect` per run of dark modules along a row rather than one per module: a
 * version-3 code is 29 × 29, and 841 rectangles is a lot of views to lay out on
 * a phone for a picture that is mostly stripes.
 */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const { count, runs } = useMemo(() => {
    const grid = qrModules(value);
    const found: { x: number; y: number; width: number }[] = [];
    for (let y = 0; y < grid.size; y++) {
      let start = -1;
      for (let x = 0; x <= grid.size; x++) {
        const dark = x < grid.size && grid.dark(x, y);
        if (dark && start < 0) start = x;
        if (!dark && start >= 0) {
          found.push({ x: start, y, width: x - start });
          start = -1;
        }
      }
    }
    return { count: grid.size, runs: found };
  }, [value]);

  // Four modules of quiet border, as the format asks for.
  const quiet = 4;
  const span = count + quiet * 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${span} ${span}`}>
        <Rect x={0} y={0} width={span} height={span} fill={colors.textPrimary} />
        {runs.map((run, index) => (
          <Rect
            key={index}
            x={run.x + quiet}
            y={run.y + quiet}
            width={run.width}
            height={1}
            fill={colors.background}
          />
        ))}
      </Svg>
    </View>
  );
}
