/**
 * The unlock code somebody gets for their €4.99.
 *
 * There are no accounts in this app and there should not be for a one-off
 * purchase, so the receipt has to *be* the licence: a short code that verifies
 * itself. The server signs it, the app stores it, and it can be typed into a
 * second phone or a replacement one without anybody logging in anywhere.
 *
 * Shape: `BP-XXXX-XXXX-CCCC`. The first eight characters are derived from the
 * Stripe session, the last four are a check derived from those eight. Both come
 * from an HMAC with a secret only the server has, so a code cannot be invented
 * — but it also cannot be revoked, and anyone who is given one can use it.
 *
 * That is a deliberate trade rather than an oversight. Tying a €4.99 unlock to
 * a device punishes the person who drops their phone far more often than it
 * stops the person who shares a code with a friend, and the only real fix is
 * accounts, which cost more than the thing being protected.
 *
 * Imported by both the app and the Worker, so there is one definition of what
 * a valid code looks like.
 */

/**
 * The same alphabet the room codes use: no I, L, O, 0 or 1, because these get
 * read out and typed in by people who have been drinking.
 */
export const LICENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** Characters derived from the purchase. */
export const LICENCE_BODY = 8;
/** Characters of check digit. Twenty bits: a guess is one in a million. */
export const LICENCE_CHECK = 4;
export const LICENCE_PREFIX = 'BP';

/** What the price is, in the smallest unit — overridden by the server's answer. */
export const DEFAULT_PRICE_CENTS = 499;
export const DEFAULT_CURRENCY = 'eur';

/** Bytes to characters of the alphabet above. */
export function encodeLicenceChars(bytes: Uint8Array, count: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += LICENCE_ALPHABET[bytes[i % bytes.length] % LICENCE_ALPHABET.length];
  }
  return out;
}

/** `BP-ABCD-EFGH-JKMN` from the twelve significant characters. */
export function formatLicence(body: string, check: string): string {
  const all = `${body}${check}`;
  return `${LICENCE_PREFIX}-${all.slice(0, 4)}-${all.slice(4, 8)}-${all.slice(8, 12)}`;
}

/**
 * Whatever was typed, reduced to the twelve characters that matter.
 *
 * Lower case, missing dashes and a pasted "BP-" prefix all have to work: this
 * is read off another phone screen across a table.
 */
export function normaliseLicence(raw: string): string {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const withoutPrefix = upper.startsWith(LICENCE_PREFIX) ? upper.slice(LICENCE_PREFIX.length) : upper;
  return withoutPrefix
    .split('')
    .filter((character) => LICENCE_ALPHABET.includes(character))
    .join('')
    .slice(0, LICENCE_BODY + LICENCE_CHECK);
}

/** True when it is the right length and alphabet — not that it is signed. */
export function looksLikeLicence(raw: string): boolean {
  return normaliseLicence(raw).length === LICENCE_BODY + LICENCE_CHECK;
}

export function splitLicence(raw: string): { body: string; check: string } | null {
  const clean = normaliseLicence(raw);
  if (clean.length !== LICENCE_BODY + LICENCE_CHECK) return null;
  return { body: clean.slice(0, LICENCE_BODY), check: clean.slice(LICENCE_BODY) };
}

/** For display: the grouped form, whatever was passed in. */
export function prettyLicence(raw: string): string {
  const parts = splitLicence(raw);
  return parts ? formatLicence(parts.body, parts.check) : raw;
}

/**
 * The price, written the way the phone's language writes money.
 *
 * `amount` is in the currency's smallest unit, as Stripe counts it.
 */
export function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    // An unknown currency code should not take a screen down over a price.
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
