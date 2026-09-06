export interface CupSpec {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Classic 4-3-2-1 beer pong rack (10 cups), back row (farthest from the net)
// to the single front cup (closest to the net).
const ROWS = [
  { count: 4, y: 2, width: 24 },
  { count: 3, y: 38, width: 30 },
  { count: 2, y: 80, width: 36 },
  { count: 1, y: 130, width: 42 },
];

const CUP_ASPECT = 1.25; // height = width * CUP_ASPECT, like a real Solo cup

// One rack's own bounding height, the gap between the two racks where both
// balls live, and the resulting total table height (opponent rack on top,
// player's own rack mirrored at the bottom).
export const RACK_HEIGHT = 190;
export const NET_ZONE = 100;
export const TABLE_HEIGHT = RACK_HEIGHT * 2 + NET_ZONE;

export function generateCupLayout(width: number): CupSpec[] {
  const cups: CupSpec[] = [];
  let index = 0;
  for (const row of ROWS) {
    const gap = 10;
    const rowWidth = row.count * row.width + (row.count - 1) * gap;
    const startX = width / 2 - rowWidth / 2;
    const height = row.width * CUP_ASPECT;
    for (let i = 0; i < row.count; i++) {
      cups.push({
        index,
        x: startX + i * (row.width + gap) + row.width / 2,
        y: row.y + height / 2,
        width: row.width,
        height,
      });
      index += 1;
    }
  }
  return cups;
}

// Mirrors a rack (generated with generateCupLayout) so its 4-wide row sits at
// the far edge and its single cup faces the net, for the rack on the other
// side of the table.
export function mirrorRack(cups: CupSpec[]): CupSpec[] {
  return cups.map((c) => ({ ...c, y: TABLE_HEIGHT - c.y }));
}

export const CUP_COUNT = ROWS.reduce((sum, r) => sum + r.count, 0);
