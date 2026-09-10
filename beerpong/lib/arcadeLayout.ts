export interface CupSpec {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RowSpec {
  count: number;
  width: number;
}

const CUP_ASPECT = 1.35; // height = width * CUP_ASPECT, like a real Solo cup

// Rows always run from the far end of a rack to the end nearest the viewer,
// growing as they come closer, so a rack reads as receding down the table.
// The opponent's rack sits at the far end (apex points back at you), your own
// rack sits right in front of you (apex points away, down the table).
const OPPONENT_ROWS: RowSpec[] = [
  { count: 4, width: 34 },
  { count: 3, width: 40 },
  { count: 2, width: 48 },
  { count: 1, width: 56 },
];

const PLAYER_ROWS: RowSpec[] = [
  { count: 1, width: 46 },
  { count: 2, width: 54 },
  { count: 3, width: 61 },
  { count: 4, width: 68 },
];

// Cups in a real rack sit shoulder to shoulder, and rows nest into each other,
// so the row gaps are negative: nearer rows overlap the ones behind them.
const OPPONENT_ROW_GAP = -8;
const PLAYER_ROW_GAP = -10;
const OPPONENT_COLUMN_GAP = 4;
const PLAYER_COLUMN_GAP = 5;

function rackHeight(rows: RowSpec[], rowGap: number): number {
  return rows.reduce((sum, row, i) => sum + row.width * CUP_ASPECT + (i > 0 ? rowGap : 0), 0);
}

export const OPPONENT_RACK_TOP = 26;
export const OPPONENT_RACK_HEIGHT = rackHeight(OPPONENT_ROWS, OPPONENT_ROW_GAP);
export const NET_Y = OPPONENT_RACK_TOP + OPPONENT_RACK_HEIGHT + 74;
// Both balls rest mid-table. Thanks to the camera pan, the same stretch of
// table reads as "near you" on your turn and "far away" on the opponent's.
export const PLAYER_BALL_Y = NET_Y + 75;
export const OPPONENT_BALL_Y = NET_Y + 90;
export const PLAYER_RACK_TOP = NET_Y + 155;
export const PLAYER_RACK_HEIGHT = rackHeight(PLAYER_ROWS, PLAYER_ROW_GAP);
export const TABLE_HEIGHT = PLAYER_RACK_TOP + PLAYER_RACK_HEIGHT + 28;

// The window you actually look through. The table is taller than this, so the
// camera pans between the two ends depending on whose turn it is: on your turn
// you see the opponent's rack far up the table, on theirs you see your own.
/**
 * The table narrows towards the far end, because it is a real slab seen from
 * one end rather than a rectangle painted on the screen. These are half-widths
 * as fractions of the drawing width: the far edge is a little over half as wide
 * as the near one, which is about what a 2.4m table looks like from behind it.
 */
export const TABLE_FAR_HALF = 0.31;
export const TABLE_NEAR_HALF = 0.5;

/** Half the table's width at a given point down it, in table points. */
export function tableHalfWidth(width: number, y: number): number {
  const share = Math.max(0, Math.min(1, y / TABLE_HEIGHT));
  return width * (TABLE_FAR_HALF + (TABLE_NEAR_HALF - TABLE_FAR_HALF) * share);
}

export const VIEWPORT_HEIGHT = 430;
export const CAMERA_PAN = TABLE_HEIGHT - VIEWPORT_HEIGHT;

function buildRack(
  tableWidth: number,
  rows: RowSpec[],
  columnGap: number,
  rowGap: number,
  top: number
): CupSpec[] {
  const cups: CupSpec[] = [];
  let index = 0;
  let y = top;
  for (const row of rows) {
    const height = row.width * CUP_ASPECT;
    const rowWidth = row.count * row.width + (row.count - 1) * columnGap;
    const startX = tableWidth / 2 - rowWidth / 2;
    for (let i = 0; i < row.count; i++) {
      cups.push({
        index,
        x: startX + i * (row.width + columnGap) + row.width / 2,
        y: y + height / 2,
        width: row.width,
        height,
      });
      index += 1;
    }
    y += height + rowGap;
  }
  return cups;
}

/** The rack you throw at, at the far end of the table. */
export function generateOpponentRack(tableWidth: number): CupSpec[] {
  return buildRack(
    tableWidth,
    OPPONENT_ROWS,
    OPPONENT_COLUMN_GAP,
    OPPONENT_ROW_GAP,
    OPPONENT_RACK_TOP
  );
}

/** Your own rack, right in front of you, that the opponent throws at. */
export function generatePlayerRack(tableWidth: number): CupSpec[] {
  return buildRack(
    tableWidth,
    PLAYER_ROWS,
    PLAYER_COLUMN_GAP,
    PLAYER_ROW_GAP,
    PLAYER_RACK_TOP
  );
}

export const CUP_COUNT = OPPONENT_ROWS.reduce((sum, r) => sum + r.count, 0);

/**
 * Re-rack: pull the remaining cups forward into a tight formation by moving
 * them onto the last slots, which are the rows nearest the net.
 */
export function reRackFlags(aliveFlags: boolean[]): boolean[] {
  const remaining = aliveFlags.filter(Boolean).length;
  return aliveFlags.map((_, i) => i >= aliveFlags.length - remaining);
}
