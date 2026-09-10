/**
 * The shape of a cup, in one place.
 *
 * Both the drawing and the physics need to agree on where a cup's mouth is and
 * how big it is. They did not once before: the art put the opening a third of
 * the cup's height above its centre while the physics aimed at the centre, so
 * a ball scored without ever looking like it went in. Everything about the
 * silhouette now comes from here, and `tools/test_throw_physics.mjs` checks the
 * two still line up.
 *
 * Coordinates are fractions of the sprite box, which is `width` across and
 * `width * CUP_ASPECT` tall, so one set of numbers serves every cup size.
 */

/** height = width * this, like a real moulded cup. */
export const CUP_ASPECT = 1.35;

/** The drawing board every cup is laid out on. */
export const ART_WIDTH = 100;
export const ART_HEIGHT = ART_WIDTH * CUP_ASPECT;

/** Rim and base radii across, in art units. A cup tapers towards its base. */
export const RIM_RX = 37;
export const BASE_RX = 27;
/** Clearance above the rim and below the base, so nothing clips the box. */
const TOP_MARGIN = 5;
const BOTTOM_MARGIN = 9;

/**
 * How open a cup's mouth looks — the `ry / rx` of the rim ellipse.
 *
 * This is the cue that makes a cup read as an object rather than a sticker: a
 * cup close to you is seen from above and its mouth is nearly round, one at the
 * far end is seen almost edge-on and its mouth is a thin slit. Every cup used
 * to be drawn with the same 0.26, which is why they all looked flat.
 *
 * Driven by the cup's own width rather than by one camera over the whole
 * table, and that is deliberate: the table is *not* a single perspective.
 * Fitting a pinhole camera to the two racks lands 6.35pt out on widths of
 * 34-68 and pins against its bounds, because the camera pans down the table
 * and each rack is laid out to be looked at in turn. Width is what actually
 * encodes depth here.
 */
export const MIN_CUP_WIDTH = 34;
export const MAX_CUP_WIDTH = 68;
const OPENNESS_FAR = 0.28;
const OPENNESS_NEAR = 0.54;

export function cupOpenness(width: number): number {
  const share = (width - MIN_CUP_WIDTH) / (MAX_CUP_WIDTH - MIN_CUP_WIDTH);
  const clamped = Math.max(0, Math.min(1, share));
  return OPENNESS_FAR + (OPENNESS_NEAR - OPENNESS_FAR) * clamped;
}

export interface CupArtGeometry {
  openness: number;
  rimRx: number;
  rimRy: number;
  rimCy: number;
  baseRx: number;
  baseRy: number;
  baseCy: number;
  /** Where the beer sits, below the rim. */
  beerRx: number;
  beerRy: number;
  beerCy: number;
}

/**
 * The cup's silhouette in art units.
 *
 * The mouth sits lower on the board the rounder it is, because a more open
 * ellipse takes more room — which also shortens the body, and that is real
 * foreshortening rather than a fudge: a cup seen more from above shows less of
 * its side.
 */
export function cupArtGeometry(width: number): CupArtGeometry {
  const openness = cupOpenness(width);
  const rimRy = RIM_RX * openness;
  const baseRy = BASE_RX * openness;
  const rimCy = TOP_MARGIN + rimRy;
  const baseCy = ART_HEIGHT - BOTTOM_MARGIN - baseRy;
  // A cup is never full; the surface sits a little way down the inside.
  const beerDrop = (baseCy - rimCy) * 0.1;
  const beerRx = RIM_RX * 0.82;
  return {
    openness,
    rimRx: RIM_RX,
    rimRy,
    rimCy,
    baseRx: BASE_RX,
    baseRy,
    baseCy,
    beerRx,
    beerRy: beerRx * openness,
    beerCy: rimCy + beerDrop,
  };
}

/**
 * How far above a cup's stored position its mouth sits, as a fraction of the
 * cup's height.
 *
 * The layout stores a cup by the centre of its sprite box. The opening is well
 * above that, and this is the number that says by how much — the one the
 * physics has to aim at.
 */
export function mouthAboveCentre(width: number): number {
  const { rimCy } = cupArtGeometry(width);
  return (ART_HEIGHT / 2 - rimCy) / ART_HEIGHT;
}
