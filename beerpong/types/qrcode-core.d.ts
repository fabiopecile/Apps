/**
 * Types for the one corner of `qrcode` this app uses.
 *
 * The package ships no types for its internals, and `@types/qrcode` only
 * describes the public renderers — which are the ones that reach for `fs` and a
 * canvas, and are exactly what `lib/qr.ts` avoids. This is the whole surface:
 * a string in, a grid of modules out.
 */
declare module 'qrcode/lib/core/qrcode' {
  export interface QrCodeMatrix {
    size: number;
    /** One byte per module, row by row. 1 is a dark module. */
    data: Uint8Array;
  }

  export interface QrCodeResult {
    version: number;
    modules: QrCodeMatrix;
  }

  export function create(
    data: string,
    options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; version?: number }
  ): QrCodeResult;
}
