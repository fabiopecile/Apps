import { Platform } from 'react-native';

import { ONLINE_AVAILABLE, ONLINE_SERVER_URL } from './onlineConfig';
import {
  DEFAULT_CURRENCY,
  DEFAULT_PRICE_CENTS,
  looksLikeLicence,
  normaliseLicence,
} from './licence';

/**
 * Buying the one thing that is for sale.
 *
 * It runs on the same Worker as the online rooms, because it is the same
 * server and asking somebody to set up two is one setup too many. Which also
 * means the app cannot tell from configuration alone whether anything is
 * actually purchasable — the Stripe keys live on the server — so it asks, and
 * says "not purchasable yet" when the answer is no rather than showing a
 * button that fails.
 *
 * Nothing here holds a secret. The app sends "start a checkout" and gets back
 * a URL; everything to do with cards happens on Stripe's own page.
 */

/**
 * Why the shop is shut, when it is.
 *
 * Worth carrying around rather than collapsing into `enabled: false`, because
 * the three causes need three different people to do three different things —
 * and from the outside all three look identical: no button. Whoever set this
 * up should not have to guess which one they are looking at.
 */
export type ShopClosedReason =
  /** No server address was built into this version of the app. */
  | 'no-server'
  /** There is an address, but nothing answered at it. */
  | 'unreachable'
  /** The server answered and said it has no Stripe keys. */
  | 'no-keys'
  /** Open for business. */
  | null;

export interface ShopInfo {
  enabled: boolean;
  /** In the currency's smallest unit, the way Stripe counts. */
  amount: number;
  currency: string;
  closedBecause: ShopClosedReason;
  /** Which server settings are absent, by name, when the answer was 'no-keys'. */
  missing: string[];
}

export const SHOP_CLOSED: ShopInfo = {
  enabled: false,
  amount: DEFAULT_PRICE_CENTS,
  currency: DEFAULT_CURRENCY,
  closedBecause: 'no-server',
  missing: [],
};

/**
 * Checkout is a redirect, so it only completes on the web.
 *
 * On a phone build the browser opens, the payment goes through and the web app
 * unlocks — but nothing comes back into this process. That is what the licence
 * code is for: type it in and the native build unlocks too. Better than a
 * deep-link scheme that half works.
 */
export const CHECKOUT_REDIRECTS = Platform.OS === 'web';

export async function fetchShop(): Promise<ShopInfo> {
  if (!ONLINE_AVAILABLE) return SHOP_CLOSED;
  try {
    const response = await fetch(`${ONLINE_SERVER_URL}/shop`);
    if (!response.ok) return { ...SHOP_CLOSED, closedBecause: 'unreachable' };
    const data = (await response.json()) as Partial<ShopInfo>;
    const enabled = data.enabled === true;
    return {
      enabled,
      amount: typeof data.amount === 'number' ? data.amount : DEFAULT_PRICE_CENTS,
      currency: typeof data.currency === 'string' ? data.currency : DEFAULT_CURRENCY,
      closedBecause: enabled ? null : 'no-keys',
      // An older server does not send this. Then the message names both, which
      // is what it said before and is still true.
      missing: Array.isArray(data.missing) ? data.missing.filter((n) => typeof n === 'string') : [],
    };
  } catch {
    return { ...SHOP_CLOSED, closedBecause: 'unreachable' };
  }
}

/** The address the app is actually talking to, for the diagnosis on screen. */
export const SHOP_SERVER_URL = ONLINE_SERVER_URL;

/**
 * Opens a checkout. `path` is the app route to come back to, which the web
 * build needs because Pages serves it under a sub-path.
 */
export async function startCheckout(
  path: string
): Promise<{ url: string; sessionId: string } | null> {
  if (!ONLINE_AVAILABLE) return null;
  try {
    const response = await fetch(`${ONLINE_SERVER_URL}/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { url?: string; sessionId?: string };
    if (!data.url || !data.sessionId) return null;
    return { url: data.url, sessionId: data.sessionId };
  } catch {
    return null;
  }
}

/** Asks the server whether that session was paid, and for the code if it was. */
export async function claimLicence(sessionId: string): Promise<string | null> {
  if (!ONLINE_AVAILABLE) return null;
  try {
    const response = await fetch(
      `${ONLINE_SERVER_URL}/licence?session=${encodeURIComponent(sessionId)}`
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { paid?: boolean; licence?: string };
    return data.paid && typeof data.licence === 'string' ? data.licence : null;
  } catch {
    return null;
  }
}

/** Checks a code somebody typed in — a second phone, or a replacement one. */
export async function verifyLicence(code: string): Promise<boolean> {
  if (!ONLINE_AVAILABLE || !looksLikeLicence(code)) return false;
  try {
    const response = await fetch(`${ONLINE_SERVER_URL}/licence/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licence: normaliseLicence(code) }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}
