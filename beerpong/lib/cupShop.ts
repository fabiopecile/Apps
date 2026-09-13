import { COIN_CUP_DESIGNS, type CupDesign } from './cupSkins';
import { weekStartOf } from './entitlement';

/**
 * What the coins are for.
 *
 * Before this there were seven things to buy — four balls and three tables,
 * fourteen thousand coins in total. Somebody who plays a hundred matches owns
 * all of them, and from then on every cup sunk pays out a currency that cannot
 * buy anything. A reward you cannot spend stops being a reward.
 *
 * So the designs rotate. Three a week out of twelve, which means the whole set
 * comes round in a month: there is always something to save for, nothing is
 * gone forever, and the week you have the coins is not the week you happen to
 * see the one you wanted.
 *
 * The rotation is worked out from the date rather than fetched, so it needs no
 * server, works on a phone with no signal, and — this is the part that matters
 * — is the same three designs for everybody in the same week. Two people at the
 * same table comparing shops and seeing different things would look broken.
 */

/** How many are on offer at once. */
export const WEEKLY_OFFER_SIZE = 3;

/**
 * The Monday the rotation is counted from.
 *
 * Any fixed Monday does; this one is simply in the past. It is the anchor that
 * makes "week number" mean the same thing on every phone, so moving it would
 * reshuffle everybody's shop.
 */
const EPOCH = Date.UTC(2024, 0, 1);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Which week of the rotation a date falls in. Counts up, never resets. */
export function shopWeek(now: Date): number {
  const monday = Date.parse(`${weekStartOf(now)}T00:00:00Z`);
  return Math.floor((monday - EPOCH) / WEEK_MS);
}

/**
 * This week's three.
 *
 * A sliding window rather than a shuffle: week n takes the three designs after
 * week n-1's, wrapping round at the end of the list. That guarantees what a
 * random pick cannot — every design appears exactly once every four weeks, and
 * no design is ever offered twice in a row while another waits months.
 */
export function weeklyOffer(now: Date): CupDesign[] {
  const week = shopWeek(now);
  const pool = COIN_CUP_DESIGNS;
  const offer: CupDesign[] = [];
  for (let i = 0; i < WEEKLY_OFFER_SIZE; i++) {
    const at = (week * WEEKLY_OFFER_SIZE + i) % pool.length;
    offer.push(pool[((at % pool.length) + pool.length) % pool.length]);
  }
  return offer;
}

/** Midnight on the Monday the shop changes, in the phone's own timezone. */
export function nextRotation(now: Date): Date {
  const monday = new Date(`${weekStartOf(now)}T00:00:00`);
  monday.setDate(monday.getDate() + 7);
  return monday;
}

/** Whole hours until the shop changes, for the line under the offer. */
export function hoursUntilRotation(now: Date): number {
  return Math.max(0, Math.ceil((nextRotation(now).getTime() - now.getTime()) / (60 * 60 * 1000)));
}

/**
 * How many weeks before a design is next on the shelf. 0 means it is there now.
 *
 * Shown on the ones you missed, because "back in two weeks" is a reason to keep
 * playing and an empty grid is not.
 */
export function weeksUntilOffered(designId: string, now: Date): number {
  const pool = COIN_CUP_DESIGNS;
  const index = pool.findIndex((design) => design.id === designId);
  if (index < 0) return -1;
  const week = shopWeek(now);
  for (let ahead = 0; ahead < pool.length; ahead++) {
    const start = ((week + ahead) * WEEKLY_OFFER_SIZE) % pool.length;
    for (let i = 0; i < WEEKLY_OFFER_SIZE; i++) {
      if ((start + i) % pool.length === index) return ahead;
    }
  }
  return -1;
}

/** What a coin design costs, or null if that is not how it is sold. */
export function coinPrice(designId: string): number | null {
  return COIN_CUP_DESIGNS.find((design) => design.id === designId)?.coins ?? null;
}
