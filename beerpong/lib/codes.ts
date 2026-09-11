/**
 * The characters every code in this app is made of.
 *
 * Room codes, unlock codes and save codes all get read out across a noisy room
 * and typed in by somebody holding a drink, so they share one alphabet with no
 * I, L, O, 0 or 1 in it — the characters that get misheard and mistyped.
 *
 * A module of its own rather than one of them owning it: a save code importing
 * its alphabet from `licence.ts` would read as if a save were a kind of
 * licence, and it is not.
 */

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Bytes to characters of the alphabet above. */
export function encodeCodeChars(bytes: Uint8Array, count: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += CODE_ALPHABET[bytes[i % bytes.length] % CODE_ALPHABET.length];
  }
  return out;
}

/** Whatever was typed, reduced to the characters a code can contain. */
export function normaliseCode(raw: string, length: number, prefix?: string): string {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const withoutPrefix = prefix && upper.startsWith(prefix) ? upper.slice(prefix.length) : upper;
  return withoutPrefix
    .split('')
    .filter((character) => CODE_ALPHABET.includes(character))
    .join('')
    .slice(0, length);
}

/** `XX-ABCD-EFGH-JKMN` from a prefix and twelve characters. */
export function groupCode(prefix: string, characters: string): string {
  const groups: string[] = [];
  for (let i = 0; i < characters.length; i += 4) groups.push(characters.slice(i, i + 4));
  return [prefix, ...groups].join('-');
}

/**
 * A fresh code, from the platform's own randomness.
 *
 * `crypto.getRandomValues` exists in every browser and in the Workers runtime;
 * the fallback is there so a test environment without it does not crash, and
 * it is never the one that runs on a phone.
 */
export function randomCodeChars(count: number): string {
  const bytes = new Uint8Array(count);
  const source = (globalThis as { crypto?: Crypto }).crypto;
  if (source?.getRandomValues) source.getRandomValues(bytes);
  else for (let i = 0; i < count; i++) bytes[i] = Math.floor(Math.random() * 256);
  return encodeCodeChars(bytes, count);
}
