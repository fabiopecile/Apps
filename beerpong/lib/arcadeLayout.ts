/**
 * Where everything stands on the table, in table points.
 *
 * These are **ground coordinates**, not screen coordinates: `x` runs across the
 * table and `y` runs away from you down it, both flat on the surface. The
 * camera turns them into a picture, so nothing here fakes perspective.
 *
 * That is a change worth spelling out, because the old version of this file did
 * fake it: cups were listed 34 points wide at the far end and 68 at the near
 * one, so they *drew* smaller further away. With a real camera doing that job,
 * keeping it here would shrink them twice over. Every cup is the same size now,
 * as they are on a real table.
 */

export interface CupSpec {
  index: number;
  x: number;
  y: number;
  /** Diameter of the mouth. The same for every cup. */
  width: number;
  /** How tall the cup stands. */
  height: number;
}

/** A cup's mouth across, and how tall it stands. */
export const CUP_WIDTH = 46;
export const CUP_ASPECT = 1.35;
export const CUP_HEIGHT = CUP_WIDTH * CUP_ASPECT;

/**
 * Cups in a rack touch, and the rows of a triangle nest into each other, so a
 * row sits `sqrt(3)/2` of a diameter behind the one in front — the height of an
 * equilateral triangle whose side is one cup.
 */
const COLUMN_PITCH = CUP_WIDTH + 2;
const ROW_PITCH = COLUMN_PITCH * 0.866;

export const TABLE_WIDTH_REFERENCE = 342;
export const TABLE_LENGTH = 800;

/** The far rack's rows, from the far end towards you: 4, 3, 2, then the apex. */
export const OPPONENT_APEX_Y = 220;
/** Your own rack, mirrored: apex pointing away down the table. */
export const PLAYER_APEX_Y = 580;

/**
 * Where each ball rests between throws — behind that player's own rack, which
 * is where you stand at a real table.
 *
 * They used to rest mid-table, which was invisible nonsense the moment there
 * was a real camera: your own cups stand between you and the middle of the
 * table, so the ball sat hidden behind your own rack. The throw now flies over
 * your cups, as it does in life.
 */
export const PLAYER_BALL_Y = 745;
export const OPPONENT_BALL_Y = 55;
/** Halfway. */
export const NET_Y = (OPPONENT_APEX_Y + PLAYER_APEX_Y) / 2;

export const CUP_COUNT = 10;
/**
 * Overtime is racked with three cups a side, as at a real table: one row of two
 * behind a single cup, and the game carries on.
 */
export const OVERTIME_CUP_COUNT = 3;

/** How many rows a triangle of this many cups has: 1, 3, 6, 10, 15. */
function rowsFor(cupCount: number): number {
  let rows = 1;
  while ((rows * (rows + 1)) / 2 < cupCount) rows += 1;
  return rows;
}

/**
 * A triangle of cups. `towards` is the direction the rows grow in: the far rack
 * has its widest row at the back and its apex pointing at you, yours is the
 * other way round.
 */
function buildRack(
  tableWidth: number,
  apexY: number,
  towards: 1 | -1,
  cupCount: number
): CupSpec[] {
  const cups: CupSpec[] = [];
  let index = 0;
  // Rows listed apex-first, so index 0 is always the cup nearest the thrower's
  // side of that rack and the last indices are the back row.
  for (let row = 0; row < rowsFor(cupCount); row++) {
    const count = row + 1;
    const y = apexY + towards * row * ROW_PITCH;
    const rowWidth = (count - 1) * COLUMN_PITCH;
    for (let i = 0; i < count; i++) {
      cups.push({
        index,
        x: tableWidth / 2 - rowWidth / 2 + i * COLUMN_PITCH,
        y,
        width: CUP_WIDTH,
        height: CUP_HEIGHT,
      });
      index += 1;
    }
  }
  // Ordered far-to-near, the way the rest of the game expects: the last cup is
  // the one closest to whoever is throwing at this rack.
  return cups
    .reverse()
    .slice(0, cupCount)
    .map((cup, i) => ({ ...cup, index: i }));
}

/** The rack you throw at, at the far end of the table. */
export function generateOpponentRack(tableWidth: number, cupCount = CUP_COUNT): CupSpec[] {
  return buildRack(tableWidth, OPPONENT_APEX_Y, -1, cupCount);
}

/** Your own rack, right in front of you, that the opponent throws at. */
export function generatePlayerRack(tableWidth: number, cupCount = CUP_COUNT): CupSpec[] {
  return buildRack(tableWidth, PLAYER_APEX_Y, 1, cupCount);
}

/**
 * Re-rack: pull the remaining cups forward into a tight formation by moving
 * them onto the last slots, which are the rows nearest the net.
 */
export function reRackFlags(aliveFlags: boolean[]): boolean[] {
  const remaining = aliveFlags.filter(Boolean).length;
  return aliveFlags.map((_, i) => i >= aliveFlags.length - remaining);
}
