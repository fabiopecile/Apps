/**
 * The parts of the highlight recorder that are the same everywhere.
 *
 * This file exists because of a trap in Metro's platform resolution: inside
 * `highlights.web.ts`, an import of `./highlights` resolves to
 * *`highlights.web.ts` itself*, not to the base file. Re-exporting a constant
 * that way is an infinitely recursive getter, and it takes the whole app down
 * with a stack overflow on the first render — not just the screen that uses it,
 * because the router loads every route at startup.
 *
 * So anything both builds need lives here, in a module with no platform
 * variant of its own, and both import from this.
 */

/** How much of the run-up a clip keeps, in seconds. */
export const HIGHLIGHT_SECONDS = 8;
/** How many clips are kept before the oldest is dropped. */
export const HIGHLIGHT_LIMIT = 12;

export interface HighlightClip {
  id: string;
  /** When it was captured. */
  at: number;
  /** Roughly how long it runs, in seconds. */
  seconds: number;
  /** Bytes on disk, for the "how much is this costing me" line. */
  size: number;
  /** A URL the player can use. Only valid while the app is open. */
  url: string;
}

export interface HighlightRecorder {
  /** True once the camera stream has been found and recording has begun. */
  readonly recording: boolean;
  /** Lifts the last few seconds out of the ring and stores them. */
  capture(): Promise<HighlightClip | null>;
  stop(): void;
}

/** Kilobytes or megabytes, whichever reads better. */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
