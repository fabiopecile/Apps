import { PAID_CUP_DESIGNS } from './cupSkins';

/**
 * Everything that can be bought, with what it costs.
 *
 * One list, imported by the app *and* by the Worker, because the two must never
 * disagree about a price. The app shows what this says; the server charges what
 * this says and signs a code for what this says. A price that lived only in the
 * app would be a price anybody could edit in their browser.
 *
 * Prices are in cents, the way Stripe counts.
 */

export type ItemKind = 'pro' | 'cups' | 'bundle';

export interface CatalogueItem {
  id: string;
  kind: ItemKind;
  cents: number;
  /** For a cup pack: the design it unlocks. */
  design?: string;
  /** For the bundle: everything it unlocks. */
  unlocks?: string[];
}

/** The camera without a weekly limit. The original purchase. */
export const PRO_ITEM = 'pro';
/** Every country cup at once, for less than buying four of them. */
export const CUP_BUNDLE_ITEM = 'cups-all';

export const CUP_PRICE_CENTS = 199;
/**
 * Cheaper than four designs, not "about four".
 *
 * It was 7,99 € first, which is three cents *more* than four at 1,99 — a
 * bundle that costs more than the thing it bundles is the kind of detail that
 * gets noticed and screenshotted. At 6,99 somebody who wants two buys two, and
 * anybody past three is better off with the lot.
 */
export const CUP_BUNDLE_CENTS = 699;

export const CATALOGUE: CatalogueItem[] = [
  { id: PRO_ITEM, kind: 'pro', cents: 499 },
  ...PAID_CUP_DESIGNS.map(
    (design): CatalogueItem => ({
      id: `item-${design.id}`,
      kind: 'cups',
      cents: CUP_PRICE_CENTS,
      design: design.id,
    })
  ),
  {
    id: CUP_BUNDLE_ITEM,
    kind: 'bundle',
    cents: CUP_BUNDLE_CENTS,
    unlocks: PAID_CUP_DESIGNS.map((design) => design.id),
  },
];

export function catalogueItem(id: string): CatalogueItem | null {
  return CATALOGUE.find((item) => item.id === id) ?? null;
}

/** The item id that sells a given cup design. */
export function itemForDesign(designId: string): string {
  return `item-${designId}`;
}

/** Which designs a paid item hands over — one, or all of them. */
export function designsUnlockedBy(itemId: string): string[] {
  const item = catalogueItem(itemId);
  if (!item) return [];
  if (item.unlocks) return item.unlocks;
  return item.design ? [item.design] : [];
}

/** What something costs, or null if it is not for sale. */
export function priceOfItem(id: string): number | null {
  return catalogueItem(id)?.cents ?? null;
}
