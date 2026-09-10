/**
 * Saving the seconds around a hit as a clip.
 *
 * The interesting part of a beer pong hit is over before anybody reaches for a
 * phone, so a highlight has to be *already recorded* by the time it is asked
 * for. That means a rolling buffer: the camera records continuously into a
 * short ring and, when a cup is confirmed, the last few seconds are lifted out
 * and kept. Nothing else is stored, and nothing is uploaded anywhere.
 *
 * This is the native build, where it is unavailable. `expo-camera` can record
 * a video on a phone, but not while the same preview is being sampled for cup
 * detection — and a highlight of a game the app was not watching is not much
 * of a feature. The web build does both at once through `MediaRecorder`; see
 * highlights.web.ts. Everything shared between the two lives in
 * highlightsShared.ts, and has to: see the note there.
 */

export {
  HIGHLIGHT_LIMIT,
  HIGHLIGHT_SECONDS,
  formatSize,
  type HighlightClip,
  type HighlightRecorder,
} from './highlightsShared';

export const HIGHLIGHTS_SUPPORTED = false;

export function createHighlightRecorder(): null {
  return null;
}

export async function listHighlights(): Promise<[]> {
  return [];
}

export async function deleteHighlight(_id: string): Promise<void> {}

export async function clearHighlights(): Promise<void> {}
