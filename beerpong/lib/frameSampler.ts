import type { CupSample } from './cupVision';

/**
 * Reads the camera preview and reduces each cup's patch to a few numbers.
 *
 * This is the native build. `expo-camera` gives no access to individual
 * frames — only whole JPEGs through `takePictureAsync`, which cannot be turned
 * into pixels without a native module — so detection is unavailable here.
 * See frameSampler.web.ts for the implementation the web build uses, and the
 * README for what a native version would need.
 */

/** A cup's patch, as a fraction of the preview: 0-1 in both axes. */
export interface SampleRegion {
  x: number;
  y: number;
  radius: number;
}

export interface FrameSampler {
  sample(regions: SampleRegion[]): CupSample[] | null;
  dispose(): void;
}

export const FRAME_SAMPLING_SUPPORTED = false;

export function createFrameSampler(): FrameSampler | null {
  return null;
}
