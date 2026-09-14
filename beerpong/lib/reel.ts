/**
 * One video of the evening, cut from the clips.
 *
 * This is the native build, where there is nothing to cut. The clips themselves
 * only exist in the web build — see `lib/highlights.ts` for why — so a reel of
 * them cannot exist here either. Both are honest about it on screen rather than
 * offering a button that does nothing.
 *
 * Everything shared between the two lives in `reelShared.ts`, and has to: see
 * the note there about what happens if a platform file re-exports through its
 * own name.
 */

import type { ReelOptions, ReelResult } from './reelShared';

export {
  REEL_CLIPS,
  REEL_SECONDS_PER_CLIP,
  REEL_TITLE_SECONDS,
  estimateReelSeconds,
  reelFilename,
  type ReelOptions,
  type ReelProgress,
  type ReelResult,
} from './reelShared';

export const REEL_SUPPORTED = false;

/**
 * Takes the same arguments as the web one and returns nothing.
 *
 * The signature has to match: this is the file TypeScript checks the screens
 * against, so a stub that took no arguments would make every call site an error
 * while the code it actually runs on the web is fine.
 */
export async function buildReel(_options: ReelOptions): Promise<ReelResult | null> {
  return null;
}
