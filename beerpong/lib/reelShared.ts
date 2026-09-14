/**
 * The parts of the reel builder that are the same on every platform.
 *
 * Split out for the same reason `highlightsShared.ts` is: inside
 * `reel.web.ts`, an import of `./reel` resolves to that file itself, and
 * re-exporting a constant through it is an infinitely recursive getter that
 * takes the whole app down on first render. Anything both builds need lives
 * here, in a module with no platform variant of its own.
 */

/**
 * How many clips go into a reel, newest first.
 *
 * Eight rather than all twelve because a reel is watched, and nobody watches a
 * two-minute video of a beer pong evening. It is also built in real time — the
 * clips are played through and re-recorded — so every clip in it is time
 * somebody spends staring at a progress bar.
 */
export const REEL_CLIPS = 8;

/**
 * Seconds taken from each clip.
 *
 * From the **end** of it, which is the whole point. A clip keeps eight seconds
 * of run-up before a cup goes down, so the throw and the cup are the last
 * moments; taking the first few seconds of each would give a reel of people
 * standing around.
 */
export const REEL_SECONDS_PER_CLIP = 3.5;

/** How long the card at the front stays up. */
export const REEL_TITLE_SECONDS = 1.6;

export interface ReelProgress {
  /** 0 to 1. */
  done: number;
  /** Which clip is being worked on, counting from 1. */
  clip: number;
  of: number;
}

export interface ReelResult {
  /** A URL for the finished video, valid while the app is open. */
  url: string;
  /** What the browser actually produced — mp4 on Safari, webm elsewhere. */
  mimeType: string;
  seconds: number;
  size: number;
  /** A name to save it under. */
  filename: string;
}

export interface ReelOptions {
  /** Shown on the card at the front. */
  title: string;
  subtitle: string;
  onProgress?: (progress: ReelProgress) => void;
}

/** Roughly how long building a reel will take, in seconds. */
export function estimateReelSeconds(clipCount: number): number {
  return Math.round(
    REEL_TITLE_SECONDS + Math.min(clipCount, REEL_CLIPS) * REEL_SECONDS_PER_CLIP
  );
}

/** `beerpong-reel-2026-09-13.webm` */
export function reelFilename(at: Date, mimeType: string): string {
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const day = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(
    at.getDate()
  ).padStart(2, '0')}`;
  return `beerpong-reel-${day}.${extension}`;
}
