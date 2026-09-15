import { legalComplete, missingOperatorFields } from './legal';

/**
 * Whether this build sells anything at all.
 *
 * The app was built with a shop in it, and the shop works. What it did not have
 * was the paperwork that comes with taking money from consumers — an Impressum,
 * a withdrawal notice, a business registration — and none of that is something
 * code can produce. So the selling is behind a switch, and the switch is **off
 * by default**: a build made with no extra configuration is a free app with no
 * shop in it, which is a thing that can be published today.
 *
 * That default is the point. The dangerous order of events is publishing a shop
 * and adding the paperwork afterwards; taking money without an Impressum is
 * what actually gets a small operation a warning letter. Off by default makes
 * the safe order the one that requires no decision.
 *
 * ## Turning it on
 *
 * Two things, both required:
 *
 *   1. Fill in `OPERATOR` in `lib/legal.ts` — name, street, town, email.
 *   2. Set `EXPO_PUBLIC_SALES=on` for the build (a repository variable named
 *      `SALES` in the deploy workflow).
 *
 * Either one alone does nothing, and that is deliberate rather than tidy: a
 * switch that turns on selling without an Impressum being present is a switch
 * that lets somebody make exactly the mistake this file exists to prevent. The
 * gate is on the data, not on a second flag, because a flag can be true while
 * the address line is still empty.
 *
 * ## What "off" actually changes
 *
 * Not just a hidden button — the shop is genuinely absent, and the things that
 * only made sense next to a price go with it:
 *
 *   - The camera tracker runs **without the weekly limit**. A limit whose only
 *     way past it is a purchase nobody can make is not a free tier, it is a
 *     dead end.
 *   - The country cup designs are not shown. They are not free either; they do
 *     not exist in this build. Making them free would mean taking them away
 *     again the day the shop opens.
 *   - The Pro screen stops being a sales page and the manual's chapter about
 *     prices is replaced by one saying everything is free.
 *
 * Which means switching it on later gives people more, never less — nothing
 * anybody earned or was shown gets withdrawn.
 */

/**
 * Written out in full rather than read from a variable: Metro only replaces
 * `process.env.EXPO_PUBLIC_*` at build time when it can see the name literally.
 */
const wanted = (process.env.EXPO_PUBLIC_SALES ?? '').trim().toLowerCase();

/** What was asked for, before the legal details get a say. */
export const SALES_REQUESTED = wanted === 'on' || wanted === '1' || wanted === 'true';

/** Whether anything is actually for sale in this build. */
export const SALES_ENABLED = SALES_REQUESTED && legalComplete();

/**
 * Why selling is off, when it is — for the person who set the build up.
 *
 * From outside, "no switch" and "switch on but the address is blank" look
 * identical: no shop. They need two different people to do two different
 * things, so the app says which.
 */
export type SalesOffReason =
  /** Nobody asked for a shop. The ordinary state of a free build. */
  | 'switched-off'
  /** Somebody asked, but `OPERATOR` in `lib/legal.ts` is not filled in. */
  | 'no-legal'
  /** Open for business. */
  | null;

export const SALES_OFF_REASON: SalesOffReason = SALES_ENABLED
  ? null
  : SALES_REQUESTED
    ? 'no-legal'
    : 'switched-off';

/** Named, so the message can say which lines are still blank. */
export const SALES_MISSING_FIELDS: string[] = SALES_REQUESTED ? missingOperatorFields() : [];

/**
 * Whether the camera tracker runs without its weekly limit.
 *
 * Kept here rather than in `lib/entitlement.ts` on purpose: that file is pure
 * arithmetic over a clock and a counter, tested as such, and it should not grow
 * a dependency on how this particular build was configured. Callers pass this
 * in where they used to pass `pro`.
 */
export function trackerUnlimited(pro: boolean): boolean {
  return pro || !SALES_ENABLED;
}

/**
 * Whether the legal documents are worth putting on screen.
 *
 * True as soon as the details are filled in, whether or not selling is on — a
 * privacy notice is worth showing in a free app too, and it costs nothing to
 * have it ready before the shop opens.
 */
export const LEGAL_AVAILABLE = legalComplete();
