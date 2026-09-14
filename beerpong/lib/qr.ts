// The core encoder only: no canvas, no file writing, no command line. Imported
// by this path rather than as `qrcode` on purpose — the package's main entry
// pulls in `pngjs` and `fs` for its node-side renderers, which is fine on a
// laptop and is a broken native build. This file is the one place that knows
// that, so nothing else has to.
import { create } from 'qrcode/lib/core/qrcode';

/**
 * A string as a grid of dark and light squares.
 *
 * Error correction is set to M — a quarter of the code can be obscured and it
 * still reads. That matters more than it sounds: this gets scanned off a phone
 * screen held up in a dim room by somebody who has been drinking, at an angle,
 * with a thumb across one corner.
 */
export interface QrGrid {
  /** Modules along one side, not counting the quiet border. */
  size: number;
  dark: (x: number, y: number) => boolean;
}

export function qrModules(value: string): QrGrid {
  const code = create(value, { errorCorrectionLevel: 'M' });
  const size: number = code.modules.size;
  const data: Uint8Array = code.modules.data;
  return {
    size,
    dark: (x, y) => data[y * size + x] === 1,
  };
}
