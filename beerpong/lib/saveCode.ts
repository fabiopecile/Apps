import { CODE_ALPHABET, groupCode, normaliseCode, randomCodeChars } from './codes';

/**
 * The code that stands for your save.
 *
 * Everything the app knows about you lives in the browser's own storage on one
 * device. That is fine until the phone is replaced, the site data is cleared,
 * or somebody plays on a tablet — and then it is all gone, with no copy
 * anywhere. This is the copy.
 *
 * It is not an account. There is no email, no password and nothing personal on
 * the server: a save is a blob of numbers under a random code, and the code is
 * the only way to reach it. That also means the code is the whole secret —
 * whoever has it has the save — so twelve characters of real randomness, not a
 * memorable word.
 *
 * Twelve characters of a 31-character alphabet is about 59 bits. Guessing one
 * is not a thing that happens.
 */

export const SAVE_CODE_PREFIX = 'SV';
export const SAVE_CODE_LENGTH = 12;

export function makeSaveCode(): string {
  return groupCode(SAVE_CODE_PREFIX, randomCodeChars(SAVE_CODE_LENGTH));
}

/** Whatever was typed, reduced to the twelve characters that matter. */
export function normaliseSaveCode(raw: string): string {
  return normaliseCode(raw, SAVE_CODE_LENGTH, SAVE_CODE_PREFIX);
}

export function isSaveCode(raw: string): boolean {
  return normaliseSaveCode(raw).length === SAVE_CODE_LENGTH;
}

/** For display and for reading out: `SV-ABCD-EFGH-JKMN`. */
export function prettySaveCode(raw: string): string {
  const clean = normaliseSaveCode(raw);
  return clean.length === SAVE_CODE_LENGTH ? groupCode(SAVE_CODE_PREFIX, clean) : raw;
}

/**
 * True when somebody has pasted their *unlock* code in here by mistake.
 *
 * Two codes in one app is one too many to keep straight, and "that is not a
 * code" is a useless thing to say to somebody holding a perfectly good code of
 * the other kind.
 */
export function looksLikeUnlockCode(raw: string): boolean {
  return /^\s*BP[\s-]/i.test(raw);
}

export { CODE_ALPHABET };
